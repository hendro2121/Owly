"""
Raven Pipeline
==============
End-to-end pipeline: Scrape Sharenet -> Parse -> Store -> Export

Scrapes today's director dealing SENS announcements from Sharenet,
parses them, and stores the deals in PostgreSQL. Run daily to
accumulate data over time.

Usage:
    python pipeline.py              # Scrape today's deals
    python pipeline.py --format csv # Export as CSV too
"""

import json
import csv
import os
import logging
import argparse
from datetime import datetime
from dataclasses import asdict

from companies import JSE_TOP_40
from scraper import SharenetScraper, RawAnnouncement
from parser import SENSParser

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger(__name__)


# ─── Database (PostgreSQL) ───────────────────────────────────────────────────

import psycopg2
import psycopg2.extras

DATABASE_URL = os.environ.get("DATABASE_URL", "")
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)


def get_conn():
    """Get a PostgreSQL connection with keepalive settings."""
    return psycopg2.connect(
        DATABASE_URL,
        keepalives=1,
        keepalives_idle=30,
        keepalives_interval=10,
        keepalives_count=5,
    )


def get_or_reconnect(conn):
    """Test connection and reconnect if it's dead."""
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT 1")
        return conn
    except Exception:
        logger.warning("Database connection lost, reconnecting...")
        try:
            conn.close()
        except Exception:
            pass
        return get_conn()


def init_db():
    """Ensure tables exist."""
    conn = get_conn()
    with conn.cursor() as cur:
        cur.execute("""CREATE TABLE IF NOT EXISTS companies (
            ticker TEXT PRIMARY KEY, name TEXT NOT NULL, sector TEXT, ir_url TEXT,
            last_scraped TIMESTAMP, status TEXT DEFAULT 'listed')""")
        cur.execute("""
            DO $$ BEGIN
                ALTER TABLE companies ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'listed';
            EXCEPTION WHEN duplicate_column THEN NULL;
            END $$
        """)
        cur.execute("""CREATE TABLE IF NOT EXISTS director_deals (
            id SERIAL PRIMARY KEY, ticker TEXT NOT NULL REFERENCES companies(ticker),
            company TEXT NOT NULL, director TEXT NOT NULL, role TEXT,
            transaction_date DATE, announcement_date DATE, transaction_type TEXT,
            shares INTEGER, price NUMERIC(14,2), value NUMERIC(16,2),
            class_of_securities TEXT DEFAULT 'Ordinary shares', nature_of_interest TEXT,
            clearance_received BOOLEAN, source_url TEXT, confidence NUMERIC(3,2),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)""")
        cur.execute("""CREATE TABLE IF NOT EXISTS raw_announcements (
            id SERIAL PRIMARY KEY, ticker TEXT NOT NULL, company TEXT NOT NULL,
            title TEXT, date DATE, url TEXT UNIQUE, full_text TEXT,
            source TEXT DEFAULT 'sharenet', scraped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            parsed BOOLEAN DEFAULT FALSE)""")
    conn.commit()

    # Seed companies (update name/sector if they were inserted with bad data)
    with conn.cursor() as cur:
        for c in JSE_TOP_40:
            cur.execute(
                "INSERT INTO companies (ticker,name,sector,ir_url) "
                "VALUES (%s,%s,%s,%s) "
                "ON CONFLICT (ticker) DO UPDATE SET name=%s, sector=%s",
                (c["ticker"], c["name"], c["sector"], c.get("ir_page"),
                 c["name"], c["sector"]),
            )
    conn.commit()
    logger.info("Database initialized")
    return conn


def store_raw(conn, announcements):
    """Store raw announcements. Returns (conn, stored_count)."""
    conn = get_or_reconnect(conn)
    stored = 0
    with conn.cursor() as cur:
        for ann in announcements:
            try:
                cur.execute("""
                    INSERT INTO raw_announcements (ticker, company, title, date, url, full_text, source)
                    VALUES (%s, %s, %s, %s, %s, %s, %s) ON CONFLICT (url) DO NOTHING
                """, (ann.ticker, ann.company, ann.title, ann.date or None,
                      ann.url, ann.full_text, ann.source_domain))
                if cur.rowcount > 0:
                    stored += 1
            except Exception as e:
                logger.error(f"Failed to store announcement: {e}")
                try:
                    conn.rollback()
                except Exception:
                    conn = get_conn()
    conn.commit()
    logger.info(f"Stored {stored} new announcements (of {len(announcements)} total)")
    return conn, stored


def store_deals(conn, deals):
    """Store parsed deals, skipping duplicates. Returns (conn, stored_count)."""
    conn = get_or_reconnect(conn)
    stored = 0
    with conn.cursor() as cur:
        for deal in deals:
            try:
                # Check for duplicate: same ticker+director+date+shares+type
                cur.execute("""
                    SELECT id FROM director_deals
                    WHERE ticker=%s AND director=%s AND transaction_date=%s
                      AND shares=%s AND transaction_type=%s
                """, (
                    deal["ticker"], deal["director"],
                    deal["transaction_date"] or None,
                    deal["shares"], deal["transaction_type"],
                ))
                if cur.fetchone():
                    continue

                cur.execute("""
                    INSERT INTO director_deals
                    (ticker, company, director, role, transaction_date, announcement_date,
                     transaction_type, shares, price, value, class_of_securities,
                     nature_of_interest, clearance_received, source_url, confidence,
                     currency, exchange)
                    VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                """, (
                    deal["ticker"], deal["company"], deal["director"], deal["role"],
                    deal["transaction_date"] or None, deal.get("announcement_date") or None,
                    deal["transaction_type"], deal["shares"], deal["price"],
                    deal["value"], deal["class_of_securities"],
                    deal["nature_of_interest"], deal["clearance_received"],
                    deal.get("source_url", ""), deal["confidence"],
                    deal.get("currency", "ZAR"), deal.get("exchange", "JSE"),
                ))
                stored += 1
            except Exception as e:
                logger.error(f"Failed to store deal: {e}")
                try:
                    conn.rollback()
                except Exception:
                    conn = get_conn()
    conn.commit()
    logger.info(f"Stored {stored} new deals (skipped {len(deals) - stored} duplicates)")
    return conn, stored


