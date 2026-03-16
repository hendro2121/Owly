"""
Brazil CVM Insider Trading Adapter
===================================
Downloads insider trading data from CVM (dados.cvm.gov.br) and stores
it in the Raven PostgreSQL database.

Usage:
    python brazil_adapter.py --year 2025              # Download and print stats
    python brazil_adapter.py --year 2025 --db $DATABASE_URL   # Download + store in DB
    python brazil_adapter.py --year 2025 --export     # Download + export CSV
    python brazil_adapter.py --backfill --db $DATABASE_URL    # All years 2018-2026
"""

from __future__ import annotations

import argparse
import csv
import io
import logging
import re
import sys
import zipfile
from datetime import datetime
from decimal import Decimal, InvalidOperation
from typing import Dict, List, Optional

import requests

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
)
logger = logging.getLogger("brazil_adapter")

# ─── Constants ────────────────────────────────────────────────────────────────

CVM_COMPANY_URL = "https://dados.cvm.gov.br/dados/CIA_ABERTA/CAD/DADOS/cad_cia_aberta.csv"
CVM_TRADES_URL = "https://dados.cvm.gov.br/dados/CIA_ABERTA/DOC/VLMO/DADOS/vlmo_cia_aberta_{year}.zip"
CVM_FCA_URL = "https://dados.cvm.gov.br/dados/CIA_ABERTA/DOC/FCA/DADOS/fca_cia_aberta_{year}.zip"

MARKET = "B3"

# Portuguese role titles → English
ROLE_MAP = {
    "Conselho de Administração ou Vinculado": "Board of Directors",
    "Diretor ou Vinculado": "Executive Director",
    "Controlador ou Vinculado": "Controlling Shareholder",
    "Conselho Fiscal ou Vinculado": "Fiscal Council",
    "Órgão Estatutário ou Vinculado": "Statutory Body",
}

# Sectors from CVM SETOR_ATIV → friendlier names
SECTOR_MAP = {
    "Bancos": "Banking",
    "Energia Elétrica": "Energy",
    "Siderurgia e Metalurgia": "Steel & Metals",
    "Alimentos": "Food & Beverage",
    "Construção Civil": "Construction",
    "Telecomunicações": "Telecoms",
    "Máquinas e Equipamentos": "Machinery",
    "Petróleo e Gás": "Oil & Gas",
    "Papel e Celulose": "Paper & Pulp",
    "Mineração": "Mining",
    "Têxtil e Vestuário": "Textiles",
    "Transporte": "Transport",
    "Comércio": "Retail",
    "Químicos e Petroquímicos": "Chemicals",
    "Saneamento e Serviços de Água e Gás": "Utilities",
    "Serviços Financeiros Diversos": "Financial Services",
    "Seguradoras e Corretoras": "Insurance",
    "Bebidas e Fumo": "Beverages & Tobacco",
    "Agricultura": "Agriculture",
    "Farmacêutico e Higiene": "Pharmaceuticals",
    "Hospedagem e Turismo": "Hospitality",
    "Comunicação e Informática": "Technology & Media",
    "Embalagens": "Packaging",
    "Gráficas e Editoras": "Publishing",
    "Brinquedos e Lazer": "Leisure",
    "Securitizadoras de Recebíveis": "Securitization",
}

BACKFILL_START_YEAR = 2018
BACKFILL_END_YEAR = 2026


# ─── Number parsing ──────────────────────────────────────────────────────────

def parse_brazilian_number(s: str) -> float | None:
    """Convert a Brazilian-formatted number to float.

    Brazilian format uses period for thousands and comma for decimals:
        "1.234,56"  → 1234.56
        "1.234"     → 1234   (thousands separator, no decimal)
        "12,34"     → 12.34
        "1234"      → 1234
        ""          → None
    """
    if s is None:
        return None
    s = s.strip()
    if not s:
        return None

    # If there's a comma, everything after it is the decimal part
    if "," in s:
        # Remove thousands separators (periods), swap comma → dot
        s = s.replace(".", "").replace(",", ".")
    else:
        # No comma — periods are thousands separators
        s = s.replace(".", "")

    try:
        return float(s)
    except ValueError:
        logger.debug("Could not parse number: %r", s)
        return None


