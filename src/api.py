"""
Raven API — PostgreSQL Backend
================================
FastAPI backend serving JSE insider trading data.
Database: PostgreSQL (Railway provides DATABASE_URL automatically)
"""

import os
import logging
from datetime import datetime, timedelta
from typing import Optional
from contextlib import contextmanager

import psycopg2
import psycopg2.extras
import psycopg2.pool
import jwt
import bcrypt
import stripe

from fastapi import FastAPI, Query, HTTPException, Path, Header, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Raven API", description="JSE Insider Trading Intelligence", version="0.2.0", docs_url="/docs")

app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

# ─── Database ────────────────────────────────────────────────────────────────

DATABASE_URL = os.environ.get("DATABASE_URL", "")
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# Reuse DB connections across requests. Opening a fresh connection per request
# means a TCP+TLS+auth handshake to the (cross-region) pooler every time, which
# dominates latency for multi-call pages like the dashboard. A small pool keeps
# warm connections ready.
_DB_POOL = None

def _db_pool():
    global _DB_POOL
    if _DB_POOL is None:
        _DB_POOL = psycopg2.pool.ThreadedConnectionPool(
            1, 10, dsn=DATABASE_URL,
            connect_timeout=10,
            # Keep pooled connections alive across the app(Frankfurt)->DB(Ireland)
            # hop so idle TCP sessions aren't silently dropped — the cause of the
            # recurring "could not send data to server: Connection timed out".
            keepalives=1, keepalives_idle=30, keepalives_interval=10, keepalives_count=5,
        )
    return _DB_POOL


def _borrow_live_conn(pool):
    """Return a pooled connection that is actually alive.

    Pooled connections can go stale on the cross-region link (an idle TCP
    session gets dropped), and psycopg2's pool will hand a dead one to the next
    request — which then fails with "could not send data to server: Connection
    timed out" until the process is restarted. So validate each borrowed
    connection with a cheap SELECT 1, and if it's dead, discard it and let the
    pool open a fresh one. With TCP keepalives this self-heals without a restart.
    """
    last_err = None
    for _ in range(3):
        conn = pool.getconn()
        try:
            with conn.cursor() as cur:
                cur.execute("SELECT 1")
            conn.rollback()
            return conn
        except Exception as e:  # stale/dead — drop it; the pool opens a fresh one
            last_err = e
            try:
                pool.putconn(conn, close=True)
            except Exception:
                pass
    raise psycopg2.OperationalError(
        f"could not obtain a live database connection: {last_err}"
    )


@contextmanager
def get_db():
    pool = _db_pool()
    conn = _borrow_live_conn(pool)
    broken = False
    try:
        yield conn
    except Exception:
        try:
            conn.rollback()
        except Exception:
            broken = True
        raise
    finally:
        try:
            if not broken and not conn.closed:
                conn.rollback()  # clear any open read transaction before reuse
            pool.putconn(conn, close=broken or conn.closed)
        except Exception:
            try:
                pool.putconn(conn, close=True)
            except Exception:
                pass

def query(conn, sql, params=None):
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(sql, params or ())
        try:
            return cur.fetchall()
        except psycopg2.ProgrammingError:
            return []

def query_one(conn, sql, params=None):
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(sql, params or ())
        return cur.fetchone()

def query_val(conn, sql, params=None):
    with conn.cursor() as cur:
        cur.execute(sql, params or ())
        row = cur.fetchone()
        return row[0] if row else None

# ─── Auth & Stripe Config ────────────────────────────────────────────────────

JWT_SECRET = os.environ.get("JWT_SECRET", "change-me-in-prod")
JWT_EXPIRY_DAYS = 30

stripe.api_key = os.environ.get("STRIPE_SECRET_KEY", "")
STRIPE_PUBLISHABLE_KEY = os.environ.get("STRIPE_PUBLISHABLE_KEY", "")
STRIPE_WEBHOOK_SECRET = os.environ.get("STRIPE_WEBHOOK_SECRET", "")
STRIPE_PRICE_ID = os.environ.get("STRIPE_PRICE_ID", "")
APP_URL = os.environ.get("APP_URL", "https://raven-production-ca3b.up.railway.app")


def create_token(user_id: int, email: str) -> str:
    return jwt.encode(
        {"user_id": user_id, "email": email, "exp": datetime.utcnow() + timedelta(days=JWT_EXPIRY_DAYS)},
        JWT_SECRET, algorithm="HS256"
    )


