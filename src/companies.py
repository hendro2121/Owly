"""
JSE Company Registry — 250+ ordinary share listings
Maps each company to its ticker, sector, and (for Top 40) scrapable data sources.

Companies are grouped by sector. Only ordinary shares are included
(no ETFs, preference shares, or debentures).

Sources prioritised for scraping (Top 40 only):
  1. Listcorp.com — free, full SENS text, consistent URL structure
  2. Company IR pages — direct from source, format varies
  3. InceConnect — free SENS republisher
"""

JSE_TOP_40 = [
    # ══════════════════════════════════════════════════════════════
    #  TECHNOLOGY
    # ══════════════════════════════════════════════════════════════
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
    {"ticker": "KRO", "name": "Karooooo", "sector": "Technology"},
    {"ticker": "BYI", "name": "Bytes Technology Group", "sector": "Technology"},
    {"ticker": "DTC", "name": "Datatec", "sector": "Technology"},
    {"ticker": "AEL", "name": "Altron", "sector": "Technology"},
    {"ticker": "PWR", "name": "PowerFleet", "sector": "Technology"},
    {"ticker": "LSK", "name": "Lesaka Technologies", "sector": "Technology"},
    {"ticker": "WVR", "name": "Weaver Fintech", "sector": "Technology"},
    {"ticker": "4SI", "name": "4Sight Holdings", "sector": "Technology"},
    {"ticker": "IOC", "name": "iOCO", "sector": "Technology"},
    {"ticker": "MST", "name": "Mustek", "sector": "Technology"},
    {"ticker": "ISA", "name": "ISA Holdings", "sector": "Technology"},

    # ══════════════════════════════════════════════════════════════
    #  FINANCIALS  (Banks, Insurance, Asset Management, Fintech)
    # ══════════════════════════════════════════════════════════════
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
    {"ticker": "OUT", "name": "OUTsurance Group", "sector": "Financials"},
    {"ticker": "SNT", "name": "Santam", "sector": "Financials"},
    {"ticker": "RNI", "name": "Reinet Investments", "sector": "Financials"},
    {"ticker": "QLT", "name": "Quilter", "sector": "Financials"},
    {"ticker": "MTM", "name": "Momentum Metropolitan", "sector": "Financials"},
    {"ticker": "N91", "name": "Ninety One", "sector": "Financials"},
    {"ticker": "KST", "name": "PSG Financial Services", "sector": "Financials"},
    {"ticker": "AFH", "name": "Alexander Forbes", "sector": "Financials"},
    {"ticker": "CML", "name": "Coronation Fund Managers", "sector": "Financials"},
    {"ticker": "SYG", "name": "Sygnia", "sector": "Financials"},
    {"ticker": "CLI", "name": "Clientele", "sector": "Financials"},
    {"ticker": "JSE", "name": "JSE Limited", "sector": "Financials"},
    {"ticker": "PPE", "name": "Purple Group", "sector": "Financials"},
    {"ticker": "FGL", "name": "Finbond Group", "sector": "Financials"},
    {"ticker": "RMH", "name": "RMB Holdings", "sector": "Financials"},
    {"ticker": "BAT", "name": "Brait", "sector": "Financials"},
    {"ticker": "VUN", "name": "Vunani", "sector": "Financials"},
    {"ticker": "BRN", "name": "Brimstone Investment Corporation", "sector": "Financials"},
    {"ticker": "SBP", "name": "Sabvest Capital", "sector": "Financials"},

    # ══════════════════════════════════════════════════════════════
    #  RESOURCES / MINING
    # ══════════════════════════════════════════════════════════════
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
    {
        "ticker": "NPH",
        "name": "Northam Platinum",
        "sector": "Resources",
        "listcorp": "https://www.listcorp.com/jse/nph/northam-platinum-holdings-limited",
        "ir_page": "https://www.northam.co.za/investors-and-media",
        "ir_sens": None,
    },
    {"ticker": "ANG", "name": "AngloGold Ashanti", "sector": "Resources"},
    {"ticker": "S32", "name": "South32", "sector": "Resources"},
    {"ticker": "HAR", "name": "Harmony Gold", "sector": "Resources"},
    {"ticker": "PAN", "name": "Pan African Resources", "sector": "Resources"},
    {"ticker": "DRD", "name": "DRDGOLD", "sector": "Resources"},
    {"ticker": "ARI", "name": "African Rainbow Minerals", "sector": "Resources"},
    {"ticker": "TGA", "name": "Thungela Resources", "sector": "Resources"},
    {"ticker": "APH", "name": "Alphamin Resources", "sector": "Resources"},
    {"ticker": "THA", "name": "Tharisa", "sector": "Resources"},
    {"ticker": "MRF", "name": "Merafe Resources", "sector": "Resources"},
    {"ticker": "JBL", "name": "Jubilee Metals Group", "sector": "Resources"},
    {"ticker": "GML", "name": "Gemfields Group", "sector": "Resources"},
    {"ticker": "ORN", "name": "Orion Minerals", "sector": "Resources"},
    {"ticker": "MCZ", "name": "MC Mining", "sector": "Resources"},
    {"ticker": "EPS", "name": "Eastern Platinum", "sector": "Resources"},
    {"ticker": "WEZ", "name": "Wesizwe Platinum", "sector": "Resources"},
    {"ticker": "SDL", "name": "Southern Palladium", "sector": "Resources"},
    {"ticker": "MDI", "name": "Master Drilling Group", "sector": "Resources"},
    {"ticker": "RNG", "name": "Randgold & Exploration", "sector": "Resources"},
    {"ticker": "ACL", "name": "ArcelorMittal South Africa", "sector": "Resources"},
    {"ticker": "HLM", "name": "Hulamin", "sector": "Resources"},

    # ══════════════════════════════════════════════════════════════
    #  ENERGY
    # ══════════════════════════════════════════════════════════════
    {
        "ticker": "SOL",
        "name": "Sasol",
        "sector": "Energy",
        "listcorp": "https://www.listcorp.com/jse/sol/sasol-limited",
        "ir_page": "https://www.sasol.com/investors",
        "ir_sens": None,
    },
    {"ticker": "MKR", "name": "Montauk Renewables", "sector": "Energy"},
    {"ticker": "KBO", "name": "Kibo Energy", "sector": "Energy"},
    {"ticker": "EEL", "name": "Efora Energy", "sector": "Energy"},

    # ══════════════════════════════════════════════════════════════
    #  CONSUMER STAPLES
    # ══════════════════════════════════════════════════════════════
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
        "ticker": "CLS",
        "name": "Clicks Group",
        "sector": "Consumer Staples",
        "listcorp": "https://www.listcorp.com/jse/cls/clicks-group-limited",
        "ir_page": "https://www.clicksgroup.co.za/investor-centre.html",
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
        "ticker": "ANH",
        "name": "Anheuser-Busch InBev",
        "sector": "Consumer Staples",
        "listcorp": "https://www.listcorp.com/jse/anh/anheuser-busch-inbev-sa-nv",
        "ir_page": "https://www.ab-inbev.com/investors/",
        "ir_sens": None,
    },
    {"ticker": "TBS", "name": "Tiger Brands", "sector": "Consumer Staples"},
    {"ticker": "AVI", "name": "AVI Limited", "sector": "Consumer Staples"},
    {"ticker": "PIK", "name": "Pick n Pay Stores", "sector": "Consumer Staples"},
    {"ticker": "SPP", "name": "The SPAR Group", "sector": "Consumer Staples"},
    {"ticker": "BOX", "name": "Boxer Retail", "sector": "Consumer Staples"},
    {"ticker": "DCP", "name": "Dis-Chem Pharmacies", "sector": "Consumer Staples"},
    {"ticker": "RCL", "name": "RCL Foods", "sector": "Consumer Staples"},
    {"ticker": "ARL", "name": "Astral Foods", "sector": "Consumer Staples"},
    {"ticker": "OCE", "name": "Oceana Group", "sector": "Consumer Staples"},
    {"ticker": "RFG", "name": "RFG Holdings", "sector": "Consumer Staples"},
    {"ticker": "QFH", "name": "Quantum Foods", "sector": "Consumer Staples"},
    {"ticker": "LBR", "name": "Libstar Holdings", "sector": "Consumer Staples"},
    {"ticker": "SHG", "name": "Sea Harvest Group", "sector": "Consumer Staples"},
    {"ticker": "RBO", "name": "Rainbow Chicken", "sector": "Consumer Staples"},
    {"ticker": "PMR", "name": "Premier Group", "sector": "Consumer Staples"},
    {"ticker": "CAA", "name": "CA Sales Holdings", "sector": "Consumer Staples"},

    # ══════════════════════════════════════════════════════════════
    #  CONSUMER DISCRETIONARY  (Retail, Luxury, Apparel, Autos)
    # ══════════════════════════════════════════════════════════════
    {
        "ticker": "WHL",
        "name": "Woolworths",
        "sector": "Consumer Discretionary",
        "listcorp": "https://www.listcorp.com/jse/whl/woolworths-holdings-limited",
        "ir_page": "https://www.woolworthsholdings.co.za/investors/",
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
        "ticker": "CFR",
        "name": "Compagnie Financiere Richemont",
        "sector": "Consumer Discretionary",
        "listcorp": "https://www.listcorp.com/jse/cfr/compagnie-financiere-richemont-sa",
        "ir_page": "https://www.richemont.com/investors/",
        "ir_sens": None,
    },
    {"ticker": "TFG", "name": "The Foschini Group", "sector": "Consumer Discretionary"},
    {"ticker": "TRU", "name": "Truworths International", "sector": "Consumer Discretionary"},
    {"ticker": "LEW", "name": "Lewis Group", "sector": "Consumer Discretionary"},
    {"ticker": "SUR", "name": "Spur Corporation", "sector": "Consumer Discretionary"},
    {"ticker": "FBR", "name": "Famous Brands", "sector": "Consumer Discretionary"},
    {"ticker": "CSB", "name": "Cashbuild", "sector": "Consumer Discretionary"},
    {"ticker": "ITE", "name": "Italtile", "sector": "Consumer Discretionary"},
    {"ticker": "CMH", "name": "Combined Motor Holdings", "sector": "Consumer Discretionary"},
    {"ticker": "WBC", "name": "We Buy Cars Holdings", "sector": "Consumer Discretionary"},
    {"ticker": "CHP", "name": "Choppies Enterprises", "sector": "Consumer Discretionary"},
    {"ticker": "RTN", "name": "Rex Trueform Group", "sector": "Consumer Discretionary"},
    {"ticker": "NWL", "name": "Nu-World Holdings", "sector": "Consumer Discretionary"},

    # ══════════════════════════════════════════════════════════════
    #  HEALTHCARE
    # ══════════════════════════════════════════════════════════════
    {
        "ticker": "APN",
        "name": "Aspen Pharmacare",
        "sector": "Healthcare",
        "listcorp": "https://www.listcorp.com/jse/apn/aspen-pharmacare-holdings-limited",
        "ir_page": "https://www.aspenpharma.com/investor-relations/",
        "ir_sens": None,
    },
    {"ticker": "NTC", "name": "Netcare", "sector": "Healthcare"},
    {"ticker": "LHC", "name": "Life Healthcare Group", "sector": "Healthcare"},
    {"ticker": "ACT", "name": "AfroCentric Investment Corporation", "sector": "Healthcare"},
    {"ticker": "RHB", "name": "RH Bophelo", "sector": "Healthcare"},

    # ══════════════════════════════════════════════════════════════
    #  TELECOMS
    # ══════════════════════════════════════════════════════════════
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
    {"ticker": "TKG", "name": "Telkom SA", "sector": "Telecoms"},
    {"ticker": "CCD", "name": "Cell C Holdings", "sector": "Telecoms"},
    {"ticker": "BLU", "name": "Blue Label Telecoms", "sector": "Telecoms"},
    {"ticker": "HUG", "name": "Huge Group", "sector": "Telecoms"},
    {"ticker": "TLM", "name": "TeleMasters Holdings", "sector": "Telecoms"},

    # ══════════════════════════════════════════════════════════════
    #  INDUSTRIALS  (Diversified, Chemicals, Packaging, Construction)
    # ══════════════════════════════════════════════════════════════
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
        "ticker": "MND",
        "name": "Mondi Ltd",
        "sector": "Industrials",
        "listcorp": "https://www.listcorp.com/jse/mnd/mondi-limited",
        "ir_page": "https://www.mondigroup.com/investors",
        "ir_sens": None,
    },
    {"ticker": "BVT", "name": "The Bidvest Group", "sector": "Industrials"},
    {"ticker": "BAW", "name": "Barloworld", "sector": "Industrials"},
    {"ticker": "AFE", "name": "AECI", "sector": "Industrials"},
    {"ticker": "OMN", "name": "Omnia Holdings", "sector": "Industrials"},
    {"ticker": "SAP", "name": "Sappi", "sector": "Industrials"},
    {"ticker": "RLO", "name": "Reunert", "sector": "Industrials"},
    {"ticker": "NPK", "name": "Nampak", "sector": "Industrials"},
    {"ticker": "MPT", "name": "Mpact", "sector": "Industrials"},
    {"ticker": "PPC", "name": "PPC", "sector": "Industrials"},
    {"ticker": "RBX", "name": "Raubex Group", "sector": "Industrials"},
    {"ticker": "WBO", "name": "Wilson Bayly Holmes-Ovcon", "sector": "Industrials"},
    {"ticker": "HDC", "name": "Hudaco Industries", "sector": "Industrials"},
    {"ticker": "AFT", "name": "Afrimat", "sector": "Industrials"},
    {"ticker": "SPG", "name": "Super Group", "sector": "Industrials"},
    {"ticker": "KAP", "name": "KAP Limited", "sector": "Industrials"},
    {"ticker": "BEL", "name": "Bell Equipment", "sector": "Industrials"},
    {"ticker": "IVT", "name": "Invicta Holdings", "sector": "Industrials"},
    {"ticker": "ENX", "name": "enX Group", "sector": "Industrials"},
    {"ticker": "ART", "name": "Argent Industrial", "sector": "Industrials"},
    {"ticker": "SSK", "name": "Stefanutti Stocks", "sector": "Industrials"},
    {"ticker": "AEG", "name": "Aveng", "sector": "Industrials"},
    {"ticker": "SEP", "name": "Sephaku Holdings", "sector": "Industrials"},
    {"ticker": "TRL", "name": "Trellidor Holdings", "sector": "Industrials"},
    {"ticker": "BIK", "name": "Brikor", "sector": "Industrials"},
    {"ticker": "DNB", "name": "Deneb Investments", "sector": "Industrials"},
    {"ticker": "BCF", "name": "Bowler Metcalf", "sector": "Industrials"},
    {"ticker": "TPC", "name": "Transpaco", "sector": "Industrials"},
    {"ticker": "YRK", "name": "York Timber", "sector": "Industrials"},
    {"ticker": "ISO", "name": "ASP Isotopes", "sector": "Industrials"},
    {"ticker": "MTA", "name": "Metair Investments", "sector": "Industrials"},
    {"ticker": "KAL", "name": "KAL Group", "sector": "Industrials"},
    {"ticker": "NVS", "name": "Novus Holdings", "sector": "Industrials"},
    {"ticker": "SOH", "name": "South Ocean Holdings", "sector": "Industrials"},
    {"ticker": "CAC", "name": "CAFCA", "sector": "Industrials"},
    {"ticker": "CKS", "name": "Crookes Brothers", "sector": "Industrials"},
    {"ticker": "ADR", "name": "Adcorp Holdings", "sector": "Industrials"},
    {"ticker": "CGR", "name": "Calgro M3", "sector": "Industrials"},

    # ══════════════════════════════════════════════════════════════
    #  REAL ESTATE  (REITs, Property Funds)
    # ══════════════════════════════════════════════════════════════
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
    {"ticker": "RDF", "name": "Redefine Properties", "sector": "Real Estate"},
    {"ticker": "VKE", "name": "Vukile Property Fund", "sector": "Real Estate"},
    {"ticker": "FFB", "name": "Fortress Real Estate Investments", "sector": "Real Estate"},
    {"ticker": "RES", "name": "Resilient REIT", "sector": "Real Estate"},
    {"ticker": "HYP", "name": "Hyprop Investments", "sector": "Real Estate"},
    {"ticker": "SRE", "name": "Sirius Real Estate", "sector": "Real Estate"},
    {"ticker": "LTE", "name": "Lighthouse Properties", "sector": "Real Estate"},
    {"ticker": "EQU", "name": "Equites Property Fund", "sector": "Real Estate"},
    {"ticker": "ATT", "name": "Attacq", "sector": "Real Estate"},
    {"ticker": "SAC", "name": "SA Corporate Real Estate", "sector": "Real Estate"},
    {"ticker": "SSS", "name": "Stor-Age Property REIT", "sector": "Real Estate"},
    {"ticker": "EMI", "name": "Emira Property Fund", "sector": "Real Estate"},
    {"ticker": "DIB", "name": "Dipula Properties", "sector": "Real Estate"},
    {"ticker": "HET", "name": "Heriot REIT", "sector": "Real Estate"},
    {"ticker": "FTA", "name": "Fairvest Limited", "sector": "Real Estate"},
    {"ticker": "SEA", "name": "Spear REIT", "sector": "Real Estate"},
    {"ticker": "TEX", "name": "Texton Property Fund", "sector": "Real Estate"},
    {"ticker": "OCT", "name": "Octodec Investments", "sector": "Real Estate"},
    {"ticker": "APF", "name": "Accelerate Property Fund", "sector": "Real Estate"},
    {"ticker": "OAS", "name": "Oasis Crescent Property Fund", "sector": "Real Estate"},
    {"ticker": "CPP", "name": "Collins Property Group", "sector": "Real Estate"},
    {"ticker": "CVW", "name": "Castleview Property Fund", "sector": "Real Estate"},
    {"ticker": "NRL", "name": "Newpark REIT", "sector": "Real Estate"},
    {"ticker": "GTC", "name": "Globe Trade Centre", "sector": "Real Estate"},
    {"ticker": "DLT", "name": "Delta Property Fund", "sector": "Real Estate"},
    {"ticker": "PPR", "name": "Putprop", "sector": "Real Estate"},
    {"ticker": "BWN", "name": "Balwin Properties", "sector": "Real Estate"},
    {"ticker": "EXP", "name": "Exemplar REITail", "sector": "Real Estate"},
    {"ticker": "BTN", "name": "Burstone Group", "sector": "Real Estate"},

    # ══════════════════════════════════════════════════════════════
    #  HOSPITALITY & GAMING
    # ══════════════════════════════════════════════════════════════
    {"ticker": "SUI", "name": "Sun International", "sector": "Consumer Discretionary"},
    {"ticker": "SSU", "name": "Southern Sun", "sector": "Consumer Discretionary"},
    {"ticker": "TSG", "name": "Tsogo Sun Gaming", "sector": "Consumer Discretionary"},
    {"ticker": "CLH", "name": "City Lodge Hotels", "sector": "Consumer Discretionary"},

    # ══════════════════════════════════════════════════════════════
    #  MEDIA & EDUCATION
    # ══════════════════════════════════════════════════════════════
    {"ticker": "ADH", "name": "ADvTECH", "sector": "Consumer Discretionary"},
    {"ticker": "SDO", "name": "Stadio Holdings", "sector": "Consumer Discretionary"},
    {"ticker": "EMH", "name": "eMedia Holdings", "sector": "Consumer Discretionary"},
    {"ticker": "CAT", "name": "Caxton and CTP Publishers", "sector": "Consumer Discretionary"},
    {"ticker": "AME", "name": "African Media Entertainment", "sector": "Consumer Discretionary"},

    # ══════════════════════════════════════════════════════════════
    #  LOGISTICS & TRANSPORT
    # ══════════════════════════════════════════════════════════════
    {"ticker": "GND", "name": "Grindrod", "sector": "Industrials"},
    {"ticker": "MTH", "name": "Motus Holdings", "sector": "Industrials"},
    {"ticker": "SNV", "name": "Santova", "sector": "Industrials"},
    {"ticker": "FTH", "name": "Frontier Transport Holdings", "sector": "Industrials"},

    # ══════════════════════════════════════════════════════════════
    #  INVESTMENT HOLDINGS (Diversified)
    # ══════════════════════════════════════════════════════════════
    {"ticker": "HCI", "name": "Hosken Consolidated Investments", "sector": "Financials"},
    {"ticker": "GPL", "name": "Grand Parade Investments", "sector": "Financials"},
    {"ticker": "EPE", "name": "EPE Capital Partners", "sector": "Financials"},
    {"ticker": "ACS", "name": "Acsion", "sector": "Financials"},
    {"ticker": "MMP", "name": "Marshall Monteagle", "sector": "Financials"},
    {"ticker": "TMT", "name": "Trematon Capital Investments", "sector": "Financials"},
    {"ticker": "NTU", "name": "Nutun", "sector": "Financials"},
    {"ticker": "ZED", "name": "Zeder Investments", "sector": "Financials"},
    {"ticker": "TTO", "name": "Trustco Group", "sector": "Financials"},
    {"ticker": "ANI", "name": "Afine Investments", "sector": "Financials"},
    {"ticker": "MHB", "name": "Mahube Infrastructure", "sector": "Financials"},
    {"ticker": "SZK", "name": "SAB Zenzele Kabili", "sector": "Financials"},
    {"ticker": "ZZD", "name": "Zeda", "sector": "Financials"},
    {"ticker": "AXX", "name": "Araxi", "sector": "Financials"},
    {"ticker": "UPL", "name": "Universal Partners", "sector": "Financials"},
    {"ticker": "MTU", "name": "Mantengu", "sector": "Financials"},
    {"ticker": "SEB", "name": "Sebata Holdings", "sector": "Financials"},
    {"ticker": "NCS", "name": "Nictus", "sector": "Financials"},
    {"ticker": "ADW", "name": "African Dawn Capital", "sector": "Financials"},
    {"ticker": "PMV", "name": "Primeserv Group", "sector": "Industrials"},
    {"ticker": "ISB", "name": "Insimbi Industrial", "sector": "Industrials"},
    {"ticker": "PBG", "name": "PBT Group", "sector": "Technology"},
    {"ticker": "XII", "name": "Numeral", "sector": "Financials"},
    {"ticker": "VIS", "name": "Visual International", "sector": "Financials"},
    {"ticker": "LAB", "name": "Labat Africa", "sector": "Consumer Staples"},
    {"ticker": "CPR", "name": "Copper 360", "sector": "Resources"},
    {"ticker": "SXM", "name": "Sable Exploration and Mining", "sector": "Resources"},
    {"ticker": "EUZ", "name": "Europa Metals", "sector": "Resources"},
    {"ticker": "KP2", "name": "Kore Potash", "sector": "Resources"},
    {"ticker": "SKA", "name": "Shuka Minerals", "sector": "Resources"},
    {"ticker": "CCC", "name": "Cilo Cybin Holdings", "sector": "Healthcare"},
    {"ticker": "AON", "name": "African and Overseas Enterprises", "sector": "Consumer Discretionary"},
    {"ticker": "MSP", "name": "MAS Real Estate", "sector": "Real Estate"},

    # ── Additional notable companies ──────────────────────────────
    {"ticker": "HAM", "name": "Hammerson", "sector": "Real Estate"},
    {"ticker": "PHP", "name": "Primary Health Properties", "sector": "Real Estate"},
    {"ticker": "SHC", "name": "Shaftesbury Capital", "sector": "Real Estate"},
    {"ticker": "SRI", "name": "Supermarket Income REIT", "sector": "Real Estate"},
    {"ticker": "GCT", "name": "Greencoat Renewables", "sector": "Energy"},
    {"ticker": "OPA", "name": "Channel Vas Investments", "sector": "Financials"},
    {"ticker": "INL", "name": "Investec Limited", "sector": "Financials"},
    {"ticker": "NY1", "name": "Ninety One Limited", "sector": "Financials"},
    {"ticker": "VAL", "name": "Valterra Platinum", "sector": "Resources"},
    {"ticker": "OAO", "name": "Oando", "sector": "Energy"},
]


def get_by_ticker(ticker: str):
    """Look up a company by JSE ticker code."""
    return next((c for c in JSE_TOP_40 if c["ticker"] == ticker), None)


def get_by_sector(sector: str) -> list[dict]:
    """Get all companies in a given sector."""
    return [c for c in JSE_TOP_40 if c["sector"] == sector]


def all_tickers() -> list[str]:
    """Return all ticker codes."""
    return [c["ticker"] for c in JSE_TOP_40]


def all_listcorp_urls() -> list[tuple[str, str]]:
    """Return (ticker, listcorp_news_url) pairs for scraping.
    Only includes companies with a listcorp URL configured."""
    return [
        (c["ticker"], c["listcorp"] + "/news")
        for c in JSE_TOP_40
        if c.get("listcorp")
    ]
