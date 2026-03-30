"""
SENS Director Dealing Parser
=============================
Extracts structured data from raw SENS announcement text.

Two-tier approach:
  1. Regex-based extraction (fast, free, handles standard format)
  2. LLM-based extraction via Anthropic API (handles edge cases)

SENS director dealing announcements follow a semi-standard format
mandated by JSE Listings Requirements 3.63-3.74:

  - Director name and office held
  - Date of transaction
  - Nature of transaction (purchase/sale)
  - Number of securities
  - Price per security
  - Total value
  - Class of securities
  - Nature of interest (direct/indirect)
  - Whether clearance to deal was received

Usage:
    parser = SENSParser(anthropic_api_key="sk-...")
    deals = parser.parse(raw_text, ticker="NPN", company="Naspers")
"""

import re
import json
import logging
from typing import Optional
from dataclasses import dataclass, asdict

logger = logging.getLogger(__name__)


@dataclass
class ParsedDeal:
    """A single parsed director dealing."""
    director: str
    role: str
    transaction_date: str
    transaction_type: str       # Buy / Sell / Vesting / TaxSale / OptionsExercise / Conversion
    shares: int
    price: float
    value: float
    class_of_securities: str
    nature_of_interest: str     # Direct / Indirect
    clearance_received: bool
    confidence: float           # 0-1
    currency: str = "ZAR"       # ZAR / GBP / USD / EUR
    exchange: str = "JSE"       # JSE / LSE / ASX / NYSE etc.


# ─── Regex Patterns ──────────────────────────────────────────────────────────
# These patterns cover the wide variety of SENS announcement formats seen
# across JSE companies. Formats vary from UPPERCASE labels (Argent style)
# to Title Case with colons (Lighthouse, Grindrod, NEPI), with currency
# prefixes of R, ZAR, or neither.