def get_current_user(authorization: str) -> dict:
    """Decode JWT and fetch user from DB. Returns user dict or raises 401."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Missing or invalid authorization header")
    token = authorization[7:]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid token")

    with get_db() as conn:
        user = query_one(conn, "SELECT id, email, stripe_customer_id, subscription_status, subscription_id FROM users WHERE id = %s", (payload["user_id"],))
    if not user:
        raise HTTPException(401, "User not found")
    return dict(user)


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))


def ensure_db():
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS companies (
                    ticker TEXT PRIMARY KEY, name TEXT NOT NULL,
                    sector TEXT, ir_url TEXT, last_scraped TIMESTAMP,
                    status TEXT DEFAULT 'listed')
            """)
            # Add status column if table already exists without it
            cur.execute("""
                DO $$ BEGIN
                    ALTER TABLE companies ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'listed';
                EXCEPTION WHEN duplicate_column THEN NULL;
                END $$
            """)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS director_deals (
                    id SERIAL PRIMARY KEY, ticker TEXT NOT NULL REFERENCES companies(ticker),
                    company TEXT NOT NULL, director TEXT NOT NULL, role TEXT,
                    transaction_date DATE, announcement_date DATE,
                    transaction_type TEXT, shares INTEGER,
                    price NUMERIC(14,2), value NUMERIC(16,2),
                    class_of_securities TEXT DEFAULT 'Ordinary shares',
                    nature_of_interest TEXT, clearance_received BOOLEAN,
                    source_url TEXT, confidence NUMERIC(3,2),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)
            """)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS raw_announcements (
                    id SERIAL PRIMARY KEY, ticker TEXT NOT NULL, company TEXT NOT NULL,
                    title TEXT, date DATE, url TEXT UNIQUE, full_text TEXT,
                    source TEXT DEFAULT 'ir_page', scraped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    parsed BOOLEAN DEFAULT FALSE)
            """)
            cur.execute("CREATE INDEX IF NOT EXISTS idx_deals_ticker ON director_deals(ticker)")
            cur.execute("CREATE INDEX IF NOT EXISTS idx_deals_date ON director_deals(transaction_date)")
            cur.execute("CREATE INDEX IF NOT EXISTS idx_deals_type ON director_deals(transaction_type)")
            cur.execute("CREATE INDEX IF NOT EXISTS idx_deals_value ON director_deals(value)")
            # Multi-market support: add market column to both tables
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
            cur.execute("UPDATE companies SET market = 'JSE' WHERE market IS NULL")
            cur.execute("UPDATE director_deals SET market = 'JSE' WHERE market IS NULL")
            cur.execute("CREATE INDEX IF NOT EXISTS idx_deals_market ON director_deals(market)")
            cur.execute("CREATE INDEX IF NOT EXISTS idx_companies_market ON companies(market)")
            # Company website domain — used to fetch real logos (Logo.dev)
            cur.execute("ALTER TABLE companies ADD COLUMN IF NOT EXISTS website TEXT")
            # Dual-listing support: currency and exchange columns
            cur.execute("""
                DO $$ BEGIN
                    ALTER TABLE director_deals ADD COLUMN currency TEXT DEFAULT 'ZAR';
                EXCEPTION WHEN duplicate_column THEN NULL;
                END $$
            """)
            cur.execute("""
                DO $$ BEGIN
                    ALTER TABLE director_deals ADD COLUMN exchange TEXT DEFAULT 'JSE';
                EXCEPTION WHEN duplicate_column THEN NULL;
                END $$
            """)
            cur.execute("UPDATE director_deals SET currency = 'ZAR' WHERE currency IS NULL")
            cur.execute("UPDATE director_deals SET exchange = 'JSE' WHERE exchange IS NULL AND market = 'JSE'")
            cur.execute("UPDATE director_deals SET exchange = 'B3' WHERE exchange IS NULL AND market = 'B3'")
            # Users table for auth + subscriptions
            cur.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    id SERIAL PRIMARY KEY,
                    email TEXT UNIQUE NOT NULL,
                    password_hash TEXT NOT NULL,
                    stripe_customer_id TEXT,
                    subscription_status TEXT DEFAULT 'free',
                    subscription_id TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)
            """)
            cur.execute("CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)")
            cur.execute("CREATE INDEX IF NOT EXISTS idx_users_stripe_cust ON users(stripe_customer_id)")
            # Watchlist: tickers a user follows, for in-app tracking + monthly recaps
            cur.execute("""
                CREATE TABLE IF NOT EXISTS watchlist_items (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    ticker TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(user_id, ticker))
            """)
            cur.execute("CREATE INDEX IF NOT EXISTS idx_watchlist_user ON watchlist_items(user_id)")
            # Recap (digest email) preferences live on the user row
            cur.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS recap_enabled BOOLEAN DEFAULT true")
            cur.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS recap_frequency TEXT DEFAULT 'monthly'")
            cur.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS last_recap_sent_at TIMESTAMP")
        conn.commit()
        logger.info("PostgreSQL tables ready")

# ─── Models ──────────────────────────────────────────────────────────────────

class DealResponse(BaseModel):
    id: int; ticker: str; company: str; director: str
    role: Optional[str]=None; transaction_date: Optional[str]=None
    announcement_date: Optional[str]=None; transaction_type: Optional[str]=None
    shares: Optional[int]=None; price: Optional[float]=None
    value: Optional[float]=None; nature_of_interest: Optional[str]=None
    confidence: Optional[float]=None; source_url: Optional[str]=None
    market: Optional[str]="JSE"
    currency: Optional[str]="ZAR"; exchange: Optional[str]="JSE"

class PaginatedDeals(BaseModel):
    deals: list[DealResponse]; total: int; page: int; per_page: int; pages: int

class ClusterSignal(BaseModel):
    ticker: str; company: str; sector: Optional[str]=None
    insider_count: int; total_value: float; directors: list[dict]

class SectorFlow(BaseModel):
    sector: str; buy_value: float; sell_value: float; net_flow: float
    buy_count: int; sell_count: int; trade_count: int

class DashboardStats(BaseModel):
    total_deals: int; buy_count: int; sell_count: int
    buy_value: float; sell_value: float; net_flow: float
    buy_sell_ratio: float; cluster_count: int
    active_companies: int; active_directors: int; period_days: int

class PeriodBreakdown(BaseModel):
    period: str
    days: int
    buy_count: int; sell_count: int
    buy_value: float; sell_value: float; net_flow: float
    active_companies: int; active_directors: int

class CumulativeStats(BaseModel):
    periods: list[PeriodBreakdown]
    ticker: Optional[str] = None

class CompanyInfo(BaseModel):
    ticker: str; name: str; sector: Optional[str]=None
    status: Optional[str]="listed"
    last_scraped: Optional[str]=None; deal_count: Optional[int]=0
    market: Optional[str]="JSE"
    website: Optional[str]=None

def row_to_deal(r: dict) -> DealResponse:
    d = dict(r)
    for k in ("transaction_date","announcement_date"):
        if d.get(k) and hasattr(d[k],"isoformat"): d[k] = d[k].isoformat()
    for k in ("price","value","confidence"):
        if d.get(k): d[k] = float(d[k])
    return DealResponse(**d)

# ─── Startup ─────────────────────────────────────────────────────────────────

def _start_daily_scraper():
    """Background thread that scrapes Sharenet at 10:00, 13:00 and 17:30 SAST on weekdays."""
    import time
    from datetime import datetime, timezone, timedelta

    SAST = timezone(timedelta(hours=2))
    # (hour, minute) in SAST — kept in sync with the host crontab
    scrape_times = [(10, 0), (13, 0), (17, 30)]
    logger.info("Daily scraper scheduler started (10:00, 13:00, 17:30 SAST, weekdays)")

    while True:
        now = datetime.now(SAST)
        # Fire within a 5-minute window of each scheduled time, weekdays only (Mon=0..Fri=4)
        due = now.weekday() < 5 and any(now.hour == h and m <= now.minute < m + 5 for h, m in scrape_times)
        if due:
            logger.info(f"Scheduled scrape triggered at {now.strftime('%H:%M SAST')}")
            try:
                from pipeline import run_pipeline
                run_pipeline()
            except Exception as e:
                logger.error(f"Scheduled scrape failed: {e}")
            # Sleep 10 min to avoid re-triggering in the same window
            time.sleep(600)
        else:
            # Check every 60 seconds
            time.sleep(60)


@app.on_event("startup")
async def startup():
    if not DATABASE_URL:
        logger.error("DATABASE_URL not set!")
        return
    ensure_db()

    # Start the daily scraper in a background thread
    import threading
    threading.Thread(target=_start_daily_scraper, daemon=True).start()

    logger.info("Raven API started (PostgreSQL + daily Sharenet scraper)")

@app.get("/api/health")
async def health():
    if not DATABASE_URL:
        return {"status": "ok", "database": "not_configured", "deals_in_db": 0}
    try:
        with get_db() as conn:
            count = query_val(conn, "SELECT COUNT(*) FROM director_deals")
        return {"status": "ok", "deals_in_db": count, "database": "postgresql"}
    except Exception as e:
        return {"status": "degraded", "database": "error", "detail": str(e)}

# ─── Deals ───────────────────────────────────────────────────────────────────

@app.get("/api/deals", response_model=PaginatedDeals)
async def get_deals(
    page: int=Query(1,ge=1), per_page: int=Query(50,ge=1,le=200),
    ticker: Optional[str]=None, director: Optional[str]=None,
    transaction_type: Optional[str]=Query(None,pattern="^(Buy|Sell|Vesting|TaxSale|HedgeSettlement)$"),
    exclude_non_discretionary: bool=Query(True, description="Exclude vestings and tax sales"),
    market: Optional[str]=Query(None, description="Filter by market: JSE, B3, or omit for all"),
    sector: Optional[str]=None, min_value: Optional[float]=None,
    max_value: Optional[float]=None, days: Optional[int]=Query(None,ge=1,le=365),
    sort: str=Query("transaction_date",pattern="^(transaction_date|value|shares|company|director)$"),
    order: str=Query("desc",pattern="^(asc|desc)$"), search: Optional[str]=None,
):
    with get_db() as conn:
        conds, params = [], []
        def p(v):
            params.append(v)
            return f"%s"
        if ticker: conds.append(f"d.ticker = {p(ticker.upper())}")
        if director: conds.append(f"d.director ILIKE {p(f'%{director}%')}")
        if transaction_type: conds.append(f"d.transaction_type = {p(transaction_type)}")
        if exclude_non_discretionary and not transaction_type:
            conds.append("d.transaction_type IN ('Buy', 'Sell')")
        if market: conds.append(f"d.market = {p(market.upper())}")
        if sector: conds.append(f"c.sector = {p(sector)}")
        # Exclude delisted companies by default
        conds.append("COALESCE(c.status, 'listed') != 'delisted'")
        if min_value is not None: conds.append(f"d.value >= {p(min_value)}")
        if max_value is not None: conds.append(f"d.value <= {p(max_value)}")
        if days:
            cutoff = (datetime.now()-timedelta(days=days)).strftime("%Y-%m-%d")
            conds.append(f"d.transaction_date >= {p(cutoff)}")
        if search:
            s = f"%{search}%"
            conds.append(f"(d.company ILIKE %s OR d.ticker ILIKE %s OR d.director ILIKE %s)")
            params.extend([s,s,s])
        w = " AND ".join(conds) if conds else "1=1"

        total = query_val(conn, f"SELECT COUNT(*) FROM director_deals d LEFT JOIN companies c ON d.ticker=c.ticker WHERE {w}", params)
        offset = (page-1)*per_page
        rows = query(conn, f"SELECT d.* FROM director_deals d LEFT JOIN companies c ON d.ticker=c.ticker WHERE {w} ORDER BY d.{sort} {order.upper()} NULLS LAST LIMIT %s OFFSET %s", params+[per_page, offset])
        return PaginatedDeals(deals=[row_to_deal(r) for r in rows], total=total, page=page, per_page=per_page, pages=(total+per_page-1)//per_page)

@app.get("/api/deals/latest", response_model=list[DealResponse])
async def get_latest(limit: int=Query(20,ge=1,le=100)):
    with get_db() as conn:
        rows = query(conn, "SELECT * FROM director_deals ORDER BY transaction_date DESC NULLS LAST, created_at DESC LIMIT %s", (limit,))
        return [row_to_deal(r) for r in rows]

@app.get("/api/deals/company/{ticker}", response_model=list[DealResponse])
async def get_company(ticker: str=Path(...,min_length=2,max_length=6), limit: int=Query(50,ge=1,le=200)):
    with get_db() as conn:
        rows = query(conn, "SELECT * FROM director_deals WHERE ticker=%s ORDER BY transaction_date DESC NULLS LAST LIMIT %s", (ticker.upper(), limit))
        if not rows: raise HTTPException(404, f"No deals for {ticker.upper()}")
        return [row_to_deal(r) for r in rows]

@app.get("/api/deals/director/{name}", response_model=list[DealResponse])
async def get_director(name: str=Path(...,min_length=2), limit: int=Query(50,ge=1,le=200)):
    with get_db() as conn:
        rows = query(conn, "SELECT * FROM director_deals WHERE director ILIKE %s ORDER BY transaction_date DESC NULLS LAST LIMIT %s", (f"%{name}%", limit))
        if not rows: raise HTTPException(404, f"No deals for '{name}'")
        return [row_to_deal(r) for r in rows]

# ─── Clusters ────────────────────────────────────────────────────────────────

@app.get("/api/deals/clusters", response_model=list[ClusterSignal])
async def get_clusters(days: int=Query(30,ge=7,le=365), min_insiders: int=Query(2,ge=2,le=10), market: Optional[str]=None):
    with get_db() as conn:
        cutoff = (datetime.now()-timedelta(days=days)).strftime("%Y-%m-%d")
        market_filter = ""
        params = [cutoff]
        if market:
            market_filter = " AND d.market = %s"
            params.append(market.upper())
        params.append(min_insiders)
        raw = query(conn, f"""
            SELECT d.ticker, d.company, c.sector, COUNT(DISTINCT d.director) as cnt, SUM(d.value) as tv
            FROM director_deals d LEFT JOIN companies c ON d.ticker=c.ticker
            WHERE d.transaction_type='Buy' AND d.transaction_date>=%s{market_filter}
            GROUP BY d.ticker, d.company, c.sector HAVING COUNT(DISTINCT d.director)>=%s
            ORDER BY SUM(d.value) DESC
        """, params)
        # Fetch every contributing director for all qualifying tickers in ONE query
        # (was a per-cluster query — an N+1 round trip to the DB for each cluster).
        tickers = [r["ticker"] for r in raw]
        dirs_by_ticker = {}
        if tickers:
            all_dirs = query(conn,
                "SELECT ticker,director,role,shares,price,value,transaction_date FROM director_deals "
                "WHERE ticker = ANY(%s) AND transaction_type='Buy' AND transaction_date>=%s ORDER BY value DESC",
                (tickers, cutoff))
            for d in all_dirs:
                dirs_by_ticker.setdefault(d["ticker"], []).append(d)

        clusters = []
        for r in raw:
            dirs = dirs_by_ticker.get(r["ticker"], [])
            clusters.append(ClusterSignal(
                ticker=r["ticker"], company=r["company"], sector=r["sector"],
                insider_count=r["cnt"], total_value=float(r["tv"] or 0),
                directors=[{"name":d["director"],"role":d["role"],"shares":d["shares"],
                    "price":float(d["price"]) if d["price"] else 0,
                    "value":float(d["value"]) if d["value"] else 0,
                    "date":d["transaction_date"].isoformat() if d["transaction_date"] else ""
                } for d in dirs]
            ))
        return clusters

# ─── Sectors ─────────────────────────────────────────────────────────────────

@app.get("/api/deals/sectors", response_model=list[SectorFlow])
async def get_sectors(days: int=Query(30,ge=7,le=365), market: Optional[str]=None):
    with get_db() as conn:
        cutoff = (datetime.now()-timedelta(days=days)).strftime("%Y-%m-%d")
        market_filter = ""
        params = [cutoff]
        if market:
            market_filter = " AND d.market = %s"
            params.append(market.upper())
        rows = query(conn, f"""
            SELECT c.sector,
                SUM(CASE WHEN d.transaction_type='Buy' THEN d.value ELSE 0 END) as bv,
                SUM(CASE WHEN d.transaction_type='Sell' THEN d.value ELSE 0 END) as sv,
                SUM(CASE WHEN d.transaction_type='Buy' THEN 1 ELSE 0 END) as bc,
                SUM(CASE WHEN d.transaction_type='Sell' THEN 1 ELSE 0 END) as sc,
                COUNT(*) as tc
            FROM director_deals d LEFT JOIN companies c ON d.ticker=c.ticker
            WHERE d.transaction_date>=%s{market_filter} AND c.sector IS NOT NULL
            GROUP BY c.sector ORDER BY (SUM(CASE WHEN d.transaction_type='Buy' THEN d.value ELSE 0 END)-SUM(CASE WHEN d.transaction_type='Sell' THEN d.value ELSE 0 END)) DESC
        """, params)
        return [SectorFlow(sector=r["sector"],buy_value=float(r["bv"] or 0),sell_value=float(r["sv"] or 0),
            net_flow=float((r["bv"] or 0)-(r["sv"] or 0)),buy_count=r["bc"],sell_count=r["sc"],trade_count=r["tc"]) for r in rows]

# ─── Stats ───────────────────────────────────────────────────────────────────

@app.get("/api/stats", response_model=DashboardStats)
async def get_stats(days: int=Query(30,ge=7,le=365), market: Optional[str]=None):
    with get_db() as conn:
        cutoff = (datetime.now()-timedelta(days=days)).strftime("%Y-%m-%d")
        market_filter = ""
        params = [cutoff]
        if market:
            market_filter = " AND market = %s"
            params.append(market.upper())
        r = query_one(conn, f"""
            SELECT COUNT(*) as total,
                COALESCE(SUM(CASE WHEN transaction_type='Buy' THEN 1 ELSE 0 END),0) as buys,
                COALESCE(SUM(CASE WHEN transaction_type='Sell' THEN 1 ELSE 0 END),0) as sells,
                COALESCE(SUM(CASE WHEN transaction_type='Buy' THEN value ELSE 0 END),0) as bv,
                COALESCE(SUM(CASE WHEN transaction_type='Sell' THEN value ELSE 0 END),0) as sv,
                COUNT(DISTINCT ticker) as comps, COUNT(DISTINCT director) as dirs
            FROM director_deals WHERE transaction_date>=%s{market_filter}
        """, params)
        bv, sv = float(r["bv"]), float(r["sv"])
        cc = query_val(conn, f"SELECT COUNT(*) FROM (SELECT ticker FROM director_deals WHERE transaction_type='Buy' AND transaction_date>=%s{market_filter} GROUP BY ticker HAVING COUNT(DISTINCT director)>=2) sub", params)
        return DashboardStats(total_deals=r["total"],buy_count=r["buys"],sell_count=r["sells"],
            buy_value=bv,sell_value=sv,net_flow=bv-sv,
            buy_sell_ratio=round(bv/sv,2) if sv>0 else 0,
            cluster_count=cc or 0,active_companies=r["comps"],active_directors=r["dirs"],period_days=days)

@app.get("/api/stats/periods", response_model=CumulativeStats)
async def get_period_stats(ticker: Optional[str]=None):
    """
    Cumulative buying/selling breakdown across all standard periods:
    1 week, 1 month, 3 months, YTD, 6 months, 1 year.

    Optionally filter by ticker for a single company's breakdown.
    """
    today = datetime.now()
    period_defs = [
        ("1 week", 7),
        ("1 month", 30),
        ("3 months", 90),
        ("YTD", (today - datetime(today.year, 1, 1)).days),
        ("6 months", 180),
        ("1 year", 365),
    ]

    with get_db() as conn:
        results = []
        for label, days in period_defs:
            cutoff = (today - timedelta(days=days)).strftime("%Y-%m-%d")
            ticker_filter = ""
            params = [cutoff]
            if ticker:
                ticker_filter = " AND d.ticker = %s"
                params.append(ticker.upper())
            r = query_one(conn, f"""
                SELECT
                    COALESCE(SUM(CASE WHEN d.transaction_type='Buy' THEN 1 ELSE 0 END),0) as bc,
                    COALESCE(SUM(CASE WHEN d.transaction_type='Sell' THEN 1 ELSE 0 END),0) as sc,
                    COALESCE(SUM(CASE WHEN d.transaction_type='Buy' THEN d.value ELSE 0 END),0) as bv,
                    COALESCE(SUM(CASE WHEN d.transaction_type='Sell' THEN d.value ELSE 0 END),0) as sv,
                    COUNT(DISTINCT d.ticker) as comps,
                    COUNT(DISTINCT d.director) as dirs
                FROM director_deals d
                LEFT JOIN companies c ON d.ticker=c.ticker
                WHERE d.transaction_date >= %s
                    AND d.transaction_type IN ('Buy','Sell')
                    AND COALESCE(c.status, 'listed') != 'delisted'
                    {ticker_filter}
            """, params)
            bv, sv = float(r["bv"]), float(r["sv"])
            results.append(PeriodBreakdown(
                period=label, days=days,
                buy_count=r["bc"], sell_count=r["sc"],
                buy_value=bv, sell_value=sv, net_flow=bv - sv,
                active_companies=r["comps"], active_directors=r["dirs"],
            ))
        return CumulativeStats(periods=results, ticker=ticker.upper() if ticker else None)

# ─── SENS PDF ────────────────────────────────────────────────────────────────

@app.get("/api/sens-pdf/{deal_id}")
async def get_sens_pdf(deal_id: int = Path(..., ge=1)):
    """Generate a PDF of the raw SENS announcement for a deal."""
    from io import BytesIO
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import mm
    from reportlab.lib.colors import HexColor
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, HRFlowable
    from reportlab.lib.styles import ParagraphStyle
    from reportlab.lib.enums import TA_CENTER
    from starlette.responses import StreamingResponse

    with get_db() as conn:
        deal = query_one(conn, "SELECT ticker, company, director, transaction_type, transaction_date, source_url FROM director_deals WHERE id = %s", (deal_id,))
        if not deal:
            raise HTTPException(404, "Deal not found")

        raw = None
        if deal["source_url"]:
            raw = query_one(conn, "SELECT ticker, company, title, date, full_text FROM raw_announcements WHERE url = %s", (deal["source_url"],))

        if not raw or not raw["full_text"]:
            raise HTTPException(404, "Raw SENS announcement not available for this deal")

    # Build PDF
    buf = BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, leftMargin=25*mm, rightMargin=25*mm, topMargin=20*mm, bottomMargin=20*mm)

    black = HexColor("#111111")
    grey = HexColor("#666666")
    orange = HexColor("#FF5C00")

    style_header = ParagraphStyle("header", fontName="Helvetica-Bold", fontSize=18, textColor=orange, spaceAfter=2*mm)
    style_sub = ParagraphStyle("sub", fontName="Helvetica", fontSize=9, textColor=grey, spaceAfter=6*mm)
    style_meta = ParagraphStyle("meta", fontName="Helvetica-Bold", fontSize=10, textColor=black, spaceAfter=1.5*mm)
    style_body = ParagraphStyle("body", fontName="Courier", fontSize=8.5, textColor=black, leading=12, spaceAfter=0)
    style_footer = ParagraphStyle("footer", fontName="Helvetica", fontSize=7, textColor=grey, alignment=TA_CENTER)

    elements = []

    # Header
    elements.append(Paragraph("RAVEN", style_header))
    elements.append(Paragraph("JSE Insider Trading Intelligence — SENS Announcement Archive", style_sub))
    elements.append(HRFlowable(width="100%", thickness=0.5, color=grey, spaceAfter=4*mm))

    # Metadata
    ticker = deal["ticker"] or raw["ticker"]
    company = deal["company"] or raw["company"]
    date_str = str(deal["transaction_date"] or raw["date"] or "")
    elements.append(Paragraph(f"<b>{ticker}</b> — {company}", style_meta))
    if raw["title"]:
        title_esc = raw["title"].replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
        elements.append(Paragraph(title_esc, style_meta))
    elements.append(Paragraph(f"Date: {date_str}", style_meta))
    elements.append(Spacer(1, 4*mm))
    elements.append(HRFlowable(width="100%", thickness=0.3, color=grey, spaceAfter=4*mm))

    # SENS text — preserve formatting with monospace
    full_text = raw["full_text"]
    full_text = full_text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    for line in full_text.split("\n"):
        safe_line = line.replace(" ", "&nbsp;") if line.strip() else "&nbsp;"
        elements.append(Paragraph(safe_line, style_body))

    # Footer
    elements.append(Spacer(1, 8*mm))
    elements.append(HRFlowable(width="100%", thickness=0.3, color=grey, spaceAfter=2*mm))
    src = (deal["source_url"] or "Sharenet SENS").replace("&", "&amp;")
    elements.append(Paragraph(f"Generated by Raven — Source: {src}", style_footer))

    doc.build(elements)
    buf.seek(0)

    filename = f"SENS_{ticker}_{date_str}.pdf"
    return StreamingResponse(
        buf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="{filename}"'},
    )


# ─── Companies ───────────────────────────────────────────────────────────────

@app.get("/api/companies", response_model=list[CompanyInfo])
async def get_companies(sector: Optional[str]=None, include_delisted: bool=False, days: Optional[int]=Query(None,ge=1,le=1825), market: Optional[str]=None):
    with get_db() as conn:
        deal_filter = ""
        params = []
        if days:
            cutoff = (datetime.now()-timedelta(days=days)).strftime("%Y-%m-%d")
            deal_filter = " AND d.transaction_date >= %s"
            params.append(cutoff)
        sql = f"SELECT c.ticker,c.name,c.sector,c.status,c.last_scraped,c.market,c.website,COUNT(CASE WHEN d.id IS NOT NULL{deal_filter} THEN 1 END) as deal_count FROM companies c LEFT JOIN director_deals d ON c.ticker=d.ticker"
        conds = []
        if market:
            conds.append("c.market=%s"); params.append(market.upper())
        if sector:
            conds.append("c.sector=%s"); params.append(sector)
        if not include_delisted:
            conds.append("COALESCE(c.status, 'listed') != 'delisted'")
        if conds:
            sql += " WHERE " + " AND ".join(conds)
        sql += " GROUP BY c.ticker,c.name,c.sector,c.status,c.last_scraped,c.market,c.website ORDER BY c.name"
        rows = query(conn, sql, params)
        return [CompanyInfo(ticker=r["ticker"],name=r["name"],sector=r["sector"],
            status=r.get("status", "listed"),
            last_scraped=r["last_scraped"].isoformat() if r["last_scraped"] else None,
            deal_count=r["deal_count"],market=r.get("market","JSE"),website=r.get("website")) for r in rows]

# ─── Auth ─────────────────────────────────────────────────────────────────────

class AuthRequest(BaseModel):
    email: str
    password: str

class AuthResponse(BaseModel):
    token: str
    email: str
    subscription_status: str

class UserResponse(BaseModel):
    email: str
    subscription_status: str


@app.post("/api/auth/signup", response_model=AuthResponse)
async def signup(req: AuthRequest):
    email = req.email.strip().lower()
    if not email or "@" not in email:
        raise HTTPException(400, "Invalid email")
    if len(req.password) < 6:
        raise HTTPException(400, "Password must be at least 6 characters")

    pw_hash = hash_password(req.password)

    with get_db() as conn:
        # Check if email already exists
        existing = query_one(conn, "SELECT id FROM users WHERE email = %s", (email,))
        if existing:
            raise HTTPException(409, "Email already registered")

        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO users (email, password_hash) VALUES (%s, %s) RETURNING id",
                (email, pw_hash)
            )
            user_id = cur.fetchone()[0]
        conn.commit()

    token = create_token(user_id, email)
    return AuthResponse(token=token, email=email, subscription_status="free")


@app.post("/api/auth/login", response_model=AuthResponse)
async def login(req: AuthRequest):
    email = req.email.strip().lower()

    with get_db() as conn:
        user = query_one(conn, "SELECT id, email, password_hash, subscription_status FROM users WHERE email = %s", (email,))

    if not user or not verify_password(req.password, user["password_hash"]):
        raise HTTPException(401, "Invalid email or password")

    token = create_token(user["id"], user["email"])
    return AuthResponse(token=token, email=user["email"], subscription_status=user["subscription_status"] or "free")


@app.get("/api/auth/me", response_model=UserResponse)
async def get_me(authorization: str = Header(None)):
    user = get_current_user(authorization)
    return UserResponse(email=user["email"], subscription_status=user["subscription_status"] or "free")


# ─── Watchlist ───────────────────────────────────────────────────────────────

class WatchlistAddRequest(BaseModel):
    ticker: str


@app.get("/api/watchlist")
async def get_watchlist(authorization: str = Header(None)):
    """Return the authenticated user's watched tickers, with company info."""
    user = get_current_user(authorization)
    with get_db() as conn:
        rows = query(conn, """
            SELECT w.ticker, w.created_at, c.name, c.sector, c.market, c.website,
                   (SELECT COUNT(*) FROM director_deals d WHERE d.ticker = w.ticker) AS deal_count
            FROM watchlist_items w
            LEFT JOIN companies c ON c.ticker = w.ticker
            WHERE w.user_id = %s
            ORDER BY w.created_at DESC
        """, (user["id"],))
    items = []
    for r in rows:
        d = dict(r)
        if d.get("created_at") and hasattr(d["created_at"], "isoformat"):
            d["created_at"] = d["created_at"].isoformat()
        items.append(d)
    return {"tickers": [r["ticker"] for r in items], "items": items}


