"""
JSE Top 40 Company Registry
Maps each company to its ticker, sector, and scrapable data sources.

Sources prioritised:
  1. Listcorp.com — free, full SENS text, consistent URL structure
  2. Company IR pages — direct from source, format varies
  3. InceConnect — free SENS republisher
"""

JSE_TOP_40 = [
    # ── Technology ──────────────────────────────────────────────
    {
        "ticker": "NPN",
        "name": "Naspers",
        "sector": "Technology",
        "listcorp": "https://www.listcorp.com/jse/npn/naspers-limited",
        "ir_page": "https://www.naspers.com/investors",
        "ir_sens": "https://www.naspers.com/news-insights/regulatory-updates",
        "notes": "Publishes director dealings directly on naspers.com"
    },
    {
        "ticker": "PRX",
        "name": "Prosus",
        "sector": "Technology",
        "listcorp": "https://www.listcorp.com/jse/prx/prosus-nv",
        "ir_page": "https://www.prosus.com/investors",
        "ir_sens": "https://www.prosus.com/news",
    },
    # ── Financials ──────────────────────────────────────────────
    {
        "ticker": "CPI",
        "name": "Capitec",
        "sector": "Financials",
        "listcorp": "https://www.listcorp.com/jse/cpi/capitec-bank-holdings-limited",
        "ir_page": "https://www.capitecbank.co.za/investor-relations",
        "ir_sens": None,
        "notes": "IR page has results but SENS usually via Listcorp/Sharenet"
    },
    {
        "ticker": "FSR",
        "name": "FirstRand",
        "sector": "Financials",
        "listcorp": "https://www.listcorp.com/jse/fsr/firstrand-limited",
        "ir_page": "https://www.firstrand.co.za/investors/",
        "ir_sens": None,
    },
    {
        "ticker": "SBK",
        "name": "Standard Bank",
        "sector": "Financials",
        "listcorp": "https://www.listcorp.com/jse/sbk/standard-bank-group-limited",
        "ir_page": "https://www.standardbank.com/sbg/standard-bank-group/investor-relations",
        "ir_sens": None,
    },
    {
        "ticker": "ABG",
        "name": "Absa Group",
        "sector": "Financials",
        "listcorp": "https://www.listcorp.com/jse/abg/absa-group-limited",
        "ir_page": "https://www.absa.africa/investor-relations/",
        "ir_sens": None,
    },
    {
        "ticker": "NED",
        "name": "Nedbank",
        "sector": "Financials",
        "listcorp": "https://www.listcorp.com/jse/ned/nedbank-group-limited",
        "ir_page": "https://www.nedbank.co.za/content/nedbank/desktop/gt/en/aboutus/investor-centre.html",
        "ir_sens": None,
    },
    {
        "ticker": "DSY",
        "name": "Discovery",
        "sector": "Financials",
        "listcorp": "https://www.listcorp.com/jse/dsy/discovery-limited",
        "ir_page": "https://www.discovery.co.za/corporate/investor-relations",
        "ir_sens": None,
    },
    {
        "ticker": "SLM",
        "name": "Sanlam",
        "sector": "Financials",
        "listcorp": "https://www.listcorp.com/jse/slm/sanlam-limited",
        "ir_page": "https://www.sanlam.com/investors/",
        "ir_sens": None,
    },
    {
        "ticker": "OMU",
        "name": "Old Mutual",
        "sector": "Financials",
        "listcorp": "https://www.listcorp.com/jse/omu/old-mutual-limited",
        "ir_page": "https://www.oldmutual.com/investor-relations",
        "ir_sens": None,
    },
    {
        "ticker": "INP",
        "name": "Investec",
        "sector": "Financials",
        "listcorp": "https://www.listcorp.com/jse/inp/investec-plc",
        "ir_page": "https://www.investec.com/en_za/welcome-to-investec/about-us/investor-relations.html",
        "ir_sens": None,
    },
    {
        "ticker": "RMI",
        "name": "Rand Merchant Investment",
        "sector": "Financials",
        "listcorp": "https://www.listcorp.com/jse/rmi/rmi-holdings-limited",
        "ir_page": None,
        "ir_sens": None,
    },
    # ── Resources / Mining ──────────────────────────────────────
    {
        "ticker": "AGL",
        "name": "Anglo American",
        "sector": "Resources",
        "listcorp": "https://www.listcorp.com/jse/agl/anglo-american-plc",
        "ir_page": "https://www.angloamerican.com/investors",
        "ir_sens": None,
    },
    {
        "ticker": "BHG",
        "name": "BHP Group",
        "sector": "Resources",
        "listcorp": "https://www.listcorp.com/jse/bhg/bhp-group-limited",
        "ir_page": "https://www.bhp.com/investors",
        "ir_sens": None,
    },
    {
        "ticker": "GLN",
        "name": "Glencore",
        "sector": "Resources",
        "listcorp": "https://www.listcorp.com/jse/gln/glencore-plc",
        "ir_page": "https://www.glencore.com/investors",
        "ir_sens": None,
    },
    {
        "ticker": "AMS",
        "name": "Anglo American Platinum",
        "sector": "Resources",
        "listcorp": "https://www.listcorp.com/jse/ams/anglo-american-platinum-limited",
        "ir_page": "https://www.angloamericanplatinum.com/investors",
        "ir_sens": None,
    },
    {
        "ticker": "IMP",
        "name": "Impala Platinum",
        "sector": "Resources",
        "listcorp": "https://www.listcorp.com/jse/imp/impala-platinum-holdings-limited",
        "ir_page": "https://www.implats.co.za/investor-centre.php",
        "ir_sens": None,
    },
    {
        "ticker": "SSW",
        "name": "Sibanye-Stillwater",
        "sector": "Resources",
        "listcorp": "https://www.listcorp.com/jse/ssw/sibanye-stillwater-limited",
        "ir_page": "https://www.sibanyestillwater.com/investors/",
        "ir_sens": None,
    },
    {
        "ticker": "SOL",
        "name": "Sasol",
        "sector": "Resources",
        "listcorp": "https://www.listcorp.com/jse/sol/sasol-limited",
        "ir_page": "https://www.sasol.com/investors",
        "ir_sens": None,
    },
    {
        "ticker": "GFI",
        "name": "Gold Fields",
        "sector": "Resources",
        "listcorp": "https://www.listcorp.com/jse/gfi/gold-fields-limited",
        "ir_page": "https://www.goldfields.com/investors.php",
        "ir_sens": None,
    },
    {
        "ticker": "EXX",
        "name": "Exxaro Resources",
        "sector": "Resources",
        "listcorp": "https://www.listcorp.com/jse/exx/exxaro-resources-limited",
        "ir_page": "https://www.exxaro.com/investors",
        "ir_sens": None,
    },
    {
        "ticker": "KIO",
        "name": "Kumba Iron Ore",
        "sector": "Resources",
        "listcorp": "https://www.listcorp.com/jse/kio/kumba-iron-ore-limited",
        "ir_page": "https://www.angloamericankumba.com/investors",
        "ir_sens": None,
    },
    # ── Consumer ────────────────────────────────────────────────
    {
        "ticker": "SHP",
        "name": "Shoprite",
        "sector": "Consumer Staples",
        "listcorp": "https://www.listcorp.com/jse/shp/shoprite-holdings-limited",
        "ir_page": "https://www.shopriteholdings.co.za/investors.html",
        "ir_sens": None,
        "notes": "Director dealings via Listcorp; IR page has results/reports"
    },
    {
        "ticker": "WHL",
        "name": "Woolworths",
        "sector": "Consumer Discretionary",
        "listcorp": "https://www.listcorp.com/jse/whl/woolworths-holdings-limited",
        "ir_page": "https://www.woolworthsholdings.co.za/investors/",
        "ir_sens": None,
    },
    {
        "ticker": "CLS",
        "name": "Clicks Group",
        "sector": "Consumer Staples",
        "listcorp": "https://www.listcorp.com/jse/cls/clicks-group-limited",
        "ir_page": "https://www.clicksgroup.co.za/investor-centre.html",
        "ir_sens": None,
    },
    {
        "ticker": "MRP",
        "name": "Mr Price",
        "sector": "Consumer Discretionary",
        "listcorp": "https://www.listcorp.com/jse/mrp/mr-price-group-limited",
        "ir_page": "https://www.mrpricegroup.com/mr-price-group-investor-relations.aspx",
        "ir_sens": None,
    },
    {
        "ticker": "PPH",
        "name": "Pepkor",
        "sector": "Consumer Discretionary",
        "listcorp": "https://www.listcorp.com/jse/pph/pepkor-holdings-limited",
        "ir_page": "https://www.pepkor.co.za/investors/",
        "ir_sens": None,
    },
    {
        "ticker": "BTI",
        "name": "British American Tobacco",
        "sector": "Consumer Staples",
        "listcorp": "https://www.listcorp.com/jse/bti/british-american-tobacco-plc",
        "ir_page": "https://www.bat.com/investors",
        "ir_sens": None,
    },
    {
        "ticker": "APN",
        "name": "Aspen Pharmacare",
        "sector": "Healthcare",
        "listcorp": "https://www.listcorp.com/jse/apn/aspen-pharmacare-holdings-limited",
        "ir_page": "https://www.aspenpharma.com/investor-relations/",
        "ir_sens": None,
    },
    # ── Telecoms ────────────────────────────────────────────────
    {
        "ticker": "MTN",
        "name": "MTN Group",
        "sector": "Telecoms",
        "listcorp": "https://www.listcorp.com/jse/mtn/mtn-group-limited",
        "ir_page": "https://www.mtn.com/investors/",
        "ir_sens": None,
    },
    {
        "ticker": "VOD",
        "name": "Vodacom",
        "sector": "Telecoms",
        "listcorp": "https://www.listcorp.com/jse/vod/vodacom-group-limited",
        "ir_page": "https://www.vodacom.com/investor-relations.php",
        "ir_sens": None,
    },
    # ── Industrials / Other ─────────────────────────────────────
    {
        "ticker": "REM",
        "name": "Remgro",
        "sector": "Industrials",
        "listcorp": "https://www.listcorp.com/jse/rem/remgro-limited",
        "ir_page": "https://www.remgro.com/investors/",
        "ir_sens": None,
    },
    {
        "ticker": "BID",
        "name": "Bid Corporation",
        "sector": "Industrials",
        "listcorp": "https://www.listcorp.com/jse/bid/bid-corporation-limited",
        "ir_page": "https://www.bidcorp.com/investors.php",
        "ir_sens": None,
    },
    {
        "ticker": "MNP",
        "name": "Mondi",
        "sector": "Industrials",
        "listcorp": "https://www.listcorp.com/jse/mnp/mondi-plc",
        "ir_page": "https://www.mondigroup.com/investors",
        "ir_sens": None,
    },
    {
        "ticker": "CFR",
        "name": "Compagnie Financiere Richemont",
        "sector": "Consumer Discretionary",
        "listcorp": "https://www.listcorp.com/jse/cfr/compagnie-financiere-richemont-sa",
        "ir_page": "https://www.richemont.com/investors/",
        "ir_sens": None,
    },
    {
        "ticker": "ANH",
        "name": "Anheuser-Busch InBev",
        "sector": "Consumer Staples",
        "listcorp": "https://www.listcorp.com/jse/anh/anheuser-busch-inbev-sa-nv",
        "ir_page": "https://www.ab-inbev.com/investors/",
        "ir_sens": None,
    },
    {
        "ticker": "NPH",
        "name": "Northam Platinum",
        "sector": "Resources",
        "listcorp": "https://www.listcorp.com/jse/nph/northam-platinum-holdings-limited",
        "ir_page": "https://www.northam.co.za/investors-and-media",
        "ir_sens": None,
    },
    {
        "ticker": "MND",
        "name": "Mondi Ltd",
        "sector": "Industrials",
        "listcorp": "https://www.listcorp.com/jse/mnd/mondi-limited",
        "ir_page": "https://www.mondigroup.com/investors",
        "ir_sens": None,
    },
    {
        "ticker": "NRP",
        "name": "NEPI Rockcastle",
        "sector": "Real Estate",
        "listcorp": "https://www.listcorp.com/jse/nrp/nepi-rockcastle-plc",
        "ir_page": "https://www.nepirockcastle.com/investors",
        "ir_sens": None,
    },
    {
        "ticker": "GRT",
        "name": "Growthpoint Properties",
        "sector": "Real Estate",
        "listcorp": "https://www.listcorp.com/jse/grt/growthpoint-properties-limited",
        "ir_page": "https://www.growthpoint.co.za/Pages/Investors.aspx",
        "ir_sens": None,
    },
]


def get_by_ticker(ticker: str) -> dict | None:
    """Look up a company by JSE ticker code."""
    return next((c for c in JSE_TOP_40 if c["ticker"] == ticker), None)


def get_by_sector(sector: str) -> list[dict]:
    """Get all companies in a given sector."""
    return [c for c in JSE_TOP_40 if c["sector"] == sector]


def all_listcorp_urls() -> list[tuple[str, str]]:
    """Return (ticker, listcorp_news_url) pairs for scraping."""
    return [(c["ticker"], c["listcorp"] + "/news") for c in JSE_TOP_40]
