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

from fastapi import FastAPI, Query, HTTPException, Path
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

@contextmanager
def get_db():
    conn = psycopg2.connect(DATABASE_URL)
    try:
        yield conn
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

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

def row_to_deal(r: dict) -> DealResponse:
    d = dict(r)
    for k in ("transaction_date","announcement_date"):
        if d.get(k) and hasattr(d[k],"isoformat"): d[k] = d[k].isoformat()
    for k in ("price","value","confidence"):
        if d.get(k): d[k] = float(d[k])
    return DealResponse(**d)

# ─── Startup ─────────────────────────────────────────────────────────────────

@app.on_event("startup")
async def startup():
    if not DATABASE_URL:
        logger.error("DATABASE_URL not set!")
        return
    ensure_db()
    with get_db() as conn:
        if query_val(conn, "SELECT COUNT(*) FROM director_deals") == 0:
            logger.info("Empty DB — seeding mock data...")
            _seed_mock_data(conn)
    logger.info("Raven API started (PostgreSQL)")

@app.get("/api/health")
async def health():
    try:
        with get_db() as conn:
            count = query_val(conn, "SELECT COUNT(*) FROM director_deals")
        return {"status": "ok", "deals_in_db": count, "database": "postgresql"}
    except Exception as e:
        return JSONResponse(status_code=500, content={"status": "error", "detail": str(e)})

# ─── Deals ───────────────────────────────────────────────────────────────────