@app.post("/api/watchlist")
async def add_watchlist(req: WatchlistAddRequest, authorization: str = Header(None)):
    """Add a ticker to the user's watchlist (idempotent)."""
    user = get_current_user(authorization)
    ticker = (req.ticker or "").strip().upper()
    if not ticker:
        raise HTTPException(400, "Ticker required")
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO watchlist_items (user_id, ticker) VALUES (%s, %s) "
                "ON CONFLICT (user_id, ticker) DO NOTHING",
                (user["id"], ticker),
            )
        conn.commit()
    return {"ok": True, "ticker": ticker}


@app.delete("/api/watchlist/{ticker}")
async def remove_watchlist(ticker: str, authorization: str = Header(None)):
    """Remove a ticker from the user's watchlist."""
    user = get_current_user(authorization)
    ticker = ticker.strip().upper()
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM watchlist_items WHERE user_id = %s AND ticker = %s", (user["id"], ticker))
        conn.commit()
    return {"ok": True, "ticker": ticker}


@app.get("/api/watchlist/digest")
async def watchlist_digest(days: int = 30, authorization: str = Header(None)):
    """All disclosures for the user's watched tickers over the period.

    Today this covers insider trades (director_deals). The management-movement
    and superinvestor feeds get unioned in here once those tables exist — the
    same payload powers the in-app watchlist view and the monthly recap email.
    """
    user = get_current_user(authorization)
    with get_db() as conn:
        tickers = [r["ticker"] for r in query(conn, "SELECT ticker FROM watchlist_items WHERE user_id = %s", (user["id"],))]
        if not tickers:
            return {"period_days": days, "tickers": [], "insider_trades": [], "counts": {"insider_trades": 0}}
        cutoff = (datetime.utcnow() - timedelta(days=days)).date().isoformat()
        rows = query(
            conn,
            "SELECT * FROM director_deals WHERE ticker = ANY(%s) AND transaction_date >= %s "
            "ORDER BY transaction_date DESC NULLS LAST",
            (tickers, cutoff),
        )
    deals = [row_to_deal(r) for r in rows]
    return {
        "period_days": days,
        "tickers": tickers,
        "insider_trades": deals,
        "counts": {"insider_trades": len(deals)},
    }