def strip_cnpj(cnpj: str) -> str:
    """Strip formatting from a CNPJ: '12.345.678/0001-90' → '12345678000190'."""
    return re.sub(r"[.\-/]", "", cnpj.strip()) if cnpj else ""


def map_sector(raw_sector: str) -> str:
    """Map CVM sector name to a cleaner English equivalent."""
    if not raw_sector:
        return "Unknown"
    raw_sector = raw_sector.strip()
    return SECTOR_MAP.get(raw_sector, raw_sector)


def parse_date(s: str) -> str | None:
    """Parse a date string that may be YYYY-MM-DD or DD/MM/YYYY → 'YYYY-MM-DD'."""
    if not s:
        return None
    s = s.strip()
    for fmt in ("%Y-%m-%d", "%d/%m/%Y"):
        try:
            return datetime.strptime(s, fmt).strftime("%Y-%m-%d")
        except ValueError:
            continue
    logger.debug("Unparseable date: %r", s)
    return None


# ─── B3 Ticker mapping ────────────────────────────────────────────────────────

def fetch_ticker_mapping() -> dict[str, str]:
    """Download CVM FCA data to build a CNPJ → B3 ticker mapping.

    Fetches FCA files from 2024-2026 and extracts Codigo_Negociacao (trading code).
    Prefers ordinary shares (ending in 3) over preferred (ending in 4).

    Returns:
        { "00000000000191": "BBAS3", "33000167000101": "PETR3", ... }
    """
    mapping: dict[str, str] = {}

    for year in [2024, 2025, 2026]:
        url = CVM_FCA_URL.format(year=year)
        try:
            resp = requests.get(url, timeout=60)
            if resp.status_code != 200:
                logger.debug("FCA %d not available (HTTP %d)", year, resp.status_code)
                continue

            with zipfile.ZipFile(io.BytesIO(resp.content)) as zf:
                fname = f"fca_cia_aberta_valor_mobiliario_{year}.csv"
                if fname not in zf.namelist():
                    continue
                raw = zf.read(fname).decode("iso-8859-1")

            reader = csv.DictReader(io.StringIO(raw), delimiter=";")
            for row in reader:
                cnpj = strip_cnpj(row.get("CNPJ_Companhia", ""))
                ticker = (row.get("Codigo_Negociacao") or "").strip()
                end_date = (row.get("Data_Fim_Negociacao") or "").strip()

                if not cnpj or not ticker or ticker == "NÃO HÁ":
                    continue
                # Skip delisted tickers
                if end_date:
                    continue
                # Prefer ordinary shares (ending in 3) over preferred (4)
                if cnpj not in mapping or (ticker.endswith("3") and not mapping[cnpj].endswith("3")):
                    mapping[cnpj] = ticker

        except Exception as e:
            logger.warning("Failed to fetch FCA %d: %s", year, e)
            continue

    logger.info("Built CNPJ→ticker mapping with %d entries", len(mapping))
    return mapping


# ─── CVM data fetching ───────────────────────────────────────────────────────

def fetch_company_registry() -> dict[str, dict]:
    """Download CVM company registry CSV and return a dict of CNPJ → info.

    Returns:
        { "12345678000190": {"name": "...", "sector": "...", "status": "ATIVO"}, ... }
    """
    logger.info("Downloading company registry from CVM...")
    resp = requests.get(CVM_COMPANY_URL, timeout=60)
    resp.raise_for_status()
    resp.encoding = "utf-8"

    reader = csv.DictReader(io.StringIO(resp.text), delimiter=";")
    companies: dict[str, dict] = {}

    for row in reader:
        cnpj = strip_cnpj(row.get("CNPJ_CIA", ""))
        if not cnpj:
            continue
        companies[cnpj] = {
            "name": (row.get("DENOM_SOCIAL") or "").strip(),
            "sector": map_sector(row.get("SETOR_ATIV", "")),
            "status": (row.get("SIT") or "").strip(),
        }

    active = sum(1 for c in companies.values() if c["status"] == "ATIVO")
    logger.info("Loaded %d companies (%d active) from CVM registry", len(companies), active)
    return companies