PATTERNS = {
    "director_name": [
        # MOST SPECIFIC patterns first (longer matches before shorter)

        # EU MAR / PDMR format: "Name of director / person discharging managerial responsibilities: Andre van der Veer"
        # Strip the PDMR label and capture only the actual name after it
        r"(?:Name\s+of\s+(?:the\s+)?(?:director|PDMR)\s*/\s*person\s+discharging\s+managerial\s+responsibilities)\s*[:\-]?\s*(.+?)(?:\n|$)",
        # "Name of director and relationship to associate: Desmond de Beer is a beneficiary..."
        # Extract just the person name (before "is a" / "is the" / "," / "who")
        r"(?:Name\s+of\s+director\s+and\s+relationship\s+to\s+associate)\s*[:\-]?\s*([A-Z][a-z]+(?:\s+(?:de\s+|van\s+|der\s+|le\s+|du\s+)?[A-Za-z]+)*?)(?:\s+is\s+|\s*,|\s+who\s+)",
        # "Name of director : John Smith" / "NAME OF DIRECTOR  John Smith"
        # Negative lookahead: don't match "Name of director and relationship" or "Name of director / person"
        r"(?:Name\s+of\s+(?:the\s+)?(?:director|executive\s+director))(?!\s+and\s+relationship)(?!\s*/\s*person)\s*[:\-]?\s*(.+?)(?:\n|$)",
        # "Director : Mark Sorour" / "Director  Mark Sorour"
        r"(?:^|\n)\s*Director\s*[:\-]\s*(.+?)(?:\n|$)",
        # "Name: John Smith" (Grindrod style) / "Name                C Keyter" (Sibanye — spaces as separator)
        r"(?:^|\n)\s*Name\s*[:\-]\s+(.+?)(?:\n|$)",
        r"Name\s{2,}(\S.+?)(?:\n|$)",
        # "NAME OF DIRECTOR  John Smith" (Argent uppercase)
        r"NAME\s+OF\s+DIRECTOR\s+(.+?)(?:\n|$)",
        # "a) Name: Hendrik Pretorius" / "A) Name: PIETER" / "1. Name: PIETER" (UK MAR and lettered formats)
        r"(?:^|\n)\s*(?:[A-Za-z]\)|[0-9]+[\.\)])\s*Name\s*[:\-]?\s*(.+?)(?:\n|$)",
        # "Name of associate : Delsa Investments" (Lighthouse style — fallback for associate)
        r"(?:Name\s+of\s+associate(?:\s*/\s*person\s+closely\s+associated)?)\s*[:\-]?\s*(.+?)(?:\n|$)",
        # Prose: "...by Mr Ditabe Chocho, the Financial Director" (Merafe style — name in paragraph)
        r"(?:by\s+)((?:Mr|Mrs|Ms|Miss|Dr|Prof|Adv)\.?\s+[A-Z][a-z]+(?:\s+(?:de\s+|van\s+|der\s+|le\s+|du\s+)?[A-Z][a-z]+)+)(?:\s*,|\s+the\s+|\s+who\s+|\s+as\s+|\s+a\s+|\s*\()",
    ],
    "role": [
        r"(?:Office\s+[Hh]eld|Designation|Position|Capacity|Role)\s*[:\-]\s*(.+?)(?:\n|$)",
        # "Position/status: Executive" (UK MAR format)
        r"(?:Position\s*/\s*status)\s*[:\-]?\s*(.+?)(?:\n|$)",
        # Sibanye style: "Position                     Executive Director"
        r"(?:^|\n)\s*(?:Position|Designation)\s{2,}(.+?)(?:\n|$)",
        r"(?:STATUS\s*:\s*EXECUTIVE\s*/\s*NON[- ]EXECUTIVE)\s*(.+?)(?:\n|$)",
        r"(?:Company\s+of\s+which\s+a\s+director)\s*(.+?)(?:\n|$)",
    ],
    "transaction_date": [
        # "Date of transaction : 12 March 2026" / "Date of transaction 1: 20 March 2026" (Hudaco numbered)
        # "Date of the transaction : 20 March 2026" (UK MAR format)
        # NOTE: (?:\s+\d+(?=\s*[:\-])) requires numbered suffix (e.g. "1:") to be followed by colon/dash
        # to prevent eating the day number from "12 March 2026" when space-separated
        r"(?:Date\s+(?:of\s+)?(?:the\s+)?transaction(?:s)?(?:\s+\d+(?=\s*[:\-]))?(?:\s+effected)?)\s*[:\-]?\s*(.+?)(?:\n|$)",
        # "Date of dealing : 16 March 2026" (KAL style — no numbered suffix)
        r"(?:Date\s+(?:of\s+)?(?:the\s+)?dealing)\s*[:\-]?\s*(.+?)(?:\n|$)",
        # "Transaction date : 11 March 2026" / "Transaction date             20 March 2026"
        r"(?:Transaction\s+date)\s*[:\-]?\s*(.+?)(?:\n|$)",
        r"(?:^|\n)\s*Transaction\s+date\s{2,}(.+?)(?:\n|$)",
        # "Date of transaction             11 March 2026" (space-separated)
        r"(?:^|\n)\s*Date\s+of\s+(?:the\s+)?transaction(?:\s+\d+(?=\s*[:\-]))?\s{2,}(.+?)(?:\n|$)",
        r"(?:^|\n)\s*Date\s+of\s+(?:the\s+)?dealing\s{2,}(.+?)(?:\n|$)",
        # "DATE OF TRANSACTION" / "DATE OF DEALING" (uppercase, Argent/KAL)
        r"DATE\s+OF\s+(?:TRANSACTION|DEALING)\s+(.+?)(?:\n|$)",
    ],
    "transaction_type": [
        # "Nature of transaction : On-market purchase" / "Nature of transaction 1: Acquisition..."
        # "Nature of the transaction: Acquisition" (UK MAR format)
        # Allow multi-line capture for continuation lines (HCI style wraps across lines)
        r"(?:Nature\s+of\s+(?:the\s+)?transaction(?:s)?(?:\s+\d+(?=\s*[:\-]))?)\s*[:\-]?\s*(.+(?:\n\s{20,}.+)*)",
        # "Nature of dealing: Purchase..." (KAL style — no numbered suffix)
        r"(?:Nature\s+of\s+(?:the\s+)?dealing)\s*[:\-]?\s*(.+(?:\n\s{20,}.+)*)",
        # "Nature of transaction             On market purchase" (space-separated, multi-line)
        r"(?:^|\n)\s*Nature\s+of\s+(?:the\s+)?transaction(?:\s+\d+(?=\s*[:\-]))?\s{2,}(.+(?:\n\s{20,}.+)*)",
        r"(?:^|\n)\s*Nature\s+of\s+(?:the\s+)?dealing\s{2,}(.+(?:\n\s{20,}.+)*)",
        r"(?:Type\s+of\s+transaction)\s*[:\-]?\s*(.+?)(?:\n|$)",
        r"NATURE\s+OF\s+(?:TRANSACTION|DEALING)\s+(.+?)(?:\n|$)",
    ],
    "shares": [
        # "Number of securities : 992 906" / "NUMBER OF SECURITIES TRANSACTED  1,200" / "NUMBER OF SECURITIES TRADED  1 400"
        r"(?:Number\s+of\s+(?:(?:ordinary\s+)?shares|securities)(?:\s*/\s*volume)?(?:\s+(?:purchased|sold|disposed|transacted|traded))?)\s*[:\-]?\s*([\d\s,]+)",
        r"NUMBER\s+OF\s+SECURITIES\s+(?:TRANSACTED|TRADED)\s+([\d\s,]+)",
        # Prose: "Acquisition of 5,700 shares" / "Sale of 6 761 Hudaco ordinary shares"
        r"(?:Acquisition|Sale|Disposal|Purchase)\s+of\s+([\d][\d\s,]*\d)\s+(?:\w+\s+)*?(?:ordinary\s+)?shares",
        # fallback: "1,200 ordinary shares"
        r"([\d,\s]+)\s+(?:ordinary\s+)?(?:shares|securities)",
    ],
    "price": [
        # "Volume weighted average price per security : R17.2004" / "Weighted average price per security: ZAR 7.9037"
        r"(?:(?:Volume\s+)?[Ww]eighted\s+average\s+(?:purchase\s+)?price(?:\s+per\s+(?:share|security))?)\s*(?:\([^)]*\))?\s*[:\-]?\s*(?:R|ZAR|GBP|EUR|€|£)?\s*([\d\s,\.]+\s*(?:cps)?)",
        # "Purchase price per share (cents)                 16 620" / "Price per share : R195.09"
        r"(?:(?:Purchase\s+)?[Pp]rice\s+per\s+(?:share|security))\s*(?:\([^)]*\))?\s*[:\-]?\s*(?:R|ZAR|GBP|EUR|€|£)?\s*([\d\s,\.]+\s*(?:cps)?)",
        r"PRICE\s+PER\s+SECURITY\s+(?:R|ZAR|GBP|EUR|€|£)?\s*([\d\s,\.]+\s*(?:cps)?)",
        # "Price per security : ZAR 134.00"
        r"(?:Price\s+per\s+security)\s*(?:\([^)]*\))?\s*[:\-]?\s*(?:R|ZAR|GBP|EUR|€|£)?\s*([\d\s,\.]+\s*(?:cps)?)",
        # "Deemed market price per share" (Gold Fields — value may be on next line)
        r"(?:Deemed\s+market\s+price\s+per\s+share)\s*(?:\([^)]*\))?\s*[:\-]?\s*(?:R|ZAR|GBP|EUR|€|£)?\s*([\d\s,\.]+\s*(?:cps)?)",
        # "Market price                 R48.99" (Sibanye style)
        r"(?:Market\s+price)\s*(?:\([^)]*\))?\s*[:\-]?\s*(?:R|ZAR|GBP|EUR|€|£)?\s*([\d\s,\.]+\s*(?:cps)?)",
        # Prose: "at GBP1.312 per share" / "at a price of R195.09 per share"
        r"at\s+(?:a\s+)?(?:(?:an?\s+)?average\s+)?price\s+of\s+(?:R|ZAR|GBP|EUR|€|£)?\s*([\d\s,\.]+)\s+per\s+share",
        r"at\s+(?:R|ZAR|GBP|£)([\d\s,\.]+)\s+per\s+share",
        # UK MAR table: "Price(s)  Volume(s)\n  £0.837  47,380" — price under header
        r"Price\(s\)\s+Volume\(s\)\s*\n\s*(?:R|ZAR|GBP|EUR|€|£)?\s*([\d\s,\.]+)",
    ],
    "value": [
        # "Total value : ZAR 7 847 631.15" / "Total value: R286 679.07"
        r"(?:Total\s+value(?:\s+of\s+(?:the\s+)?(?:transactions?|securities))?)\s*[:\-]?\s*(?:R|ZAR|GBP|EUR|€|£)?\s*([\d\s,\.]+)",
        # "TOTAL RAND VALUE OF SECURITIES TRANSACTED  R39,732" / "TOTAL RAND VALUE OF SECURITIES TRADED  R62,286.00"
        r"TOTAL\s+RAND\s+VALUE\s+OF\s+SECURITIES\s+(?:(?:TRANSACTED|TRADED)\s+)?(?:R|ZAR|GBP|EUR|€|£)?\s*([\d\s,\.]+)",
        # "Value of the transaction : R10,568,357.02" / "Value of transaction 1: R2 931 309.89" (Hudaco numbered)
        # "Value of transaction (Rand)                       7 830 845" (HCI space-padded with unit in parens)
        r"(?:(?:Total\s+)?[Vv]alue\s+of\s+(?:the\s+)?transactions?(?:\s+\d+(?=\s*[:\-]))?)\s*(?:\([^)]*\))?\s*[:\-]?\s*(?:R|ZAR|GBP|EUR|€|£)?\s*([\d\s,\.]+)",
        # "Aggregated information: Acquisition value of GBP7,478.40" (UK MAR)
        r"(?:Aggregated\s+information)\s*[:\-]?\s*\w+\s+value\s+of\s+(?:R|ZAR|GBP|EUR|€|£)?\s*([\d\s,\.]+)",
        # "Deemed transaction value: R nil (Conditional value of R2 846 307.33...)" — value is nil but conditional value in parens
        r"(?:Deemed\s+(?:market|conditional|transaction)\s+value)\s*[:\-]?\s*R?\s*nil\s*\(.*?(?:R|ZAR)\s*([\d\s,\.]+)",
        # "Deemed market value : R51,721,659.78" / "Deemed conditional value: R2,846,307.33" / "Deemed transaction value: R39,858,908.50"
        r"(?:Deemed\s+(?:market|conditional|transaction)\s+value)\s*[:\-]?\s*(?:R|ZAR|GBP|EUR|€|£)?\s*([\d\s,\.]+)",
        # "Total rand value" / "Total cost"
        r"(?:Total\s+(?:rand\s+)?(?:value|cost))\s*[:\-]?\s*(?:R|ZAR|GBP|EUR|€|£)?\s*([\d\s,\.]+)",
    ],
    "class_of_securities": [
        r"(?:(?:Type\s+and\s+)?[Cc]lass\s+of\s+(?:shares|securities)(?:\s*/\s*description[^:]*)?)\s*[:\-]?\s*(.+?)(?:\n|$)",
        r"TYPE\s+AND\s+CLASS\s+OF\s+SECURITIES\s+(.+?)(?:\n|$)",
    ],
    "nature_of_interest": [
        # "Nature and extent of director's interest : Indirect beneficial"
        r"(?:Nature\s+and\s+extent\s+of\s+(?:director'?s?\s+)?interest(?:\s+in\s+the\s+transaction)?)\s*[:\-]?\s*(.+?)(?:\n|$)",
        # "Nature of interest of executive: Direct beneficial" (UK MAR JSE additional info)
        r"(?:Nature\s+of\s+interest\s+of\s+(?:executive|director))\s*[:\-]?\s*(.+?)(?:\n|$)",
        # "Nature of interest           Direct and Beneficial" (space-separated)
        r"(?:^|\n)\s*Nature\s+of\s+interest\s{2,}(.+?)(?:\n|$)",
        # "Extent of interest : Direct beneficial"
        r"(?:Extent\s+of\s+interest)\s*[:\-]?\s*(.+?)(?:\n|$)",
        # "Interest : Direct beneficial" / "NATURE AND EXTENT OF INTEREST"
        r"(?:(?:Nature\s+of\s+)?[Ii]nterest)\s*[:\-]\s*(.+?)(?:\n|$)",
        r"NATURE\s+AND\s+EXTENT\s+OF\s+INTEREST\s+IN\s+THE\s+TRANSACTION\s+(.+?)(?:\n|$)",
    ],
    "clearance": [
        # "Clearance to deal obtained : Yes" / "Clearance to deal received : Yes"
        r"(?:Clearance\s+to\s+deal\s+(?:received|obtained))\s*[:\-]?\s*(.+?)(?:\n|$)",
        # "Clearance obtained : Yes" / "Clearance received : Yes"
        r"(?:Clearance\s+(?:received|obtained))\s*[:\-]?\s*(.+?)(?:\n|$)",
        # "Written clearance to deal received : Yes"
        r"(?:Written\s+clearance\s+to\s+deal\s+(?:received|obtained))\s*[:\-]?\s*(.+?)(?:\n|$)",
        # "Clearance given in terms of paragraph 6.83..." (UK MAR JSE additional info)
        r"(?:Clearance\s+given)\s*(?:\s+in\s+terms\s+of[^:]*)?[:\-]?\s*(.+?)(?:\n|$)",
        # "CLEARANCE TO DEAL OBTAINED  Yes"
        r"CLEARANCE\s+TO\s+DEAL\s+(?:RECEIVED|OBTAINED)\s+(.+?)(?:\n|$)",
    ],
}