# ─── Stripe ──────────────────────────────────────────────────────────────────

@app.post("/api/stripe/create-checkout")
async def create_checkout(authorization: str = Header(None)):
    """Create a Stripe Checkout session for the Pro subscription."""
    user = get_current_user(authorization)

    if not STRIPE_PRICE_ID:
        raise HTTPException(500, "Stripe not configured")

    # Create or reuse Stripe customer
    customer_id = user.get("stripe_customer_id")
    if not customer_id:
        customer = stripe.Customer.create(email=user["email"])
        customer_id = customer.id
        with get_db() as conn:
            with conn.cursor() as cur:
                cur.execute("UPDATE users SET stripe_customer_id = %s WHERE id = %s", (customer_id, user["id"]))
            conn.commit()

    session = stripe.checkout.Session.create(
        customer=customer_id,
        payment_method_types=["card"],
        line_items=[{"price": STRIPE_PRICE_ID, "quantity": 1}],
        mode="subscription",
        success_url=f"{APP_URL}/?checkout=success",
        cancel_url=f"{APP_URL}/?checkout=cancelled",
    )
    return {"checkout_url": session.url}


@app.post("/api/stripe/webhook")
async def stripe_webhook(request: Request):
    """Handle Stripe webhook events to update subscription status."""
    payload = await request.body()
    sig = request.headers.get("stripe-signature")

    if not STRIPE_WEBHOOK_SECRET:
        raise HTTPException(500, "Webhook secret not configured")

    try:
        event = stripe.Webhook.construct_event(payload, sig, STRIPE_WEBHOOK_SECRET)
    except ValueError:
        raise HTTPException(400, "Invalid payload")
    except stripe.error.SignatureVerificationError:
        raise HTTPException(400, "Invalid signature")

    event_type = event["type"]
    data = event["data"]["object"]

    if event_type == "checkout.session.completed":
        customer_id = data.get("customer")
        subscription_id = data.get("subscription")
        if customer_id:
            with get_db() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        "UPDATE users SET subscription_status = 'active', subscription_id = %s WHERE stripe_customer_id = %s",
                        (subscription_id, customer_id)
                    )
                conn.commit()
            logger.info(f"Subscription activated for customer {customer_id}")

    elif event_type in ("customer.subscription.updated", "customer.subscription.deleted"):
        customer_id = data.get("customer")
        status = data.get("status")  # active, past_due, canceled, unpaid
        subscription_id = data.get("id")

        # Map Stripe status to our status
        if status in ("canceled", "unpaid"):
            our_status = "free"
        elif status == "past_due":
            our_status = "past_due"
        else:
            our_status = "active"

        if customer_id:
            with get_db() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        "UPDATE users SET subscription_status = %s, subscription_id = %s WHERE stripe_customer_id = %s",
                        (our_status, subscription_id, customer_id)
                    )
                conn.commit()
            logger.info(f"Subscription updated to '{our_status}' for customer {customer_id}")

    elif event_type == "invoice.payment_failed":
        customer_id = data.get("customer")
        if customer_id:
            with get_db() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        "UPDATE users SET subscription_status = 'past_due' WHERE stripe_customer_id = %s",
                        (customer_id,)
                    )
                conn.commit()
            logger.info(f"Payment failed for customer {customer_id}")

    return {"status": "ok"}