@app.get("/api/deals", response_model=PaginatedDeals)
async def get_deals(
    page: int=Query(1,ge=1), per_page: int=Query(50,ge=1,le=200),
    ticker: Optional[str]=None, director: Optional[str]=None,
    transaction_type: Optional[str]=Query(None,pattern="^(Buy|Sell|Vesting|TaxSale)$"),
    exclude_non_discretionary: bool=Query(True, description="Exclude vestings and tax sales"),
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
async def get_clusters(days: int=Query(30,ge=7,le=365), min_insiders: int=Query(2,ge=2,le=10)):
    with get_db() as conn:
        cutoff = (datetime.now()-timedelta(days=days)).strftime("%Y-%m-%d")
        raw = query(conn, """
            SELECT d.ticker, d.company, c.sector, COUNT(DISTINCT d.director) as cnt, SUM(d.value) as tv
            FROM director_deals d LEFT JOIN companies c ON d.ticker=c.ticker
            WHERE d.transaction_type='Buy' AND d.transaction_date>=%s
            GROUP BY d.ticker, d.company, c.sector HAVING COUNT(DISTINCT d.director)>=%s
            ORDER BY SUM(d.value) DESC
        """, (cutoff, min_insiders))
        clusters = []
        for r in raw:
            dirs = query(conn, "SELECT director,role,shares,price,value,transaction_date FROM director_deals WHERE ticker=%s AND transaction_type='Buy' AND transaction_date>=%s ORDER BY value DESC", (r["ticker"], cutoff))
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
async def get_sectors(days: int=Query(30,ge=7,le=365)):
    with get_db() as conn:
        cutoff = (datetime.now()-timedelta(days=days)).strftime("%Y-%m-%d")
        rows = query(conn, """
            SELECT c.sector,
                SUM(CASE WHEN d.transaction_type='Buy' THEN d.value ELSE 0 END) as bv,
                SUM(CASE WHEN d.transaction_type='Sell' THEN d.value ELSE 0 END) as sv,
                SUM(CASE WHEN d.transaction_type='Buy' THEN 1 ELSE 0 END) as bc,
                SUM(CASE WHEN d.transaction_type='Sell' THEN 1 ELSE 0 END) as sc,
                COUNT(*) as tc
            FROM director_deals d LEFT JOIN companies c ON d.ticker=c.ticker
            WHERE d.transaction_date>=%s AND c.sector IS NOT NULL
            GROUP BY c.sector ORDER BY (SUM(CASE WHEN d.transaction_type='Buy' THEN d.value ELSE 0 END)-SUM(CASE WHEN d.transaction_type='Sell' THEN d.value ELSE 0 END)) DESC
        """, (cutoff,))
        return [SectorFlow(sector=r["sector"],buy_value=float(r["bv"] or 0),sell_value=float(r["sv"] or 0),
            net_flow=float((r["bv"] or 0)-(r["sv"] or 0)),buy_count=r["bc"],sell_count=r["sc"],trade_count=r["tc"]) for r in rows]

# ─── Stats ───────────────────────────────────────────────────────────────────

@app.get("/api/stats", response_model=DashboardStats)
async def get_stats(days: int=Query(30,ge=7,le=365)):
    with get_db() as conn:
        cutoff = (datetime.now()-timedelta(days=days)).strftime("%Y-%m-%d")
        r = query_one(conn, """
            SELECT COUNT(*) as total,
                COALESCE(SUM(CASE WHEN transaction_type='Buy' THEN 1 ELSE 0 END),0) as buys,
                COALESCE(SUM(CASE WHEN transaction_type='Sell' THEN 1 ELSE 0 END),0) as sells,
                COALESCE(SUM(CASE WHEN transaction_type='Buy' THEN value ELSE 0 END),0) as bv,
                COALESCE(SUM(CASE WHEN transaction_type='Sell' THEN value ELSE 0 END),0) as sv,
                COUNT(DISTINCT ticker) as comps, COUNT(DISTINCT director) as dirs
            FROM director_deals WHERE transaction_date>=%s
        """, (cutoff,))
        bv, sv = float(r["bv"]), float(r["sv"])
        cc = query_val(conn, "SELECT COUNT(*) FROM (SELECT ticker FROM director_deals WHERE transaction_type='Buy' AND transaction_date>=%s GROUP BY ticker HAVING COUNT(DISTINCT director)>=2) sub", (cutoff,))
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

# ─── Companies ───────────────────────────────────────────────────────────────

@app.get("/api/companies", response_model=list[CompanyInfo])
async def get_companies(sector: Optional[str]=None, include_delisted: bool=False):
    with get_db() as conn:
        sql = "SELECT c.ticker,c.name,c.sector,c.status,c.last_scraped,COUNT(d.id) as deal_count FROM companies c LEFT JOIN director_deals d ON c.ticker=d.ticker"
        conds, params = [], []
        if sector:
            conds.append("c.sector=%s"); params.append(sector)
        if not include_delisted:
            conds.append("COALESCE(c.status, 'listed') != 'delisted'")
        if conds:
            sql += " WHERE " + " AND ".join(conds)
        sql += " GROUP BY c.ticker,c.name,c.sector,c.status,c.last_scraped ORDER BY c.name"
        rows = query(conn, sql, params)
        return [CompanyInfo(ticker=r["ticker"],name=r["name"],sector=r["sector"],
            status=r.get("status", "listed"),
            last_scraped=r["last_scraped"].isoformat() if r["last_scraped"] else None,
            deal_count=r["deal_count"]) for r in rows]

# ─── Seed ────────────────────────────────────────────────────────────────────

@app.post("/api/refresh")
async def refresh_endpoint(
    period: str = Query("week", pattern="^(week|month|3months|ytd|6months|1year)$"),
    secret: str = Query(..., description="CRON_SECRET to authorize refresh"),
):
    """
    Trigger a Moneyweb SENS scrape. Protected by CRON_SECRET env var.
    Called by Railway cron service at 12:00 and 17:00 SAST Mon-Fri.
    """
    expected = os.environ.get("CRON_SECRET", "")
    if not expected or secret != expected:
        raise HTTPException(403, "Invalid secret")

    import threading
    from pipeline import run_moneyweb_pipeline

    def _run():
        try:
            run_moneyweb_pipeline(period=period, max_pages=20)
            logger.info(f"Refresh complete (period={period})")
        except Exception as e:
            logger.error(f"Refresh failed: {e}")

    # Run in background thread so the endpoint returns immediately
    threading.Thread(target=_run, daemon=True).start()
    return {"status": "started", "period": period}

@app.post("/api/dev/seed")
async def seed_endpoint():
    with get_db() as conn:
        _seed_mock_data(conn)
    return {"status": "seeded"}

def _seed_mock_data(conn):
    from companies import JSE_TOP_40
    with conn.cursor() as cur:
        for c in JSE_TOP_40:
            cur.execute("INSERT INTO companies (ticker,name,sector,ir_url) VALUES (%s,%s,%s,%s) ON CONFLICT (ticker) DO NOTHING",
                (c["ticker"],c["name"],c["sector"],c.get("ir_page")))
        deals = [
            ("NPN","Naspers","Phuthi Mahanyele-Dabengwa","CEO","2026-02-28","Buy",12500,3842.50,48031250,"Direct"),
            ("NPN","Naspers","Basil Sgourdos","CFO","2026-02-28","Buy",8000,3845.00,30760000,"Direct"),
            ("NPN","Naspers","Ervin Tu","Non-Exec Director","2026-02-27","Buy",5000,3810.00,19050000,"Direct"),
            ("SBK","Standard Bank","Sim Tshabalala","CEO","2026-02-27","Sell",45000,218.30,9823500,"Direct"),
            ("SHP","Shoprite","Pieter Engelbrecht","CEO","2026-02-26","Buy",30000,268.45,8053500,"Direct"),
            ("SHP","Shoprite","Anton de Bruyn","CFO","2026-02-26","Buy",20000,267.90,5358000,"Direct"),
            ("FSR","FirstRand","Alan Gillespie","Chairman","2026-02-25","Buy",100000,72.15,7215000,"Direct"),
            ("AGL","Anglo American","Duncan Wanblad","CEO","2026-02-25","Sell",15000,485.20,7278000,"Direct"),
            ("MTN","MTN Group","Ralph Mupita","CEO","2026-02-24","Buy",55000,118.40,6512000,"Direct"),
            ("CPI","Capitec","Gerrie Fourie","CEO","2026-02-24","Buy",3000,2540.00,7620000,"Direct"),
            ("CPI","Capitec","Andre du Plessis","CFO","2026-02-23","Buy",2000,2535.00,5070000,"Direct"),
            ("SOL","Sasol","Fleetwood Grobler","CEO","2026-02-21","Sell",25000,142.80,3570000,"Direct"),
            ("DSY","Discovery","Adrian Gore","CEO","2026-02-21","Buy",40000,168.50,6740000,"Direct"),
            ("WHL","Woolworths","Roy Bagattini","CEO","2026-02-20","Buy",50000,62.30,3115000,"Direct"),
            ("ABG","Absa Group","Arrie Rautenbach","CEO","2026-02-20","Sell",35000,235.10,8228500,"Indirect"),
            ("BHG","BHP Group","Mike Henry","CEO","2026-02-19","Sell",10000,520.40,5204000,"Direct"),
            ("REM","Remgro","Jannie Durand","CEO","2026-02-19","Buy",22000,155.20,3414400,"Direct"),
            ("VOD","Vodacom","Shameel Joosub","CEO","2026-02-18","Buy",18000,98.60,1774800,"Direct"),
            ("SSW","Sibanye-Stillwater","Neal Froneman","CEO","2026-02-18","Buy",200000,22.45,4490000,"Direct"),
            ("CLS","Clicks Group","Bertina Engelbrecht","CEO","2026-02-17","Buy",8000,312.70,2501600,"Direct"),
            ("NED","Nedbank","Mike Brown","CEO","2026-02-14","Buy",15000,288.40,4326000,"Direct"),
            ("OMU","Old Mutual","Iain Williamson","CEO","2026-02-14","Buy",60000,12.85,771000,"Direct"),
            ("EXX","Exxaro","Nombasa Tsengwa","CEO","2026-02-13","Buy",10000,178.90,1789000,"Direct"),
            ("MRP","Mr Price","Mark Blair","CEO","2026-02-17","Sell",12000,205.80,2469600,"Direct"),
        ]
        for d in deals:
            cur.execute("INSERT INTO director_deals (ticker,company,director,role,transaction_date,transaction_type,shares,price,value,nature_of_interest,clearance_received,confidence) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,TRUE,1.0)", d)
    conn.commit()
    logger.info(f"Seeded {len(deals)} deals")

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