# ─── Helper Functions ────────────────────────────────────────────────────────

def clean_number(text: str) -> Optional[float]:
    """
    Parse a number from text like '48,031,250.00', '48 031 250', '7 847 631.15'.
    Handles both comma and space as thousands separators.
    Also handles 'cps' (cents per share) — divides by 100 to get Rands.
    """
    if not text:
        return None
    # Check for cps (cents per share) before stripping
    is_cps = "cps" in text.lower()
    # Remove currency prefix and cps suffix
    text = re.sub(r'^[R\s]+|^ZAR\s*|^GBP\s*|^EUR\s*|^[€£\$]\s*', '', text.strip())
    text = re.sub(r'\s*cps.*$', '', text, flags=re.IGNORECASE).strip()
    # European format: "2 687 827,55" — comma as decimal separator, spaces as thousands
    # Detect: comma followed by exactly 1-2 digits at end, with no dot present
    if re.search(r',\d{1,2}$', text) and '.' not in text:
        text = text.replace(' ', '').replace(',', '.')
    # Remove all remaining thousand separators (commas and spaces)
    cleaned = re.sub(r'[\s,]', '', text)
    try:
        val = float(cleaned)
        if is_cps:
            val = val / 100.0  # Convert cents to Rands
        return val
    except (ValueError, TypeError):
        return None


def clean_int(text: str) -> Optional[int]:
    """Parse an integer from text like '12,500' or '12 500' or '992 906'."""
    val = clean_number(text)
    return int(val) if val is not None else None


def parse_date(text: str) -> Optional[str]:
    """Try to parse a date string into YYYY-MM-DD format."""
    from datetime import datetime

    text = text.strip()
    # Remove leading numbered prefix like "1:" from "1:              20 March 2026"
    text = re.sub(r'^\d+\s*:\s*', '', text).strip()
    # Remove trailing junk like ")" or extra text after the date
    text = re.sub(r'\s*\(.*$', '', text)
    text = re.sub(r'\s+and\s+.*$', '', text, flags=re.IGNORECASE)

    # Try common formats
    formats = [
        "%d %B %Y",         # 25 March 2024
        "%d %b %Y",         # 25 Mar 2024
        "%Y-%m-%d",          # 2024-03-25
        "%d/%m/%Y",          # 25/03/2024
        "%d %B, %Y",        # 25 March, 2024
        "%B %d, %Y",        # March 25, 2024
        "%d %B%Y",          # 25 March2024 (no space — OCR artifact)
    ]

    for fmt in formats:
        try:
            dt = datetime.strptime(text.strip(), fmt)
            return dt.strftime("%Y-%m-%d")
        except ValueError:
            continue

    return text  # Return as-is if we can't parse