@app.post("/api/stripe/portal")
async def customer_portal(authorization: str = Header(None)):
    """Create a Stripe Customer Portal session to manage subscription."""
    user = get_current_user(authorization)

    if not user.get("stripe_customer_id"):
        raise HTTPException(400, "No active subscription to manage")

    session = stripe.billing_portal.Session.create(
        customer=user["stripe_customer_id"],
        return_url=f"{APP_URL}/",
    )
    return {"portal_url": session.url}


# ─── Seed ────────────────────────────────────────────────────────────────────

@app.post("/api/refresh")
async def refresh_endpoint(
    secret: str = Query(..., description="CRON_SECRET to authorize refresh"),
):
    """
    Trigger a Sharenet SENS scrape. Protected by CRON_SECRET env var.
    Called by Railway cron service at 12:00 and 17:00 SAST Mon-Fri.
    Scrapes today's director dealing announcements and adds new deals.
    """
    expected = os.environ.get("CRON_SECRET", "")
    if not expected or secret != expected:
        raise HTTPException(403, "Invalid secret")

    import threading
    from pipeline import run_pipeline

    def _run():
        try:
            # Clean up any deals with bad director names (announcement titles instead of person names)
            bad_patterns = [
                "Dealings in securities%", "Directors' Dealings%", "Directors Dealings%",
                "Dealing in securities%", "Dealing In %",
                "%person discharging managerial%",
                "%managerial responsibilities%",
                "Initial notification%",
                "%according to MAR%",
            ]
            with get_db() as conn:
                with conn.cursor() as cur:
                    for pattern in bad_patterns:
                        cur.execute("DELETE FROM director_deals WHERE director ILIKE %s", (pattern,))
                    # Clean up bogus tickers (e.g. "ON" from bad extraction)
                    cur.execute("DELETE FROM director_deals WHERE ticker = 'ON'")
                    cur.execute("DELETE FROM raw_announcements WHERE ticker = 'ON'")
                    cur.execute("DELETE FROM companies WHERE ticker = 'ON' AND name NOT ILIKE '%%ON%%'")
                    # Clean up Brazilian B3 data that shouldn't be in JSE feed
                    # Delete everything pre-2025 (all Brazilian), CNPJ tickers, B3 tickers ending in digit
                    cur.execute("DELETE FROM director_deals WHERE transaction_date < '2025-01-01'")
                    cur.execute("DELETE FROM director_deals WHERE market = 'B3'")
                    cur.execute("DELETE FROM director_deals WHERE ticker ~ '^[0-9]'")
                    cur.execute("DELETE FROM director_deals WHERE ticker ~ '[0-9]$' AND length(ticker) >= 4")
                    cur.execute("DELETE FROM companies WHERE market = 'B3'")
                    cur.execute("DELETE FROM companies WHERE ticker ~ '^[0-9]' OR (ticker ~ '[0-9]$' AND length(ticker) >= 4)")
                    # Delete Moneyweb raw_announcements that have no usable text (paywalled)
                    cur.execute("DELETE FROM raw_announcements WHERE url LIKE '%%moneyweb.co.za%%' AND length(full_text) < 200")
                    # Fix exchange for EUR-currency deals (NEPI Rockcastle → AMS)
                    cur.execute("UPDATE director_deals SET exchange = 'AMS' WHERE currency = 'EUR' AND exchange = 'JSE'")
                    # Deduplicate: remove deals that duplicate an existing record
                    # (same director, source_url, shares, price, date, type)
                    cur.execute("""
                        DELETE FROM director_deals WHERE id IN (
                            SELECT a.id FROM director_deals a
                            JOIN director_deals b ON a.director = b.director
                                AND a.source_url = b.source_url
                                AND a.shares = b.shares
                                AND a.price = b.price
                                AND a.transaction_date = b.transaction_date
                                AND a.transaction_type = b.transaction_type
                                AND a.id > b.id
                        )
                    """)
                    # Also remove Buy/Sell duplicates of records already classified as Transfer
                    cur.execute("""
                        DELETE FROM director_deals WHERE id IN (
                            SELECT a.id FROM director_deals a
                            JOIN director_deals b ON a.director = b.director
                                AND a.source_url = b.source_url
                                AND a.shares = b.shares
                                AND a.price = b.price
                                AND a.transaction_date = b.transaction_date
                                AND a.id != b.id
                                AND a.transaction_type IN ('Buy', 'Sell')
                                AND b.transaction_type = 'Transfer'
                        )
                    """)
                    # Reclassify offsetting Buy/Sell pairs as Transfer (same director, same shares, same price, same source)
                    cur.execute("""
                        UPDATE director_deals SET transaction_type = 'Transfer'
                        WHERE id IN (
                            SELECT a.id FROM director_deals a
                            JOIN director_deals b ON a.director = b.director
                                AND a.source_url = b.source_url
                                AND a.shares = b.shares
                                AND a.price = b.price
                                AND a.transaction_date = b.transaction_date
                                AND a.id != b.id
                                AND a.transaction_type IN ('Buy', 'Sell')
                                AND b.transaction_type IN ('Buy', 'Sell')
                                AND a.transaction_type != b.transaction_type
                        )
                    """)
                conn.commit()
                logger.info("Cleaned up bad director name records and bogus tickers")

            run_pipeline()
            logger.info("Refresh complete")
        except Exception as e:
            logger.error(f"Refresh failed: {e}")

    threading.Thread(target=_run, daemon=True).start()
    return {"status": "started"}