def fetch_trades(year: int) -> list[dict]:
    """Download the CVM insider-trade ZIP for a given year and parse trades.

    Only keeps rows where:
        - Tipo_Ativo == "Acoes" (shares)
        - Tipo_Movimentacao contains "Compra" or "Venda"

    Returns a list of dicts ready for DB insertion.
    """
    url = CVM_TRADES_URL.format(year=year)
    logger.info("Downloading insider trades for %d from %s", year, url)

    resp = requests.get(url, timeout=120)
    if resp.status_code == 404:
        logger.warning("No data found for year %d (HTTP 404)", year)
        return []
    resp.raise_for_status()

    # Extract the consolidated CSV from the ZIP
    target_name = f"vlmo_cia_aberta_con_{year}.csv"
    trades: list[dict] = []

    with zipfile.ZipFile(io.BytesIO(resp.content)) as zf:
        names = zf.namelist()
        logger.info("ZIP contains: %s", names)

        csv_name = None
        for name in names:
            if target_name in name.lower() or f"_con_{year}" in name.lower():
                csv_name = name
                break

        if csv_name is None:
            # Fallback: pick the first CSV that has "con" in the name
            for name in names:
                if "con" in name.lower() and name.lower().endswith(".csv"):
                    csv_name = name
                    break

        if csv_name is None:
            logger.error("Could not find consolidated CSV in ZIP. Files: %s", names)
            return []

        logger.info("Parsing %s", csv_name)
        raw = zf.read(csv_name)
        text = raw.decode("iso-8859-1")

    reader = csv.DictReader(io.StringIO(text), delimiter=";")
    skipped_asset = 0
    skipped_txn = 0

    # Map CVM Portuguese transaction types → Raven types
    TRANSACTION_MAP = {
        "Compra à vista": "Buy",
        "Compra à termo": "Buy",
        "Venda à vista": "Sell",
        "Venda à termo": "Sell",
        "Ações de plano de remuneração": "Vesting",
        "Units de plano de remuneração": "Vesting",
        "Ações decorrentes de exercício de opção de compra": "OptionsExercise",
        "Exercício de opção de Plano de Remuneração": "OptionsExercise",
        "Ações de exercício de bônus de subscrição": "OptionsExercise",
        "Ações reduzidas (exercício de opção de venda)": "OptionsExercise",
        "Ações resultantes de conversão de debêntures": "Conversion",
        "Desdobramento/bonificação": "Conversion",
        "Grupamento": "Conversion",
        "Homologação de subscrição": "Conversion",
        "Subscrição": "Conversion",
        "Recebimento como vantagem adicional em subscrição": "Conversion",
    }

    # Types we skip entirely (not insider dealing signals)
    SKIP_TYPES = {
        "Saldo Inicial",         # Opening balance — not a transaction
        "Posse",                 # Taking office — position disclosure, not a trade
        "Desligamento/saída",    # Leaving office
        "Contratação de empréstimo (locador)", "Contratação de empréstimo (tomador)",
        "Devolução de empréstimo (locador)", "Devolução de empréstimo (tomador)",
        "Doação (doador)", "Doação (donatário)",
        "Herança (doador)", "Herança (donatário)",
        "Permuta (entrega)", "Permuta (recebimento)",
        "Outras Entradas", "Outras Saídas",
    }

    for row in reader:
        # Filter: only share trades (Ações — with accent)
        tipo_ativo = (row.get("Tipo_Ativo") or "").strip()
        if tipo_ativo != "Ações":
            skipped_asset += 1
            continue

        # Map transaction type
        tipo_mov = (row.get("Tipo_Movimentacao") or "").strip()
        if tipo_mov in SKIP_TYPES:
            skipped_txn += 1
            continue

        txn_type = TRANSACTION_MAP.get(tipo_mov)
        if txn_type is None:
            # Unknown type — log and skip
            logger.debug("Unknown transaction type: %r", tipo_mov)
            skipped_txn += 1
            continue

        cnpj = strip_cnpj(row.get("CNPJ_Companhia", ""))
        date = parse_date(row.get("Data_Movimentacao", ""))

        # Skip rows without a transaction date (e.g. balance entries)
        if not date:
            skipped_txn += 1
            continue

        # CVM uses standard decimal format (dot separator), not Brazilian comma format
        qty_raw = (row.get("Quantidade") or "").strip()
        price_raw = (row.get("Preco_Unitario") or "").strip()
        volume_raw = (row.get("Volume") or "").strip()

        try:
            shares = int(float(qty_raw)) if qty_raw else None
        except ValueError:
            shares = None

        try:
            price = round(float(price_raw), 4) if price_raw else None
        except ValueError:
            price = None

        try:
            value = round(float(volume_raw), 2) if volume_raw else None
        except ValueError:
            value = None

        # Skip zero-value trades (no price info = not useful)
        if price is not None and price == 0 and value is not None and value == 0:
            skipped_txn += 1
            continue

        raw_role = (row.get("Tipo_Cargo") or "").strip()
        translated_role = ROLE_MAP.get(raw_role, raw_role)
        # Empresa is just the company name again — CVM data is aggregated by role,
        # not individual names. Use the translated role as the director label.
        tipo_empresa = (row.get("Tipo_Empresa") or "").strip()
        # For subsidiaries/controllers, show their name + role
        empresa = (row.get("Empresa") or "").strip()
        comp_name = (row.get("Nome_Companhia") or "").strip()
        if tipo_empresa == "Companhia" or empresa.upper() == comp_name.upper():
            director_label = translated_role
        else:
            # Related entity (subsidiary/controller) — show entity name
            director_label = f"{empresa} ({translated_role})"

        trades.append({
            "ticker": cnpj,
            "company": comp_name,
            "director": director_label,
            "role": translated_role,
            "transaction_type": txn_type,
            "transaction_date": date,
            "shares": shares,
            "price": price,
            "value": value,
            "asset_type": tipo_ativo,
            "description": (row.get("Descricao_Movimentacao") or "").strip(),
            "intermediary": (row.get("Intermediario") or "").strip(),
            "market": MARKET,
        })

    logger.info(
        "Parsed %d trades for %d (skipped %d non-share assets, %d skipped/unknown transactions)",
        len(trades), year, skipped_asset, skipped_txn,
    )

    from collections import Counter
    type_counts = Counter(t["transaction_type"] for t in trades)
    for txn_type, count in type_counts.most_common():
        logger.info("  %s: %d", txn_type, count)

    return trades