def classify_transaction(text: str, llm_fallback: bool = False, api_key: str = None) -> str:
    """
    Classify transaction type using keyword matching, with optional LLM fallback.

    Two-tier approach:
      1. Keyword matching (instant, free) → handles 90%+ of cases
      2. LLM classification via Claude Haiku (fast, cheap) → handles edge cases

    Returns one of: Buy, Sell, Vesting, TaxSale, OptionsExercise, Conversion, Unknown

    Discretionary (open market signals):
      - Buy: On-market purchases, acquisitions
      - Sell: On-market sales, disposals

    Non-discretionary (corporate actions):
      - Vesting: LTI awards, share plans, conditional shares
      - TaxSale: Sales to fund tax obligations
      - OptionsExercise: Exercise of share options/SARs
      - Conversion: Conversion of securities, rights issues
    """
    # Normalize whitespace (multi-line continuation lines have newlines + spaces)
    lower = re.sub(r'\s+', ' ', text).lower().strip()

    # ── Tier 1: Keyword matching ─────────────────────────────────────────

    # Check non-discretionary types first (more specific)
    # Options keywords checked BEFORE tax sale because "exercise and net settlement"
    # should match OptionsExercise, not TaxSale
    options_keywords = [
        "exercise of option", "option exercise", "exercised option",
        "share option", "share appreciation right exercised",
        "sar exercise", "exercise of share appreciation",
        "exercised share appreciation", "stock option",
        "exercise and net settlement", "exercise of share option",
        "share options previously granted",
    ]
    tax_sale_keywords = [
        "to fund tax", "to settle tax", "tax obligation", "tax liability",
        "net settlement", "non-discretionary", "tax withheld",
    ]
    vesting_keywords = [
        "lti award", "lti cash award", "performance share plan", "psp award",
        "restricted share plan", "rsp award", "conditional share plan",
        "csp award", "vesting of", "shares vested", "share award",
        "forfeitable share", "conditional share rights",
        "share appreciation right", "share matching scheme",
        "acceptance of conditional",
    ]
    conversion_keywords = [
        "conversion of", "converted", "rights issue", "rights offer",
        "capitalisation issue", "scrip dividend", "share split",
        "share consolidation", "bonus issue",
    ]
    hedge_keywords = [
        "collar hedge", "off-market collar", "hedge termination",
        "early termination of", "mark-to-market",
        "put option", "collar arrangement", "hedging arrangement",
        "zero-cost collar", "prepaid forward",
        "settle the mark-to-market", "funding transaction",
    ]

    for kw in hedge_keywords:
        if kw in lower:
            return "HedgeSettlement"
    for kw in options_keywords:
        if kw in lower:
            return "OptionsExercise"
    for kw in tax_sale_keywords:
        if kw in lower:
            return "TaxSale"
    for kw in vesting_keywords:
        if kw in lower:
            return "Vesting"
    for kw in conversion_keywords:
        if kw in lower:
            return "Conversion"

    # Discretionary transactions
    sell_keywords = ["sale", "sold", "disposal", "selling", "on-market disposal",
                     "on market disposal", "on-market sale", "on market sale",
                     "off-market sale", "off market sale"]
    buy_keywords = ["purchase", "purchased", "bought", "acquisition",
                    "on-market purchase", "on market purchase",
                    "on-market acquisition", "on market acquisition",
                    "shares purchased", "off-market purchase", "off market purchase"]

    for kw in buy_keywords:
        if kw in lower:
            return "Buy"
    for kw in sell_keywords:
        if kw in lower:
            return "Sell"

    # ── Tier 2: LLM fallback ─────────────────────────────────────────────
    if llm_fallback and api_key:
        llm_result = _llm_classify_transaction(text, api_key)
        if llm_result != "Unknown":
            logger.info(f"LLM classified transaction as '{llm_result}': {text[:80]}...")
            return llm_result

    return "Unknown"


def _llm_classify_transaction(text: str, api_key: str) -> str:
    """
    Use Claude Haiku to classify a transaction type.

    This is a lightweight, targeted call — just the transaction description,
    not the full SENS announcement. Costs ~$0.0001 per call.
    """
    try:
        import anthropic

        client = anthropic.Anthropic(api_key=api_key)

        message = client.messages.create(
            model="claude-haiku-4-20250414",
            max_tokens=20,
            system=(
                "Classify the following director dealing transaction description "
                "into EXACTLY one of these types. Reply with ONLY the type, nothing else.\n\n"
                "Types:\n"
                "- Buy (on-market purchase, acquisition of shares)\n"
                "- Sell (on-market sale, disposal of shares)\n"
                "- Vesting (LTI awards, share plans, conditional shares vesting)\n"
                "- TaxSale (sale to fund tax obligations, net settlement for tax)\n"
                "- OptionsExercise (exercise of share options, SARs)\n"
                "- Conversion (conversion of securities, rights issues, scrip dividends)\n"
                "- Unknown (cannot determine)\n"
            ),
            messages=[{
                "role": "user",
                "content": f"Transaction description: {text[:500]}"
            }]
        )

        result = message.content[0].text.strip()
        # Validate it's one of our known types
        valid_types = {"Buy", "Sell", "Vesting", "TaxSale", "OptionsExercise", "Conversion", "Unknown"}
        if result in valid_types:
            return result
        # Try to match partial/fuzzy response
        result_lower = result.lower()
        for vt in valid_types:
            if vt.lower() in result_lower:
                return vt
        return "Unknown"

    except Exception as e:
        logger.warning(f"LLM transaction classification failed: {e}")
        return "Unknown"


def detect_currency(text: str) -> str:
    """Detect transaction currency from announcement text."""
    # Look for explicit currency in price/value fields
    # GBP patterns: "GBP7,478.40", "at GBP1.312", "£1.312"
    if re.search(r'(?:GBP|£)\s*[\d,.]', text):
        # Confirm no ZAR/R prices (dual-listed may mention both)
        # If we find GBP in price/value context, it's GBP
        return "GBP"
    if re.search(r'(?:USD|\$)\s*[\d,.]', text):
        return "USD"
    if re.search(r'EUR\s*[\d,.]', text):
        return "EUR"
    return "ZAR"