@app.api_route("/api/brazil/backfill", methods=["GET", "POST"])
async def brazil_backfill(
    secret: str = Query(..., description="CRON_SECRET to authorize"),
    year: Optional[int] = Query(None, description="Single year to load (default: all 2018-2026)"),
    clean: bool = Query(False, description="Delete all existing B3 data before importing"),
):
    """
    Load Brazilian insider trading data from CVM into the database.
    Protected by CRON_SECRET. Runs in background thread.
    Add &clean=true to wipe existing B3 data first (for re-importing with fixes).

    Usage:
      POST /api/brazil/backfill?secret=YOUR_SECRET           → all years 2018-2026
      POST /api/brazil/backfill?secret=YOUR_SECRET&year=2025  → single year
    """
    expected = os.environ.get("CRON_SECRET", "")
    if not expected or secret != expected:
        raise HTTPException(403, "Invalid secret")

    import threading

    should_clean = clean  # capture in closure

    def _run():
        try:
            from brazil_adapter import fetch_company_registry, fetch_trades, fetch_ticker_mapping, store_in_db

            # Optionally wipe existing B3 data for a clean re-import
            if should_clean:
                logger.info("Cleaning existing B3 data before re-import...")
                with get_db() as conn:
                    with conn.cursor() as cur:
                        cur.execute("DELETE FROM director_deals WHERE market = 'B3'")
                        deleted_deals = cur.rowcount
                        cur.execute("DELETE FROM companies WHERE market = 'B3'")
                        deleted_companies = cur.rowcount
                    conn.commit()
                logger.info(f"Deleted {deleted_deals} B3 deals and {deleted_companies} B3 companies")

            companies = fetch_company_registry()
            ticker_map = fetch_ticker_mapping()

            if year:
                years = [year]
            else:
                years = list(range(2018, 2027))

            total_inserted = 0
            for y in years:
                deals = fetch_trades(y)
                if deals:
                    stats = store_in_db(deals, companies, DATABASE_URL, ticker_map)
                    total_inserted += stats["deals_inserted"]
                    logger.info(f"Brazil {y}: {stats['deals_inserted']} inserted, {stats['deals_skipped_dup']} skipped")

            logger.info(f"Brazil backfill complete: {total_inserted} total deals inserted")
        except Exception as e:
            logger.error(f"Brazil backfill failed: {e}")
            import traceback
            logger.error(traceback.format_exc())

    threading.Thread(target=_run, daemon=True).start()
    return {"status": "started", "years": [year] if year else list(range(2018, 2027))}


@app.api_route("/api/cleanup/bad-directors", methods=["GET", "POST"])
async def cleanup_bad_directors(
    secret: str = Query(..., description="CRON_SECRET to authorize"),
):
    """
    Delete deals where the director name is actually an announcement title
    (e.g. 'Dealings in securities by...', 'Directors' Dealings').
    Also delete deals from excluded categories (share trust, major subsidiary).
    """
    expected = os.environ.get("CRON_SECRET", "")
    if not expected or secret != expected:
        raise HTTPException(403, "Invalid secret")

    bad_patterns = [
        "Dealings in securities%",
        "Directors' Dealings%",
        "Directors Dealings%",
        "Dealing in securities%",
        "Dealing In %",
        "%person discharging managerial%",
        "%managerial responsibilities%",
    ]

    with get_db() as conn:
        total_deleted = 0
        with conn.cursor() as cur:
            for pattern in bad_patterns:
                cur.execute(
                    "DELETE FROM director_deals WHERE director ILIKE %s",
                    (pattern,)
                )
                total_deleted += cur.rowcount
            # Delete all pre-2025 data (Brazilian B3 junk)
            cur.execute("DELETE FROM director_deals WHERE transaction_date < '2025-01-01'")
            total_deleted += cur.rowcount
            # Delete CNPJ-style tickers and B3 tickers ending in digit
            cur.execute("DELETE FROM director_deals WHERE ticker ~ '^[0-9]'")
            total_deleted += cur.rowcount
            cur.execute("DELETE FROM director_deals WHERE ticker ~ '[0-9]$' AND length(ticker) >= 4")
            total_deleted += cur.rowcount
            # Clean up companies table too
            cur.execute("DELETE FROM companies WHERE market = 'B3'")
            cur.execute("DELETE FROM companies WHERE ticker ~ '^[0-9]' OR (ticker ~ '[0-9]$' AND length(ticker) >= 4)")
            # Also delete from raw_announcements to prevent re-ingestion
            cur.execute("DELETE FROM raw_announcements WHERE ticker ~ '^[0-9]' OR (ticker ~ '[0-9]$' AND length(ticker) >= 4)")
            cur.execute("DELETE FROM raw_announcements WHERE source = 'B3'")
            # Delete Moneyweb raw_announcements that have no usable text (paywalled)
            cur.execute("DELETE FROM raw_announcements WHERE url LIKE '%%moneyweb.co.za%%' AND length(full_text) < 200")
            # Fix exchange for EUR-currency deals (NEPI Rockcastle → AMS)
            cur.execute("UPDATE director_deals SET exchange = 'AMS' WHERE currency = 'EUR' AND exchange = 'JSE'")
        conn.commit()

    return {"status": "done", "deals_deleted": total_deleted}


