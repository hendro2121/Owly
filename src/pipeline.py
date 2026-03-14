"""
Raven Pipeline
==============
End-to-end pipeline: Scrape -> Parse -> Store -> Export

Usage:
    # Scrape and parse a single company
    python pipeline.py --ticker NPN

    # Scrape and parse all Top 40
    python pipeline.py --all

    # Parse from existing raw announcements file
    python pipeline.py --parse-file output/raw_announcements.json

    # Export to CSV
    python pipeline.py --all --format csv
"""

import json
import csv
import os
import logging
import argparse
from datetime import datetime, timedelta
from dataclasses import asdict

from companies import JSE_TOP_40
from scraper import CompanyScraper, MoneywebSENSStrategy, RawAnnouncement
from parser import SENSParser, ParsedDeal

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
    """Get a PostgreSQL connection."""
    return psycopg2.connect(DATABASE_URL)


def init_db():
    """Ensure tables exist (api.py's ensure_db does this too, but just in case)."""
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
            source TEXT DEFAULT 'ir_page', scraped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            parsed BOOLEAN DEFAULT FALSE)""")
    conn.commit()

    # Seed companies
    with conn.cursor() as cur:
        for c in JSE_TOP_40:
            cur.execute("INSERT INTO companies (ticker,name,sector,ir_url) VALUES (%s,%s,%s,%s) ON CONFLICT (ticker) DO NOTHING",
                (c["ticker"], c["name"], c["sector"], c.get("ir_page")))
    conn.commit()
    logger.info("PostgreSQL database initialized")
    return conn


def store_raw(conn, announcements: list):
    """Store raw announcements in PostgreSQL."""
    stored = 0
    with conn.cursor() as cur:
        for ann in announcements:
            try:
                cur.execute("""
                    INSERT INTO raw_announcements (ticker, company, title, date, url, full_text, source)
                    VALUES (%s, %s, %s, %s, %s, %s, %s) ON CONFLICT (url) DO NOTHING
                """, (ann.ticker, ann.company, ann.title, ann.date or None,
                      ann.url, ann.full_text, getattr(ann, 'source_domain', 'ir_page')))
                if cur.rowcount > 0:
                    stored += 1
            except Exception as e:
                logger.error(f"Failed to store announcement: {e}")
                conn.rollback()
    conn.commit()
    logger.info(f"Stored {stored} new announcements (of {len(announcements)} total)")
    return stored


def store_deals(conn, deals: list[dict]):
    """Store parsed deals in PostgreSQL."""
    stored = 0
    with conn.cursor() as cur:
        for deal in deals:
            try:
                cur.execute("""
                    INSERT INTO director_deals
                    (ticker, company, director, role, transaction_date, announcement_date,
                     transaction_type, shares, price, value, class_of_securities,
                     nature_of_interest, clearance_received, source_url, confidence)
                    VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                """, (
                    deal["ticker"], deal["company"], deal["director"], deal["role"],
                    deal["transaction_date"] or None, deal.get("announcement_date") or None,
                    deal["transaction_type"], deal["shares"], deal["price"],
                    deal["value"], deal["class_of_securities"],
                    deal["nature_of_interest"], deal["clearance_received"],
                    deal.get("source_url", ""), deal["confidence"],
                ))
                stored += 1
            except Exception as e:
                logger.error(f"Failed to store deal: {e}")
                conn.rollback()
    conn.commit()
    logger.info(f"Stored {stored} director deals")
    return stored


# ─── Pipeline ────────────────────────────────────────────────────────────────

def run_pipeline(
    tickers: list[str] = None,
    scrape_pages: int = 2,
    anthropic_key: str = None,
    output_format: str = "json",
):
    """
    Full pipeline: Scrape -> Parse -> Store in PostgreSQL -> Export
    """
    conn = init_db()
    scraper = CompanyScraper()
    parser = SENSParser(anthropic_api_key=anthropic_key)

    if not tickers:
        tickers = [c["ticker"] for c in JSE_TOP_40]

    all_deals = []

    for ticker in tickers:
        company = next((c for c in JSE_TOP_40 if c["ticker"] == ticker), None)
        if not company:
            logger.warning(f"Skipping unknown ticker: {ticker}")
            continue

        logger.info(f"\n{'='*50}")
        logger.info(f"Processing {ticker} ({company['name']})")
        logger.info(f"{'='*50}")

        # Step 1: Scrape
        logger.info("Step 1: Scraping company IR pages...")
        raw_announcements = scraper.scrape(ticker, max_announcements=scrape_pages * 5)
        store_raw(conn, raw_announcements)

        # Step 2: Parse each announcement
        logger.info("Step 2: Parsing announcements...")
        for ann in raw_announcements:
            deals = parser.parse(ann.full_text, ticker=ticker, company=company["name"])

            for deal in deals:
                deal_dict = asdict(deal)
                deal_dict["ticker"] = ticker
                deal_dict["company"] = company["name"]
                deal_dict["announcement_date"] = ann.date
                deal_dict["source_url"] = ann.url
                all_deals.append(deal_dict)

        logger.info(f"  Extracted {len(all_deals)} deals total")

    # Step 3: Store deals
    logger.info("\nStep 3: Storing parsed deals in PostgreSQL...")
    store_deals(conn, all_deals)

    # Step 4: Export
    os.makedirs("output", exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

    if output_format == "csv":
        output_path = f"output/director_deals_{timestamp}.csv"
        export_csv(all_deals, output_path)
    else:
        output_path = f"output/director_deals_{timestamp}.json"
        export_json(all_deals, output_path)

    # Summary
    print_summary(all_deals)

    conn.close()
    return all_deals


def export_json(deals: list[dict], path: str):
    """Export deals to JSON."""
    with open(path, "w") as f:
        json.dump(deals, f, indent=2, ensure_ascii=False, default=str)
    logger.info(f"Exported {len(deals)} deals to {path}")


def export_csv(deals: list[dict], path: str):
    """Export deals to CSV."""
    if not deals:
        logger.warning("No deals to export")
        return

    fieldnames = [
        "ticker", "company", "director", "role", "transaction_date",
        "transaction_type", "shares", "price", "value",
        "nature_of_interest", "clearance_received", "confidence", "source_url"
    ]

    with open(path, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(deals)

    logger.info(f"Exported {len(deals)} deals to {path}")


def print_summary(deals: list[dict]):
    """Print a summary of extracted deals."""
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


# ─── Time Periods ───────────────────────────────────────────────────────────

PERIODS = {
    "week":    7,
    "month":   30,
    "3months": 90,
    "ytd":     None,   # calculated dynamically
    "6months": 180,
    "1year":   365,
}


def period_to_dates(period: str) -> tuple[str, str]:
    """
    Convert a named period to (start_date, end_date) strings.

    Returns (YYYY-MM-DD, YYYY-MM-DD) tuple.
    """
    today = datetime.now()
    end_date = today.strftime("%Y-%m-%d")

    if period == "ytd":
        start_date = f"{today.year}-01-01"
    elif period in PERIODS:
        days = PERIODS[period]
        start_date = (today - timedelta(days=days)).strftime("%Y-%m-%d")
    else:
        # Default to 30 days
        start_date = (today - timedelta(days=30)).strftime("%Y-%m-%d")

    return start_date, end_date


# ─── Moneyweb Pipeline ─────────────────────────────────────────────────────

def run_moneyweb_pipeline(
    period: str = "month",
    ticker: str = None,
    max_pages: int = 20,
    anthropic_key: str = None,
    output_format: str = "json",
    include_delisted: bool = False,
):
    """
    Scrape director dealings from Moneyweb SENS.

    This is the primary pipeline — one centralized source instead of
    scraping 40+ individual IR pages.

    Args:
        period: Time period — week, month, 3months, ytd, 6months, 1year
        ticker: Optional single ticker to filter for
        max_pages: Max listing pages to paginate through
        anthropic_key: Anthropic API key for LLM fallback parsing
        output_format: json or csv
        include_delisted: If True, include deals from delisted companies
    """
    conn = init_db()
    strategy = MoneywebSENSStrategy()
    parser = SENSParser(anthropic_api_key=anthropic_key)

    start_date, end_date = period_to_dates(period)
    logger.info(f"\nMoneyweb SENS Pipeline")
    logger.info(f"  Period: {period} ({start_date} to {end_date})")
    if ticker:
        logger.info(f"  Ticker filter: {ticker}")

    # Build a lookup of known companies (for sector, status, etc.)
    known_companies = {c["ticker"]: c for c in JSE_TOP_40}

    # Step 1: Discover announcements
    logger.info("\nStep 1: Discovering director dealing announcements...")
    if ticker:
        company_info = known_companies.get(ticker.upper(), {"ticker": ticker.upper(), "name": ticker.upper()})
        links = strategy.discover(ticker.upper(), company_info)
    else:
        links = strategy.discover_all(
            max_pages=max_pages,
            start_date=start_date,
            end_date=end_date,
        )
    logger.info(f"  Found {len(links)} announcements")

    if not links:
        logger.info("No announcements found for this period.")
        conn.close()
        return []

    # Step 2: Fetch full text and parse each announcement
    logger.info("\nStep 2: Fetching and parsing announcements...")
    all_deals = []

    for i, link in enumerate(links, 1):
        link_ticker = link.get("ticker", "")
        link_company = link.get("company", "")

        # Skip delisted companies unless explicitly included
        if not include_delisted and link_ticker:
            with conn.cursor() as cur:
                cur.execute("SELECT status FROM companies WHERE ticker=%s", (link_ticker,))
                row = cur.fetchone()
                if row and row[0] == "delisted":
                    logger.info(f"  Skipping delisted: {link_ticker} {link_company}")
                    continue

        logger.info(f"  [{i}/{len(links)}] {link_ticker} — {link['title'][:50]}...")

        full_text = strategy.extract(link["url"])
        if not full_text or len(full_text) < 50:
            logger.info(f"    No usable content")
            continue

        # If ticker wasn't on the listing page, extract from the body text
        if not link_ticker:
            link_ticker = strategy._extract_ticker_from_text(full_text)
        if not link_company and link_ticker in known_companies:
            link_company = known_companies[link_ticker]["name"]
        if not link_company:
            link_company = link_ticker

        # Ensure company exists in DB
        sector = known_companies.get(link_ticker, {}).get("sector", "")
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO companies (ticker, name, sector) "
                "VALUES (%s, %s, %s) ON CONFLICT (ticker) DO NOTHING",
                (link_ticker, link_company, sector),
            )
        conn.commit()

        # Store raw announcement
        ann = RawAnnouncement(
            ticker=link_ticker, company=link_company,
            title=link["title"], date=link["date"],
            url=link["url"], full_text=full_text,
            source_domain="moneyweb.co.za",
        )
        store_raw(conn, [ann])

        # Parse
        deals = parser.parse(full_text, ticker=link_ticker, company=link_company)

        # Filter out vestings and tax sales
        deals = [d for d in deals if d.transaction_type in ("Buy", "Sell")]

        for deal in deals:
            deal_dict = asdict(deal)
            deal_dict["ticker"] = link_ticker
            deal_dict["company"] = link_company
            deal_dict["announcement_date"] = link["date"]
            deal_dict["source_url"] = link["url"]
            all_deals.append(deal_dict)

        logger.info(f"    Parsed {len(deals)} deal(s)")

    # Step 3: Store deals
    if all_deals:
        logger.info(f"\nStep 3: Storing {len(all_deals)} deals in PostgreSQL...")
        store_deals(conn, all_deals)

    # Step 4: Export
    os.makedirs("output", exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    if output_format == "csv":
        export_csv(all_deals, f"output/moneyweb_deals_{timestamp}.csv")
    else:
        export_json(all_deals, f"output/moneyweb_deals_{timestamp}.json")

    print_summary(all_deals)
    conn.close()
    return all_deals


# ─── CLI ─────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    ap = argparse.ArgumentParser(description="Raven Insider Trading Pipeline")

    # Source selection
    ap.add_argument("--source", "-s", choices=["moneyweb", "ir"],
                    default="moneyweb",
                    help="Data source: moneyweb (default) or ir (company IR pages)")

    # Time period (for Moneyweb)
    ap.add_argument("--period", choices=["week", "month", "3months", "ytd",
                                          "6months", "1year"],
                    default="month",
                    help="Time period to scrape (default: month)")

    # Filters
    ap.add_argument("--ticker", "-t", help="Process specific ticker(s), comma-separated")
    ap.add_argument("--all", "-a", action="store_true", help="Process all companies")
    ap.add_argument("--include-delisted", action="store_true",
                    help="Include deals from delisted companies")

    # Options
    ap.add_argument("--pages", "-p", type=int, default=20,
                    help="Max listing pages to scrape (default: 20)")
    ap.add_argument("--format", "-f", choices=["json", "csv"], default="json")
    ap.add_argument("--anthropic-key", help="Anthropic API key for LLM parsing")
    ap.add_argument("--parse-file", help="Parse from existing raw announcements JSON")

    # Admin
    ap.add_argument("--delist", help="Mark ticker(s) as delisted, comma-separated")
    args = ap.parse_args()

    # Handle delisting
    if args.delist:
        conn = init_db()
        tickers = [t.strip().upper() for t in args.delist.split(",")]
        with conn.cursor() as cur:
            for t in tickers:
                cur.execute("UPDATE companies SET status='delisted' WHERE ticker=%s", (t,))
                logger.info(f"Marked {t} as delisted")
        conn.commit()
        conn.close()
        exit(0)

    # Parse from file
    if args.parse_file:
        with open(args.parse_file) as f:
            raw_data = json.load(f)
        parser = SENSParser(anthropic_api_key=args.anthropic_key)
        all_deals = []
        for item in raw_data:
            deals = parser.parse(item["full_text"], item["ticker"], item["company"])
            for d in deals:
                deal_dict = asdict(d)
                deal_dict["ticker"] = item["ticker"]
                deal_dict["company"] = item["company"]
                deal_dict["source_url"] = item["url"]
                all_deals.append(deal_dict)
        print_summary(all_deals)

    # Moneyweb pipeline (default)
    elif args.source == "moneyweb":
        single_ticker = None
        if args.ticker:
            # For single ticker, run once per ticker
            tickers = [t.strip().upper() for t in args.ticker.split(",")]
            for t in tickers:
                run_moneyweb_pipeline(
                    period=args.period, ticker=t, max_pages=args.pages,
                    anthropic_key=args.anthropic_key, output_format=args.format,
                    include_delisted=args.include_delisted,
                )
        else:
            # All companies — no ticker filter
            run_moneyweb_pipeline(
                period=args.period, max_pages=args.pages,
                anthropic_key=args.anthropic_key, output_format=args.format,
                include_delisted=args.include_delisted,
            )

    # Legacy IR page pipeline
    elif args.source == "ir":
        if args.ticker:
            tickers = [t.strip().upper() for t in args.ticker.split(",")]
            run_pipeline(tickers, args.pages, args.anthropic_key, args.format)
        elif args.all:
            run_pipeline(None, args.pages, args.anthropic_key, args.format)
        else:
            ap.print_help()

    else:
        ap.print_help()