def detect_exchange(text: str) -> str:
    """Detect which exchange the transaction occurred on."""
    lower = text.lower()
    # Explicit "Place of the transaction" field (UK MAR format)
    match = re.search(r'place\s+of\s+(?:the\s+)?transaction\s*[:\-]?\s*(.+?)(?:\n|$)', text, re.IGNORECASE)
    if match:
        place = match.group(1).lower()
        if "london" in place or "lse" in place:
            return "LSE"
        if "amsterdam" in place or "euronext" in place or "ams" in place:
            return "AMS"
        if "new york" in place or "nyse" in place:
            return "NYSE"
        if "nasdaq" in place:
            return "NASDAQ"
        if "asx" in place or "australian" in place:
            return "ASX"
        if "jse" in place or "johannesburg" in place:
            return "JSE"
    # "On-market" combined with LSE share code suggests LSE
    if re.search(r'share\s+code\s+on\s+lse', lower):
        if re.search(r'(?:GBP|£)\s*[\d,.]', text):
            return "LSE"
    # EUR currency → likely Euronext Amsterdam, unless "Place of transaction" explicitly says JSE
    if re.search(r'(?:EUR|€)\s*[\d,.]', text):
        # Check if Place of transaction explicitly mentions JSE/Johannesburg
        place_match = re.search(r'place\s+of\s+(?:the\s+)?transaction\s*[:\-]?\s*(.+?)(?:\n|$)', text, re.IGNORECASE)
        if place_match:
            place_text = place_match.group(1).lower()
            if 'jse' not in place_text and 'johannesburg' not in place_text:
                return "AMS"
        elif 'euronext' in lower or 'amsterdam' in lower:
            return "AMS"
        else:
            return "AMS"
    return "JSE"


def classify_interest(text: str) -> str:
    """Classify as Direct or Indirect interest."""
    text = text.lower()
    if "indirect" in text:
        return "Indirect"
    if "direct" in text:
        return "Direct"
    return "Unknown"


def clean_director_name(name: str) -> str:
    """Clean up a raw director name — strip PDMR labels, trailing clauses, punctuation."""
    if not name:
        return name
    # Strip EU MAR "/ person discharging managerial responsibilities" label
    name = re.sub(r'^[/\s]*person\s+discharging\s+managerial\s+responsibilities\s*[:\-]?\s*', '', name, flags=re.IGNORECASE).strip()
    # Strip "who is the sole member of..." / "who is a director of..." trailing clauses
    name = re.sub(r',?\s+who\s+is\s+.*$', '', name, flags=re.IGNORECASE).strip()
    # Strip "is a beneficiary..." / "is the sole member..." trailing clauses
    name = re.sub(r',?\s+is\s+(?:a|the)\s+.*$', '', name, flags=re.IGNORECASE).strip()
    # Remove parenthetical suffixes like (Pty) Ltd, but keep (via ...) for associate dealings
    name = re.sub(r'\s*\((?!via\s).*?\)\s*$', '', name).strip()
    # Remove trailing comma
    name = re.sub(r',\s*$', '', name).strip()
    # If it still looks like a label/boilerplate, reject it
    if re.search(r'(?:dealing|securities|announcement|managerial|initial\s+notification|according\s+to\s+MAR)', name, re.IGNORECASE):
        return ""
    return name


# ─── Regex Parser ────────────────────────────────────────────────────────────