@app.api_route("/api/cleanup/dedup", methods=["GET", "POST"])
async def cleanup_dedup(
    secret: str = Query(..., description="CRON_SECRET to authorize"),
    ticker: str = Query("", description="Optional ticker to limit dedup to"),
):
    """Remove duplicate deals and reclassify offsetting Buy/Sell pairs as Transfer."""
    expected = os.environ.get("CRON_SECRET", "")
    if not expected or secret != expected:
        raise HTTPException(403, "Invalid secret")

    with get_db() as conn:
        with conn.cursor() as cur:
            tc = " AND a.ticker = %s" if ticker else ""
            params = (ticker.upper(),) if ticker else ()

            # Remove exact duplicates (same director, source, shares, price, date, type — keep lowest ID)
            cur.execute("""
                DELETE FROM director_deals WHERE id IN (
                    SELECT a.id FROM director_deals a
                    JOIN director_deals b ON a.director = b.director
                        AND a.source_url = b.source_url
                        AND a.shares = b.shares
                        AND a.price = b.price
                        AND a.transaction_date = b.transaction_date
                        AND a.transaction_type = b.transaction_type
                        AND a.id > b.id
                    WHERE 1=1""" + tc + ")", params)
            dupes_deleted = cur.rowcount

            # Remove Buy/Sell records that duplicate existing Transfer records
            cur.execute("""
                DELETE FROM director_deals WHERE id IN (
                    SELECT a.id FROM director_deals a
                    JOIN director_deals b ON a.director = b.director
                        AND a.source_url = b.source_url
                        AND a.shares = b.shares
                        AND a.price = b.price
                        AND a.transaction_date = b.transaction_date
                        AND a.id != b.id
                        AND a.transaction_type IN ('Buy', 'Sell')
                        AND b.transaction_type = 'Transfer'
                    WHERE 1=1""" + tc + ")", params)
            transfer_dupes_deleted = cur.rowcount

            # Reclassify offsetting Buy/Sell pairs as Transfer
            cur.execute("""
                UPDATE director_deals SET transaction_type = 'Transfer'
                WHERE id IN (
                    SELECT a.id FROM director_deals a
                    JOIN director_deals b ON a.director = b.director
                        AND a.source_url = b.source_url
                        AND a.shares = b.shares
                        AND a.price = b.price
                        AND a.transaction_date = b.transaction_date
                        AND a.id != b.id
                        AND a.transaction_type IN ('Buy', 'Sell')
                        AND b.transaction_type IN ('Buy', 'Sell')
                        AND a.transaction_type != b.transaction_type
                    WHERE 1=1""" + tc + ")", params)
            reclassified = cur.rowcount

        conn.commit()

    return {
        "status": "done",
        "ticker": ticker or "all",
        "exact_dupes_deleted": dupes_deleted,
        "transfer_dupes_deleted": transfer_dupes_deleted,
        "reclassified_as_transfer": reclassified,
    }


@app.api_route("/api/reparse", methods=["GET", "POST"])
async def reparse_raw_announcements(
    secret: str = Query(..., description="CRON_SECRET to authorize"),
):
    """
    Re-parse all raw_announcements with the current parser.
    Deletes existing deals for those tickers/dates and re-inserts with fixed parsing.
    Use this to recover data after parser fixes.
    """
    expected = os.environ.get("CRON_SECRET", "")
    if not expected or secret != expected:
        raise HTTPException(403, "Invalid secret")

    from parser import SENSParser
    from scraper import SharenetScraper
    from dataclasses import asdict
    from companies import JSE_TOP_40
    import re

    scraper = SharenetScraper()
    anthropic_key = os.environ.get("ANTHROPIC_API_KEY")
    parser = SENSParser(anthropic_api_key=anthropic_key)
    known_companies = {c["ticker"]: c for c in JSE_TOP_40}

    results = {"reparsed": 0, "deals_inserted": 0, "errors": []}

    with get_db() as conn:
        # Get all raw announcements
        rows = query(conn, "SELECT id, ticker, company, title, date, url, full_text FROM raw_announcements ORDER BY date DESC")

        for row in rows:
            try:
                full_text = row["full_text"]
                if not full_text:
                    continue

                # Re-extract ticker from text (parser may have been wrong before)
                ticker = row["ticker"] or scraper._extract_ticker_from_text(full_text)
                company = row["company"]
                if ticker and ticker in known_companies:
                    company = known_companies[ticker]["name"]

                # Ensure company exists
                if ticker:
                    sector = known_companies.get(ticker, {}).get("sector", "")
                    with conn.cursor() as cur:
                        cur.execute(
                            "INSERT INTO companies (ticker, name, sector) "
                            "VALUES (%s, %s, %s) ON CONFLICT (ticker) DO NOTHING",
                            (ticker, company or ticker, sector),
                        )
                    conn.commit()

                # Parse
                deals = parser.parse(full_text, ticker=ticker, company=company)
                deals = [d for d in deals if d.transaction_type in ("Buy", "Sell", "Vesting", "TaxSale", "OptionsExercise", "HedgeSettlement")]

                if deals and ticker:
                    # Delete old deals from this source URL so we get fresh parses
                    with conn.cursor() as cur:
                        cur.execute(
                            "DELETE FROM director_deals WHERE source_url = %s",
                            (row["url"],)
                        )
                        results["deals_deleted"] = results.get("deals_deleted", 0) + cur.rowcount
                    conn.commit()

                for deal in deals:
                    deal_dict = asdict(deal)
                    deal_dict["ticker"] = ticker
                    deal_dict["company"] = company
                    deal_dict["announcement_date"] = str(row["date"]) if row["date"] else None
                    deal_dict["source_url"] = row["url"]

                    # Validate date before using in query
                    tx_date = deal_dict["transaction_date"] or None
                    if tx_date:
                        import re as _re
                        if not _re.match(r'^\d{4}-\d{2}-\d{2}$', str(tx_date)):
                            tx_date = None  # Invalid date format, set to NULL

                    with conn.cursor() as cur:
                        cur.execute("""
                            INSERT INTO director_deals
                            (ticker, company, director, role, transaction_date, announcement_date,
                             transaction_type, shares, price, value, class_of_securities,
                             nature_of_interest, clearance_received, source_url, confidence,
                             currency, exchange)
                            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                        """, (
                            deal_dict["ticker"], deal_dict["company"],
                            deal_dict["director"], deal_dict["role"],
                            tx_date,
                            deal_dict.get("announcement_date") or None,
                            deal_dict["transaction_type"], deal_dict["shares"],
                            deal_dict["price"], deal_dict["value"],
                            deal_dict["class_of_securities"],
                            deal_dict["nature_of_interest"],
                            deal_dict["clearance_received"],
                            deal_dict.get("source_url", ""),
                            deal_dict["confidence"],
                            deal_dict.get("currency", "ZAR"),
                            deal_dict.get("exchange", "JSE"),
                        ))
                        results["deals_inserted"] += 1
                    conn.commit()

                results["reparsed"] += 1
            except Exception as e:
                results["errors"].append(f"{row.get('ticker','?')}: {str(e)}")
                try:
                    conn.rollback()
                except Exception:
                    pass

        # Deduplicate: remove duplicate deals keeping the lowest id
        with conn.cursor() as cur:
            cur.execute("""
                DELETE FROM director_deals a USING director_deals b
                WHERE a.id > b.id
                AND a.ticker = b.ticker
                AND a.director = b.director
                AND a.transaction_date = b.transaction_date
                AND a.transaction_type = b.transaction_type
                AND a.shares = b.shares
            """)
            results["duplicates_removed"] = cur.rowcount
        conn.commit()

    return results