# ─── Pipeline ────────────────────────────────────────────────────────────────

def run_pipeline(output_format="json"):
    """
    Scrape today's director dealings from Sharenet, parse, and store.
    """
    conn = init_db()
    scraper = SharenetScraper()

    # Pass API key for LLM fallback classification (optional — works without it)
    anthropic_key = os.environ.get("ANTHROPIC_API_KEY")
    parser = SENSParser(anthropic_api_key=anthropic_key)

    # Build company lookup
    known_companies = {c["ticker"]: c for c in JSE_TOP_40}

    # Step 1: Scrape today's announcements
    logger.info("\nStep 1: Scraping today's SENS from Sharenet...")
    raw_announcements = scraper.scrape()

    if not raw_announcements:
        logger.info("No director dealing announcements found today.")
        conn.close()
        return []

    # Step 2: Parse and store each announcement
    logger.info("\nStep 2: Parsing and storing deals...")
    all_deals = []

    for ann in raw_announcements:
        conn = get_or_reconnect(conn)

        # Resolve ticker from announcement text if not set
        ticker = ann.ticker
        company = ann.company

        # Try to match to known company
        if ticker and ticker in known_companies:
            company = known_companies[ticker]["name"]

        # Ensure company exists in DB
        if ticker:
            sector = known_companies.get(ticker, {}).get("sector", "")
            with conn.cursor() as cur:
                cur.execute(
                    "INSERT INTO companies (ticker, name, sector) "
                    "VALUES (%s, %s, %s) ON CONFLICT (ticker) DO NOTHING",
                    (ticker, company or ticker, sector),
                )
            conn.commit()

        # Store raw
        conn, _ = store_raw(conn, [ann])

        # Parse deals from the announcement text
        deals = parser.parse(ann.full_text, ticker=ticker, company=company)

        # Keep all valid transaction types
        deals = [d for d in deals if d.transaction_type in ("Buy", "Sell", "Vesting", "TaxSale", "OptionsExercise", "HedgeSettlement")]

        batch_deals = []
        for deal in deals:
            deal_dict = asdict(deal)
            deal_dict["ticker"] = ticker
            deal_dict["company"] = company
            deal_dict["announcement_date"] = ann.date
            deal_dict["source_url"] = ann.url
            # currency and exchange come from the parser's detection
            deal_dict.setdefault("currency", "ZAR")
            deal_dict.setdefault("exchange", "JSE")
            batch_deals.append(deal_dict)
            all_deals.append(deal_dict)

        if batch_deals:
            conn, _ = store_deals(conn, batch_deals)

        logger.info(f"  {ticker or '???'}: {len(deals)} deal(s) from '{ann.title[:50]}'")

    # Step 3: Export
    os.makedirs("output", exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    if output_format == "csv":
        export_csv(all_deals, f"output/deals_{timestamp}.csv")
    else:
        export_json(all_deals, f"output/deals_{timestamp}.json")

    print_summary(all_deals)
    conn.close()
    return all_deals


def export_json(deals, path):
    with open(path, "w") as f:
        json.dump(deals, f, indent=2, ensure_ascii=False, default=str)
    logger.info(f"Exported {len(deals)} deals to {path}")


def export_csv(deals, path):
    if not deals:
        return
    fieldnames = [
        "ticker", "company", "director", "role", "transaction_date",
        "transaction_type", "shares", "price", "value",
        "nature_of_interest", "clearance_received", "confidence", "source_url",
    ]
    with open(path, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(deals)
    logger.info(f"Exported {len(deals)} deals to {path}")


def print_summary(deals):
    if not deals:
        print("\nNo deals extracted.")
        return

    buys = [d for d in deals if d["transaction_type"] == "Buy"]
    sells = [d for d in deals if d["transaction_type"] == "Sell"]
    buy_val = sum(d["value"] for d in buys)
    sell_val = sum(d["value"] for d in sells)
    tickers = set(d["ticker"] for d in deals)
    directors = set(d["director"] for d in deals)
    avg_conf = sum(d["confidence"] for d in deals) / len(deals)

    print("\n" + "=" * 50)
    print("  RAVEN PIPELINE SUMMARY")
    print("=" * 50)
    print(f"  Total deals extracted:   {len(deals)}")
    print(f"  Companies:               {len(tickers)}")
    print(f"  Unique directors:        {len(directors)}")
    print(f"  Buys:  {len(buys):>4}  (R{buy_val:>15,.2f})")
    print(f"  Sells: {len(sells):>4}  (R{sell_val:>15,.2f})")
    print(f"  Average confidence:      {avg_conf:.2f}")
    print("=" * 50)


# ─── CLI ─────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    ap = argparse.ArgumentParser(description="Raven Insider Trading Pipeline")
    ap.add_argument("--format", "-f", choices=["json", "csv"], default="json")
    args = ap.parse_args()

    run_pipeline(output_format=args.format)