class RegexParser:
    """
    Extracts director dealing fields using regex patterns.
    Works well for standard-format SENS announcements.
    """

    def __init__(self, anthropic_api_key: str = None):
        self.api_key = anthropic_api_key

    def _extract(self, text: str, field: str) -> Optional[str]:
        """Try each pattern for a field, return first match."""
        for pattern in PATTERNS.get(field, []):
            match = re.search(pattern, text, re.IGNORECASE | re.MULTILINE)
            if match:
                return match.group(1).strip()
        return None

    def _extract_all(self, text: str, field: str) -> list:
        """Extract ALL matches for a field (for multi-transaction announcements)."""
        results = []
        for pattern in PATTERNS.get(field, []):
            for match in re.finditer(pattern, text, re.IGNORECASE | re.MULTILINE):
                val = match.group(1).strip()
                if val and val not in results:
                    results.append(val)
            if results:
                break  # Use first pattern that matches
        return results

    def _split_into_blocks(self, text: str) -> list:
        """
        Split a SENS announcement into individual dealing blocks.

        Handles multiple formats:
        1. "A) Name:", "B) Name:" lettered sections
        2. "1. Name:", "2. Name:" numbered sections
        3. Repeated "Name:" or "Name of director:" blocks
        4. Repeated "Transaction date:" blocks (multiple txns for same director)
        """
        # Strategy 1: Split on lettered/numbered sections "A) Name:", "a) Name:", "1. Name:"
        lettered = re.split(
            r'(?:^|\n)\s*(?:[A-Za-z]\)|[0-9]+[\.\)])\s*(?:Name)\s*[:\-]',
            text, flags=re.IGNORECASE | re.MULTILINE
        )
        if len(lettered) > 1:
            # The split removes "A) Name:" labels, so blocks start with the
            # name value directly. Tag them so parse() knows the first line IS the name.
            blocks = []
            for part in lettered[1:]:
                blocks.append("__LETTERED_NAME__\n" + part)
            return blocks

        # Strategy 2: Split on repeated "Name of director:" or "Name:" or "Name    Person" blocks
        # Look for lines where a new director block starts
        name_pattern = (
            r'(?=\n\s*(?:'
            r'Name\s+of\s+(?:the\s+)?(?:director|associate|executive)'
            r'|Name\s*:'
            r'|Name\s{2,}\S'
            r'|NAME\s+OF\s+DIRECTOR'
            r')\s*)'
        )
        blocks = re.split(name_pattern, text, flags=re.IGNORECASE)
        blocks = [b.strip() for b in blocks if b.strip()]

        if len(blocks) > 1:
            # Check if the first block is just a header (no name match)
            first_has_name = bool(self._extract(blocks[0], "director_name"))
            if not first_has_name and len(blocks) > 1:
                # Merge header with first real block as common context
                return blocks[1:]
            return blocks

        # Strategy 3: Return as single block
        return [text]

    def _split_transactions(self, text: str) -> list:
        """
        Split a section into multiple transaction blocks when the same
        director has multiple transactions (repeated Date of transaction fields).

        e.g. Discovery example with transactions on 9 March and 10 March,
        or Lighthouse with multiple purchase dates.

        Only splits if there are 2+ date entries — a single "Date of transaction"
        should NOT cause a split (it would separate Nature from Shares).
        """
        # Count date occurrences first
        date_count_pattern = r'(?:Date\s+(?:of\s+)?(?:the\s+)?transaction|Transaction\s+date|DATE\s+OF\s+TRANSACTION)\s*[:\-]?'
        dates_found = re.findall(date_count_pattern, text, re.IGNORECASE)

        if len(dates_found) < 2:
            # Try numbered transaction splitting before giving up
            # Handles Hudaco-style: "Nature of transaction 1:", "Nature of transaction 2:"
            numbered_natures = re.findall(
                r'Nature\s+of\s+(?:the\s+)?transaction\s+(\d+)\s*[:\-]',
                text, re.IGNORECASE
            )
            if len(numbered_natures) >= 2:
                split_pattern = r'(?=(?:^|\n)\s*Nature\s+of\s+(?:the\s+)?transaction\s+(?:[2-9]|\d{2,})\s*[:\-])'
                parts = re.split(split_pattern, text, flags=re.IGNORECASE | re.MULTILINE)
                parts = [p.strip() for p in parts if p.strip()]
                if len(parts) > 1:
                    return parts

            # Hudaco style: "Transaction 1 - Acquisition" / "Transaction 2 - Sale"
            numbered_tx = re.findall(
                r'Transaction\s+(\d+)\s*[\-–—]',
                text, re.IGNORECASE
            )
            if len(numbered_tx) >= 2:
                split_pattern = r'(?=(?:^|\n)\s*Transaction\s+(?:[2-9]|\d{2,})\s*[\-–—])'
                parts = re.split(split_pattern, text, flags=re.IGNORECASE | re.MULTILINE)
                parts = [p.strip() for p in parts if p.strip()]
                if len(parts) > 1:
                    # Prepend header (director info before Transaction 1) to each block
                    header_match = re.search(r'(?i)Transaction\s+1\s*[\-–—]', parts[0])
                    if header_match:
                        header = parts[0][:header_match.start()].strip()
                        if header:
                            return [parts[0]] + [header + "\n" + p for p in parts[1:]]
                    return parts

            return [text]  # Only one or zero dates — don't split

        # Split on the second and subsequent date lines
        date_pattern = r'(?=\n\s*(?:Date\s+(?:of\s+)?(?:the\s+)?transaction|Transaction\s+date|DATE\s+OF\s+TRANSACTION)\s*[:\-]?)'
        parts = re.split(date_pattern, text, flags=re.IGNORECASE)
        parts = [p.strip() for p in parts if p.strip()]

        if len(parts) > 1:
            # Merge the header (before first date) with ALL date blocks
            # so each block has both its type and its date/shares/value
            # The first part has fields like "Name:", "Nature of transaction:"
            # Subsequent parts start with "Date of transaction:"
            header = parts[0]
            merged = [header + "\n" + parts[1]]
            # Prepend header to all subsequent date blocks too so they
            # inherit Nature of transaction, Class of securities, etc.
            for part in parts[2:]:
                merged.append(header + "\n" + part)
            return merged
        return [text]

    def _make_deal(self, section: str, director: str, role: str,
                   common_date: str, common_type_raw: str, common_class: str,
                   common_interest: str, common_clearance: str,
                   currency: str = "ZAR", exchange: str = "JSE") -> Optional[ParsedDeal]:
        """Build a ParsedDeal from a section of text."""
        date_raw = self._extract(section, "transaction_date") or common_date or ""
        type_raw = self._extract(section, "transaction_type") or common_type_raw or ""
        shares_raw = self._extract(section, "shares")
        price_raw = self._extract(section, "price")
        value_raw = self._extract(section, "value")
        interest_raw = self._extract(section, "nature_of_interest") or common_interest
        clearance_raw = self._extract(section, "clearance") or common_clearance
        class_raw = self._extract(section, "class_of_securities") or common_class

        shares = clean_int(shares_raw) if shares_raw else 0
        price = clean_number(price_raw) if price_raw else 0.0
        value = clean_number(value_raw) if value_raw else 0.0

        # If price label says "(cents)" or "(cps)", convert to Rands
        if price and re.search(r'price\s+per\s+(?:share|security)\s*\(cents?\)', section, re.IGNORECASE):
            price = price / 100.0

        # Always prefer calculated value (price × shares) over extracted value
        # to avoid format parsing issues (e.g. European decimal "2 687 827,55")
        if shares and price:
            value = shares * price
        # Calculate price if not provided but value is
        elif not price and shares and value:
            price = value / shares if shares > 0 else 0.0

        # Confidence scoring
        confidence = 1.0
        if not director or director == "Director":
            confidence -= 0.3
        if not shares:
            confidence -= 0.2
        if not price:
            confidence -= 0.2
        if not date_raw:
            confidence -= 0.1
        if not type_raw:
            confidence -= 0.1
        confidence = max(0.0, confidence)

        # Classify transaction with LLM fallback if available
        tx_type = classify_transaction(
            type_raw,
            llm_fallback=bool(self.api_key),
            api_key=self.api_key,
        )

        return ParsedDeal(
            director=director,
            role=role,
            transaction_date=parse_date(date_raw),
            transaction_type=tx_type,
            shares=shares or 0,
            price=round(price or 0.0, 4),
            value=round(value or 0.0, 2),
            class_of_securities=class_raw or "Ordinary shares",
            nature_of_interest=classify_interest(interest_raw or ""),
            clearance_received="yes" in (clearance_raw or "").lower(),
            confidence=round(confidence, 2),
            currency=currency,
            exchange=exchange,
        )

    def parse(self, text: str) -> list:
        """Parse one SENS announcement into one or more deals."""
        deals = []

        # Detect currency and exchange from the full announcement
        currency = detect_currency(text)
        exchange = detect_exchange(text)

        # Extract fields common across the entire announcement
        common_date = self._extract(text, "transaction_date")
        common_type_raw = self._extract(text, "transaction_type")
        common_class = self._extract(text, "class_of_securities") or "Ordinary shares"
        common_interest = self._extract(text, "nature_of_interest") or ""
        common_clearance = self._extract(text, "clearance") or ""
        common_price = self._extract(text, "price")

        # Split into per-director blocks
        blocks = self._split_into_blocks(text)

        for block in blocks:
            # Lettered splits (A) Name:, B) Name:) tag blocks with __LETTERED_NAME__
            # The first line after the tag IS the director name value
            from_lettered = block.startswith("__LETTERED_NAME__\n")
            if from_lettered:
                block = block[len("__LETTERED_NAME__\n"):]

            director = self._extract(block, "director_name")
            if not director:
                # For single-block announcements, also try the full text
                if len(blocks) == 1:
                    director = self._extract(text, "director_name")
                if not director and from_lettered:
                    # From a lettered split — first line is the name value
                    first_line = block.strip().split('\n')[0].strip()
                    if first_line:
                        director = first_line
                if not director:
                    continue  # Can't identify director, skip

            # Check if this is an associate dealing — "Name of associate: Titan" means
            # the entity did the trade but the linked director is elsewhere in the text
            is_associate = bool(re.search(r'Name\s+of\s+associate\s*[:\-]', block, re.IGNORECASE))
            if is_associate:
                # Extract the parent directors from the full announcement header
                # "Name of directors: Dr CH Wiese\n                   Adv JD Wiese"
                dir_match = re.search(
                    r'Name\s+of\s+directors?\s*[:\-]\s*(.+?)(?=\n\s*\n|\nRelationship|\nName\s+of\s+associate)',
                    text, re.IGNORECASE | re.DOTALL
                )
                if dir_match:
                    # Could be multi-line: "Dr CH Wiese\n                    Adv JD Wiese"
                    raw_dirs = dir_match.group(1).strip()
                    # Split on newlines, clean each
                    dir_names = [d.strip() for d in raw_dirs.split('\n') if d.strip()]
                    # Use first director, append associate entity name
                    if dir_names:
                        director = dir_names[0] + " (via " + director.strip() + ")"

            # Clean director name — remove PDMR labels, trailing junk
            director = clean_director_name(director)
            if not director:
                continue

            role = self._extract(block, "role") or self._extract(text, "role") or "Director"

            # If role is just "PDMR", try to find a better title from the announcement
            if role.strip().upper() == "PDMR":
                # Check announcement title/text for specific titles
                title_match = re.search(
                    r'(?:by\s+(?:a\s+)?)(prescribed\s+officer|executive\s+director|non[- ]executive\s+director|'
                    r'chief\s+executive|chief\s+financial|chairman|ceo|cfo)',
                    text, re.IGNORECASE
                )
                if title_match:
                    role = title_match.group(1).strip().title()
                else:
                    # Check for "Prescribed Officer : Name" pattern — the label IS the role
                    label_match = re.search(
                        r'(Prescribed\s+Officer|Executive\s+Director|Non[- ]Executive\s+Director)\s*[:\-]\s*' + re.escape(director),
                        text, re.IGNORECASE
                    )
                    if label_match:
                        role = label_match.group(1).strip().title()
                    else:
                        role = "Director"  # Default instead of unhelpful "PDMR"

            # Check for multiple transactions within this director's block
            tx_blocks = self._split_transactions(block)

            if len(tx_blocks) > 1:
                for tx_block in tx_blocks:
                    deal = self._make_deal(
                        tx_block, director, role,
                        common_date, common_type_raw, common_class,
                        common_interest, common_clearance,
                        currency, exchange,
                    )
                    if deal and (deal.shares or deal.value):
                        deals.append(deal)
            else:
                deal = self._make_deal(
                    block, director, role,
                    common_date, common_type_raw, common_class,
                    common_interest, common_clearance,
                    currency, exchange,
                )
                if deal and (deal.shares or deal.value or deal.price):
                    deals.append(deal)

        # If we got nothing from block splitting, try parsing the whole text as one deal
        if not deals:
            director = self._extract(text, "director_name")
            if director:
                director = clean_director_name(director)
            if director:
                role = self._extract(text, "role") or "Director"
                if role.strip().upper() == "PDMR":
                    title_match = re.search(
                        r'(?:by\s+(?:a\s+)?)(prescribed\s+officer|executive\s+director|non[- ]executive\s+director|'
                        r'chief\s+executive|chief\s+financial|chairman|ceo|cfo)',
                        text, re.IGNORECASE
                    )
                    role = title_match.group(1).strip().title() if title_match else "Director"
                deal = self._make_deal(
                    text, director, role,
                    common_date, common_type_raw, common_class,
                    common_interest, common_clearance,
                    currency, exchange,
                )
                if deal and (deal.shares or deal.value or deal.price):
                    deals.append(deal)

        return deals