@app.get("/api/debug/raw-tickers")
async def debug_raw_tickers(secret: str = Query(...)):
    """List distinct tickers in raw_announcements for debugging."""
    expected = os.environ.get("CRON_SECRET", "")
    if not expected or secret != expected:
        raise HTTPException(403, "Invalid secret")
    with get_db() as conn:
        rows = query(conn, "SELECT DISTINCT ticker, count(*) as cnt FROM raw_announcements GROUP BY ticker ORDER BY ticker")
        return {"tickers": {r["ticker"]: r["cnt"] for r in rows}}


@app.get("/api/debug/test-parse")
async def debug_test_parse(secret: str = Query(...), ticker: str = Query(...)):
    """Test parsing raw_announcements for a specific ticker — shows why deals may be missing."""
    expected = os.environ.get("CRON_SECRET", "")
    if not expected or secret != expected:
        raise HTTPException(403, "Invalid secret")

    from parser import SENSParser
    from dataclasses import asdict

    parser = SENSParser()
    results = []

    with get_db() as conn:
        rows = query(conn, "SELECT id, ticker, company, title, url, full_text FROM raw_announcements WHERE ticker = %s", (ticker,))
        for row in rows:
            full_text = row["full_text"] or ""
            try:
                deals = parser.parse(full_text, ticker=row["ticker"], company=row["company"])
                valid = [d for d in deals if d.transaction_type in ("Buy", "Sell", "Vesting", "TaxSale", "OptionsExercise", "HedgeSettlement")]
                results.append({
                    "raw_id": row["id"],
                    "title": row["title"],
                    "url": row["url"],
                    "text_length": len(full_text),
                    "text_preview": full_text[:2000],
                    "total_parsed": len(deals),
                    "valid_deals": len(valid),
                    "deals": [asdict(d) for d in valid],
                    "all_deals_raw": [{"director": d.director, "type": d.transaction_type, "date": d.transaction_date, "shares": d.shares} for d in deals],
                })
            except Exception as e:
                results.append({
                    "raw_id": row["id"],
                    "title": row["title"],
                    "error": str(e),
                    "text_preview": full_text[:500],
                })

    return {"ticker": ticker, "raw_count": len(rows), "results": results}


@app.api_route("/api/ingest-url", methods=["GET", "POST"])
async def ingest_url(
    secret: str = Query(..., description="CRON_SECRET to authorize"),
    url: str = Query(..., description="Sharenet SENS article URL to ingest"),
    ticker: str = Query("", description="JSE ticker code"),
    company: str = Query("", description="Company name"),
    date: str = Query("", description="Announcement date YYYY-MM-DD"),
):
    """Manually ingest a SENS announcement from its Sharenet URL."""
    expected = os.environ.get("CRON_SECRET", "")
    if not expected or secret != expected:
        raise HTTPException(403, "Invalid secret")

    from scraper import SharenetScraper
    from parser import SENSParser
    from dataclasses import asdict

    scraper = SharenetScraper()
    full_text = scraper.extract(url)
    if not full_text:
        return {"error": "Could not fetch announcement text from URL"}

    # Extract ticker from text if not provided
    if not ticker:
        ticker = scraper._extract_ticker_from_text(full_text)
    if not ticker:
        return {"error": "Could not determine ticker — provide it via ?ticker=XXX"}

    parser = SENSParser(anthropic_api_key=os.environ.get("ANTHROPIC_API_KEY"))
    deals = parser.parse(full_text, ticker=ticker, company=company)
    deals = [d for d in deals if d.transaction_type in ("Buy", "Sell")]

    results = {"ticker": ticker, "company": company, "deals_inserted": 0, "deals_found": len(deals)}

    with get_db() as conn:
        # Ensure company exists
        if ticker:
            with conn.cursor() as cur:
                cur.execute(
                    "INSERT INTO companies (ticker, name, sector) "
                    "VALUES (%s, %s, %s) ON CONFLICT (ticker) DO NOTHING",
                    (ticker, company or ticker, ""),
                )
            conn.commit()

        # Store raw announcement
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO raw_announcements (ticker, company, title, date, url, full_text, source)
                VALUES (%s, %s, %s, %s, %s, %s, %s) ON CONFLICT (url) DO NOTHING
            """, (ticker, company, f"Manual ingest: {ticker}", date or None, url, full_text, "sharenet"))
        conn.commit()

        # Store parsed deals
        for deal in deals:
            deal_dict = asdict(deal)
            deal_dict["ticker"] = ticker
            deal_dict["company"] = company or ticker
            deal_dict["announcement_date"] = date or None
            deal_dict["source_url"] = url
            deal_dict.setdefault("currency", "ZAR")
            deal_dict.setdefault("exchange", "JSE")

            tx_date = deal_dict["transaction_date"] or None
            if tx_date:
                import re as _re
                if not _re.match(r'^\d{4}-\d{2}-\d{2}$', str(tx_date)):
                    tx_date = None

            with conn.cursor() as cur:
                cur.execute("""
                    SELECT id FROM director_deals
                    WHERE ticker=%s AND director=%s
                      AND (transaction_date=%s OR (transaction_date IS NULL AND %s IS NULL))
                      AND shares=%s AND transaction_type=%s
                """, (deal_dict["ticker"], deal_dict["director"], tx_date, tx_date,
                      deal_dict["shares"], deal_dict["transaction_type"]))
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
                    deal_dict["ticker"], deal_dict["company"],
                    deal_dict["director"], deal_dict["role"],
                    tx_date, deal_dict.get("announcement_date"),
                    deal_dict["transaction_type"], deal_dict["shares"],
                    deal_dict["price"], deal_dict["value"],
                    deal_dict["class_of_securities"],
                    deal_dict["nature_of_interest"],
                    deal_dict["clearance_received"],
                    deal_dict.get("source_url", ""),
                    deal_dict["confidence"],
                    deal_dict.get("currency", "ZAR"),
                    deal_dict.get("exchange", "JSE"),
                ))
                results["deals_inserted"] += 1
        conn.commit()

    return results


@app.get("/api/debug/scrape-test")
async def debug_scrape_test(
    secret: str = Query(..., description="CRON_SECRET to authorize"),
):
    """
    Debug endpoint: runs a small synchronous scrape and returns results.
    """
    expected = os.environ.get("CRON_SECRET", "")
    if not expected or secret != expected:
        raise HTTPException(403, "Invalid secret")

    results = {"steps": []}
    try:
        from scraper import SharenetScraper
        scraper = SharenetScraper()

        # Step 1: Discover today's dealing announcements
        results["steps"].append("Fetching Sharenet SENS listing...")
        links = scraper.discover()
        results["announcements_found"] = len(links)
        results["steps"].append(f"Found {len(links)} dealing announcements")

        if links:
            results["first_3"] = links[:3]

            # Step 2: Fetch first article
            first = links[0]
            results["steps"].append(f"Fetching: {first['title'][:60]}")
            full_text = scraper.extract(first["url"])

            if full_text:
                results["steps"].append(f"Article text: {len(full_text)} chars")
                results["article_preview"] = full_text[:500]

                # Step 3: Parse it
                from parser import SENSParser
                parser = SENSParser()
                deals = parser.parse(full_text, ticker=first.get("ticker", ""), company=first.get("company", ""))
                results["deals_parsed"] = len(deals)
                results["steps"].append(f"Parsed {len(deals)} deals")
                if deals:
                    from dataclasses import asdict
                    results["parsed_deals"] = [asdict(d) for d in deals]
            else:
                results["error"] = "Failed to extract article text"

    except Exception as e:
        import traceback
        results["error"] = str(e)
        results["traceback"] = traceback.format_exc()

    return results


# ─── Static Files ────────────────────────────────────────────────────────────

STATIC_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend", "dist")
if os.path.isdir(STATIC_DIR):
    assets = os.path.join(STATIC_DIR, "assets")
    if os.path.isdir(assets):
        app.mount("/assets", StaticFiles(directory=assets), name="assets")
    @app.get("/{path:path}")
    async def serve_frontend(path: str):
        fp = os.path.join(STATIC_DIR, path)
        return FileResponse(fp) if os.path.isfile(fp) else FileResponse(os.path.join(STATIC_DIR, "index.html"))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api:app", host="0.0.0.0", port=int(os.environ.get("PORT", 8000)), reload=True)