# ─── Database operations ─────────────────────────────────────────────────────

def _get_connection(db_url: str):
    """Create a psycopg2 connection from a database URL."""
    import psycopg2

    url = db_url
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql://", 1)
    return psycopg2.connect(url)


def ensure_market_columns(conn) -> None:
    """Add the 'market' column to companies and director_deals if it doesn't exist.

    Existing rows default to 'JSE' (the original market).
    """
    with conn.cursor() as cur:
        cur.execute("""
            DO $$ BEGIN
                ALTER TABLE companies ADD COLUMN market TEXT DEFAULT 'JSE';
            EXCEPTION WHEN duplicate_column THEN NULL;
            END $$
        """)
        cur.execute("""
            DO $$ BEGIN
                ALTER TABLE director_deals ADD COLUMN market TEXT DEFAULT 'JSE';
            EXCEPTION WHEN duplicate_column THEN NULL;
            END $$
        """)
        # Backfill NULLs (shouldn't happen, but be safe)
        cur.execute("UPDATE companies SET market = 'JSE' WHERE market IS NULL")
        cur.execute("UPDATE director_deals SET market = 'JSE' WHERE market IS NULL")
    conn.commit()
    logger.info("Ensured 'market' column exists on companies and director_deals")


def store_in_db(deals: list[dict], companies: dict[str, dict], db_url: str,
                ticker_map: dict[str, str] | None = None) -> dict:
    """Insert trades and companies into the Raven PostgreSQL database.

    - Maps CNPJ → B3 ticker using ticker_map (e.g. PETR3, VALE3)
    - Adds company rows (upsert by ticker) with market='B3'
    - Inserts deal rows, deduplicating on (ticker, director, transaction_date, shares, transaction_type)
    - Returns stats dict with counts of inserted/skipped.
    """
    import psycopg2

    if ticker_map is None:
        ticker_map = {}

    conn = _get_connection(db_url)
    ensure_market_columns(conn)

    stats = {
        "companies_inserted": 0,
        "companies_updated": 0,
        "deals_inserted": 0,
        "deals_skipped_dup": 0,
        "deals_skipped_no_company": 0,
    }

    # Map CNPJs to B3 tickers and collect unique ones
    deal_cnpjs = {d["ticker"] for d in deals}
    logger.info("Upserting %d companies referenced in trades...", len(deal_cnpjs))

    # Remap deal tickers from CNPJ to B3 ticker symbol
    for deal in deals:
        cnpj = deal["ticker"]
        deal["_cnpj"] = cnpj  # Keep original CNPJ for reference
        deal["ticker"] = ticker_map.get(cnpj, cnpj)  # Use B3 ticker if available

    with conn.cursor() as cur:
        for cnpj in deal_cnpjs:
            info = companies.get(cnpj, {})
            name = info.get("name") or next(
                (d["company"] for d in deals if d.get("_cnpj") == cnpj), cnpj
            )
            sector = info.get("sector") or "Unknown"
            status = "active" if info.get("status") == "ATIVO" else "unlisted"
            ticker = ticker_map.get(cnpj, cnpj)

            cur.execute(
                """
                INSERT INTO companies (ticker, name, sector, status, market)
                VALUES (%s, %s, %s, %s, %s)
                ON CONFLICT (ticker) DO UPDATE SET
                    name = EXCLUDED.name,
                    sector = EXCLUDED.sector,
                    status = EXCLUDED.status,
                    market = EXCLUDED.market
                """,
                (ticker, name, sector, status, MARKET),
            )
            # Check if it was an insert or update
            if cur.statusmessage and "INSERT" in cur.statusmessage:
                stats["companies_inserted"] += 1
            else:
                stats["companies_updated"] += 1

    conn.commit()
    logger.info(
        "Companies: %d inserted, %d updated",
        stats["companies_inserted"], stats["companies_updated"],
    )

    # Insert deals with dedup
    logger.info("Inserting %d deals (with dedup)...", len(deals))

    with conn.cursor() as cur:
        for deal in deals:
            if not deal["ticker"]:
                stats["deals_skipped_no_company"] += 1
                continue

            # Dedup check
            cur.execute(
                """
                SELECT 1 FROM director_deals
                WHERE ticker = %s
                  AND director = %s
                  AND transaction_date = %s
                  AND shares = %s
                  AND transaction_type = %s
                LIMIT 1
                """,
                (
                    deal["ticker"],
                    deal["director"],
                    deal["transaction_date"],
                    deal["shares"],
                    deal["transaction_type"],
                ),
            )
            if cur.fetchone():
                stats["deals_skipped_dup"] += 1
                continue

            cur.execute(
                """
                INSERT INTO director_deals
                    (ticker, company, director, role, transaction_date,
                     transaction_type, shares, price, value,
                     class_of_securities, source_url, confidence, market)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    deal["ticker"],
                    deal["company"],
                    deal["director"],
                    deal["role"],
                    deal["transaction_date"],
                    deal["transaction_type"],
                    deal["shares"],
                    deal["price"],
                    deal["value"],
                    "Acoes",
                    f"https://dados.cvm.gov.br/dados/CIA_ABERTA/DOC/VLMO/",
                    0.95,
                    MARKET,
                ),
            )
            stats["deals_inserted"] += 1

    conn.commit()
    conn.close()

    logger.info(
        "Deals: %d inserted, %d skipped (dup), %d skipped (no company)",
        stats["deals_inserted"], stats["deals_skipped_dup"], stats["deals_skipped_no_company"],
    )
    return stats


# ─── CSV export ───────────────────────────────────────────────────────────────

def export_csv(deals: list[dict], filename: str) -> None:
    """Write parsed deals to a CSV file."""
    if not deals:
        logger.warning("No deals to export")
        return

    fields = [
        "ticker", "company", "director", "role", "transaction_type",
        "transaction_date", "shares", "price", "value", "asset_type",
        "description", "intermediary", "market",
    ]

    with open(filename, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fields, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(deals)

    logger.info("Exported %d deals to %s", len(deals), filename)


# ─── Summary ──────────────────────────────────────────────────────────────────

def print_summary(deals: list[dict], companies: dict[str, dict]) -> None:
    """Print a human-readable summary of the downloaded data."""
    if not deals:
        print("\nNo trades found.")
        return

    from collections import Counter

    unique_companies = len({d["ticker"] for d in deals})
    unique_directors = len({d["director"] for d in deals})
    type_counts = Counter(d["transaction_type"] for d in deals)

    print("\n" + "=" * 60)
    print("  Brazil CVM Insider Trading — Summary")
    print("=" * 60)
    print(f"  Total trades:      {len(deals):,}")
    for txn_type, count in type_counts.most_common():
        val = sum(d["value"] or 0 for d in deals if d["transaction_type"] == txn_type)
        print(f"  {txn_type:20s} {count:>6,}  (R$ {val:>18,.2f})")
    print(f"  Unique companies:  {unique_companies:,}")
    print(f"  Unique insiders:   {unique_directors:,}")
    print("=" * 60)

    # Top 5 by value
    top = sorted(deals, key=lambda d: d["value"] or 0, reverse=True)[:5]
    print("\n  Top 5 trades by value:")
    for i, d in enumerate(top, 1):
        print(
            f"    {i}. {d['company'][:30]:30s}  {d['transaction_type']:4s}  "
            f"R$ {d['value'] or 0:>14,.2f}  {d['director'][:25]}"
        )
    print()


# ─── CLI ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="Download Brazilian insider trading data from CVM",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument(
        "--year", type=int,
        help="Year to download (e.g. 2025)",
    )
    parser.add_argument(
        "--backfill", action="store_true",
        help=f"Download all years from {BACKFILL_START_YEAR} to {BACKFILL_END_YEAR}",
    )
    parser.add_argument(
        "--db", type=str, default=None,
        help="PostgreSQL connection URL (e.g. postgresql://user:pass@host/db)",
    )
    parser.add_argument(
        "--export", action="store_true",
        help="Export trades to CSV file(s)",
    )
    parser.add_argument(
        "--verbose", "-v", action="store_true",
        help="Enable debug logging",
    )

    args = parser.parse_args()

    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)

    if not args.year and not args.backfill:
        parser.error("Provide --year YYYY or --backfill")

    # Determine years to process
    if args.backfill:
        years = list(range(BACKFILL_START_YEAR, BACKFILL_END_YEAR + 1))
    else:
        years = [args.year]

    # Fetch company registry and ticker mapping once
    companies = fetch_company_registry()
    ticker_map = fetch_ticker_mapping()

    # Aggregate stats
    total_stats = {
        "companies_inserted": 0,
        "companies_updated": 0,
        "deals_inserted": 0,
        "deals_skipped_dup": 0,
        "deals_skipped_no_company": 0,
    }

    for year in years:
        logger.info("Processing year %d...", year)
        deals = fetch_trades(year)

        if not deals:
            logger.info("No trades for %d, skipping", year)
            continue

        print_summary(deals, companies)

        if args.export:
            export_csv(deals, f"brazil_insider_trades_{year}.csv")

        if args.db:
            stats = store_in_db(deals, companies, args.db, ticker_map)
            for k, v in stats.items():
                total_stats[k] += v

    if args.db and args.backfill:
        print("\n" + "=" * 60)
        print("  Backfill complete — aggregate stats:")
        print(f"    Companies inserted: {total_stats['companies_inserted']:,}")
        print(f"    Companies updated:  {total_stats['companies_updated']:,}")
        print(f"    Deals inserted:     {total_stats['deals_inserted']:,}")
        print(f"    Deals skipped (dup):{total_stats['deals_skipped_dup']:,}")
        print("=" * 60)

    logger.info("Done.")


if __name__ == "__main__":
    main()