# ─── LLM Parser (Anthropic Claude) ──────────────────────────────────────────

class LLMParser:
    """
    Uses Claude to extract structured data from SENS text.
    Handles edge cases, unusual formatting, and complex announcements.

    Only called when:
      - Regex parser returns low confidence (<0.6)
      - Announcement contains unusual structure
      - Multiple directors in complex formats
    """

    SYSTEM_PROMPT = """You are a financial data extraction specialist for the
Johannesburg Stock Exchange (JSE). You extract structured director dealing
information from SENS announcements.

Extract ALL director dealings from the text. For each dealing, return a JSON
object with these exact fields:

{
  "director": "Full name of the director",
  "role": "Their position (CEO, CFO, Non-Executive Director, etc.)",
  "transaction_date": "YYYY-MM-DD format",
  "transaction_type": one of "Buy", "Sell", "Vesting", "TaxSale", "OptionsExercise", "Conversion",
  "shares": integer number of shares,
  "price": float price per share in ZAR,
  "value": float total value in ZAR,
  "class_of_securities": "e.g. Ordinary shares",
  "nature_of_interest": "Direct" or "Indirect",
  "clearance_received": true or false
}

Transaction type classification:
- "Buy": On-market purchases, acquisitions of shares
- "Sell": On-market sales, disposals of shares
- "Vesting": LTI awards, share plan vestings, conditional share awards
- "TaxSale": Sales to fund/settle tax obligations, net settlements for tax
- "OptionsExercise": Exercise of share options, share appreciation rights (SARs)
- "Conversion": Conversion of securities, rights issues, scrip dividends

Return ONLY a JSON array of these objects. No markdown, no explanation.
If you cannot determine a field, use null."""

    def __init__(self, api_key: str):
        self.api_key = api_key

    def parse(self, text: str) -> list:
        """Send SENS text to Claude for extraction."""
        try:
            import anthropic

            client = anthropic.Anthropic(api_key=self.api_key)

            message = client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=2000,
                system=self.SYSTEM_PROMPT,
                messages=[{
                    "role": "user",
                    "content": f"Extract all director dealings from this SENS announcement:\n\n{text[:6000]}"
                }]
            )

            response_text = message.content[0].text.strip()

            # Clean any markdown formatting
            response_text = re.sub(r'^```json\s*', '', response_text)
            response_text = re.sub(r'\s*```$', '', response_text)

            data = json.loads(response_text)

            deals = []
            for item in data:
                deals.append(ParsedDeal(
                    director=item.get("director", "Unknown"),
                    role=item.get("role", "Director"),
                    transaction_date=item.get("transaction_date", ""),
                    transaction_type=item.get("transaction_type", "Unknown"),
                    shares=item.get("shares", 0) or 0,
                    price=item.get("price", 0.0) or 0.0,
                    value=item.get("value", 0.0) or 0.0,
                    class_of_securities=item.get("class_of_securities", "Ordinary shares"),
                    nature_of_interest=item.get("nature_of_interest", "Unknown"),
                    clearance_received=item.get("clearance_received", False),
                    confidence=0.85,  # LLM extractions get baseline 0.85
                ))

            return deals

        except Exception as e:
            logger.error(f"LLM parsing failed: {e}")
            return []


# ─── Combined Parser ─────────────────────────────────────────────────────────

class SENSParser:
    """
    Combined parser: tries regex first, falls back to LLM for low-confidence results.

    Usage:
        parser = SENSParser(anthropic_api_key="sk-...")
        deals = parser.parse(raw_text, ticker="NPN", company="Naspers")
    """

    # Confidence threshold below which we escalate to LLM
    LLM_THRESHOLD = 0.6

    def __init__(self, anthropic_api_key: str = None):
        self.api_key = anthropic_api_key
        self.regex_parser = RegexParser(anthropic_api_key=anthropic_api_key)
        self.llm_parser = LLMParser(anthropic_api_key) if anthropic_api_key else None

    def parse(self, text: str, ticker: str = "", company: str = "") -> list:
        """
        Parse a SENS announcement into structured director dealings.

        1. Try regex extraction first (fast, free)
        2. If confidence < threshold, escalate to LLM
        3. Return best results
        """
        # Step 1: Regex parse
        deals = self.regex_parser.parse(text)

        if not deals:
            # No results from regex — try LLM if available
            if self.llm_parser:
                logger.info(f"Regex found nothing for {ticker}, escalating to LLM")
                deals = self.llm_parser.parse(text)
            return deals

        # Step 2: Check confidence
        avg_confidence = sum(d.confidence for d in deals) / len(deals)

        if avg_confidence < self.LLM_THRESHOLD and self.llm_parser:
            logger.info(
                f"Low regex confidence ({avg_confidence:.2f}) for {ticker}, "
                f"escalating to LLM"
            )
            llm_deals = self.llm_parser.parse(text)
            if llm_deals:
                return llm_deals  # Prefer LLM results when regex is uncertain

        return deals


# ─── Testing ─────────────────────────────────────────────────────────────────

SAMPLE_SENS = """
Naspers Limited
(Incorporated in the Republic of South Africa)
(Registration number 1925/001431/06)
JSE share code: NPN
ISIN: ZAE000325783

DEALING IN SECURITIES BY A DIRECTOR

In compliance with rules 3.63 to 3.74 of the JSE Limited Listings Requirements,
the following information is disclosed:

Director: Mark Sorour
Company: Naspers Limited
Transaction date: 25 March 2024
Nature of transaction: on market disposal of shares
Number of shares: 35,434 Naspers N ordinary shares
Average price per share: R4,003.47
Total value of the transaction: R141,874,871.98
Class of securities: N ordinary shares
Nature of interest: Direct beneficial
Written clearance to deal received: Yes

Stellenbosch
27 March 2024
Sponsor: Investec Bank Limited
"""

SAMPLE_MULTI = """
Shoprite Holdings Limited
(Registration number 1936/007721/06)
ISIN no: ZAE 000012084
JSE share code: SHP

DEALINGS IN SECURITIES BY DIRECTORS, THE COMPANY SECRETARY AND
DIRECTORS OF MAIN SUBSIDIARY

In compliance with rule 3.63 of the JSE Listings Requirements:

Date transactions effected: 7 November 2017
Class of securities: Ordinary shares
Nature of transactions: Shares purchased with LTI cash awards
Price per share
Lowest: R205,00 per share
Highest: R209,67 per share
Average: R207.74 per share
Interest: Direct beneficial
Written clearance to deal received: Yes

A) Name: PIETER CHRISTAAN ENGELBRECHT
Office Held: Executive Director
Number of shares: 50,873 ordinary shares
Value of the transaction: R10,568,357.02

B) Name: ANTON DE BRUYN
Office Held: CFO and Executive Director
Number of shares: 32,441 ordinary shares
Value of the transaction: R6,739,283.34
"""

SAMPLE_ARGENT = """
ARGENT INDUSTRIAL LIMITED
(Incorporated in the Republic of South Africa)
Registration number: 1993/002054/06
JSE share code: ART
ISIN: ZAE000019188

DEALINGS IN SECURITIES BY A DIRECTOR OF THE COMPANY

 NAME OF DIRECTOR                                TR Hendry
 COMPANY OF WHICH A DIRECTOR                     Argent
 STATUS: EXECUTIVE/NON-EXECUTIVE                 Executive director
 TYPE AND CLASS OF SECURITIES                    Ordinary shares
 NATURE OF TRANSACTION                           Purchase of shares by a director
                                                 (on-market transaction)
 DATE OF TRANSACTION                             12 March 2026
 PRICE PER SECURITY                              R33.11
 NUMBER OF SECURITIES TRANSACTED                 1,200
 TOTAL RAND VALUE OF SECURITIES TRANSACTED       R39,732
 NATURE AND EXTENT OF INTEREST IN THE TRANSACTION  Direct, beneficial
"""

SAMPLE_LIGHTHOUSE = """
Lighthouse Properties plc
Registered in Guernsey
Guernsey registration number: 67712
JSE share code: LTE
ISIN: GG00BMDF5H44

DEALING IN SECURITIES BY AN ASSOCIATE OF A DIRECTOR OF THE COMPANY

Name of associate:                                            Delsa Investments (Pty) Ltd ('Delsa')
Name of director and relationship to associate:               Desmond de Beer is a beneficiary of the trust that has a controlling interest in Delsa.
Transaction date:                                             11 March 2026
Class of securities:                                          Ordinary shares
Number of securities:                                         992 906
Weighted average price per security:                          ZAR 7.9037
Total value:                                                  ZAR 7 847 631.15
Nature of transaction:                                        On-market purchase of ordinary shares
Nature and extent of director's interest:                     Indirect beneficial
Clearance to deal received:                                   Yes
"""

SAMPLE_GRINDROD = """
Grindrod Limited
(Registration number 1966/009846/06)
JSE share code: GND
ISIN: ZAE000072328

DEALINGS IN SECURITIES BY DIRECTORS AND THE COMPANY SECRETARY

Name:                                                Vicky Commaille
Designation:                                         Company Secretary
Class of securities:                                 Ordinary shares
Nature of transaction:                               Sale of securities (on market)
Date of transaction:                                 12 March 2026
Number of securities:                                16 667
Volume weighted average price per security:          R17.2004
Total value:                                         R286 679.07
Extent of interest:                                  Direct beneficial
Clearance to deal obtained:                          Yes

Name:                                                Xolani Memory Mbambo
Designation:                                         Non-Executive Director
Class of securities:                                 Ordinary shares
Nature of transaction:                               Purchase of securities (on market)
Date of transaction:                                 12 March 2026
Number of securities:                                10 000
Volume weighted average price per security:          R17.0894
Total value:                                         R170 894.00
Extent of interest:                                  Direct beneficial
Clearance to deal obtained:                          Yes
"""


if __name__ == "__main__":
    parser = SENSParser()

    tests = [
        ("Single director - Naspers", SAMPLE_SENS, "NPN", "Naspers"),
        ("Multi-director lettered - Shoprite", SAMPLE_MULTI, "SHP", "Shoprite"),
        ("Uppercase format - Argent", SAMPLE_ARGENT, "ART", "Argent Industrial"),
        ("ZAR currency - Lighthouse", SAMPLE_LIGHTHOUSE, "LTE", "Lighthouse Properties"),
        ("Repeated blocks - Grindrod", SAMPLE_GRINDROD, "GND", "Grindrod"),
    ]

    for name, sample, ticker, company in tests:
        print(f"\n{'='*60}")
        print(f"TEST: {name}")
        print(f"{'='*60}")
        deals = parser.parse(sample, ticker=ticker, company=company)
        if deals:
            for d in deals:
                print(json.dumps(asdict(d), indent=2))
        else:
            print("  NO DEALS PARSED!")
        print(f"  => {len(deals)} deal(s)")
