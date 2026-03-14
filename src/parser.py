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
    transaction_type: str       # Buy / Sell
    shares: int
    price: float
    value: float
    class_of_securities: str
    nature_of_interest: str     # Direct / Indirect
    clearance_received: bool
    confidence: float           # 0-1


# ─── Regex Patterns ──────────────────────────────────────────────────────────
# These patterns match the standard SENS format for director dealings.
# The format is semi-structured free text, not XML, so we use flexible patterns.

PATTERNS = {
    "director_name": [
        r"(?:Name(?:\s+of\s+director)?|Director)\s*[:\-]\s*(.+?)(?:\n|$)",
        r"(?:^|\n)\s*(?:A\)|B\)|C\)|D\)|1\.|2\.|3\.|4\.)\s*Name\s*[:\-]?\s*(.+?)(?:\n|$)",
    ],
    "role": [
        r"(?:Office\s+Held|Designation|Position|Capacity)\s*[:\-]\s*(.+?)(?:\n|$)",
    ],
    "transaction_date": [
        r"(?:Date\s+(?:of\s+)?transaction(?:s)?\s+effected|Date\s+transaction\s+effected|Transaction\s+date)\s*[:\-]?\s*(.+?)(?:\n|$)",
        r"(?:Date\s+of\s+(?:the\s+)?transaction)\s*[:\-]?\s*(.+?)(?:\n|$)",
    ],
    "transaction_type": [
        r"(?:Nature\s+of\s+transactions?)\s*[:\-]\s*(.+?)(?:\n|$)",
        r"(?:Type\s+of\s+transaction)\s*[:\-]\s*(.+?)(?:\n|$)",
    ],
    "shares": [
        r"(?:Number\s+of\s+(?:shares|securities)(?:\s+(?:purchased|sold|disposed))?)\s*[:\-]?\s*([\d\s,]+)",
        r"([\d,\s]+)\s+(?:ordinary\s+)?shares",
    ],
    "price": [
        r"(?:Volume\s+weighted\s+average\s+(?:purchase\s+)?price(?:\s+per\s+(?:share|security))?)\s*[:\-]?\s*R?\s*([\d\s,\.]+)",
        r"(?:(?:Average\s+)?[Pp]rice\s+per\s+(?:share|security))\s*[:\-]?\s*R?\s*([\d\s,\.]+)",
    ],
    "value": [
        r"(?:(?:Total\s+)?[Vv]alue\s+of\s+(?:the\s+)?transaction)\s*[:\-]?\s*R?\s*([\d\s,\.]+)",
    ],
    "class_of_securities": [
        r"(?:Class\s+of\s+(?:shares|securities))\s*[:\-]\s*(.+?)(?:\n|$)",
    ],
    "nature_of_interest": [
        r"(?:(?:Nature\s+of\s+)?[Ii]nterest)\s*[:\-]\s*(.+?)(?:\n|$)",
        r"^Interest\s*[:\-]\s*(.+?)(?:\n|$)",
    ],
    "clearance": [
        r"(?:Written\s+clearance\s+to\s+deal\s+(?:received|obtained))\s*[:\-]?\s*(.+?)(?:\n|$)",
        r"(?:Clearance\s+to\s+deal)\s*[:\-]?\s*(.+?)(?:\n|$)",
        r"(?:Clearance\s+(?:received|obtained))\s*[:\-]?\s*(.+?)(?:\n|$)",
    ],
}


# ─── Helper Functions ────────────────────────────────────────────────────────

def clean_number(text: str) -> Optional[float]:
    """Parse a number from text like '48,031,250.00' or '48 031 250'."""
    if not text:
        return None
    cleaned = re.sub(r'[^\d.]', '', text.replace(' ', '').replace(',', ''))
    try:
        return float(cleaned) if '.' in cleaned else float(cleaned)
    except (ValueError, TypeError):
        return None


def clean_int(text: str) -> Optional[int]:
    """Parse an integer from text like '12,500' or '12 500'."""
    val = clean_number(text)
    return int(val) if val is not None else None


def parse_date(text: str) -> Optional[str]:
    """Try to parse a date string into YYYY-MM-DD format."""
    import re
    from datetime import datetime

    text = text.strip()

    # Try common formats
    formats = [
        "%d %B %Y",         # 25 March 2024
        "%d %b %Y",         # 25 Mar 2024
        "%Y-%m-%d",          # 2024-03-25
        "%d/%m/%Y",          # 25/03/2024
        "%d %B, %Y",        # 25 March, 2024
        "%B %d, %Y",        # March 25, 2024
    ]

    for fmt in formats:
        try:
            dt = datetime.strptime(text.strip(), fmt)
            return dt.strftime("%Y-%m-%d")
        except ValueError:
            continue

    return text  # Return as-is if we can't parse


def classify_transaction(text: str) -> str:
    """
    Classify transaction as Buy, Sell, Vesting, or TaxSale.

    Vestings and TaxSales are non-discretionary — they don't signal
    insider sentiment and should be filtered out of analysis.
    """
    lower = text.lower()

    # Check non-discretionary types first (more specific)
    tax_sale_keywords = [
        "to fund tax", "to settle tax", "tax obligation", "tax liability",
        "net settlement", "non-discretionary", "tax withheld",
    ]
    vesting_keywords = [
        "lti award", "lti cash award", "performance share plan", "psp award",
        "restricted share plan", "rsp award", "conditional share plan",
        "csp award", "vesting of", "shares vested", "share award",
        "forfeitable share", "conditional share rights",
        "share appreciation right",
    ]

    for kw in tax_sale_keywords:
        if kw in lower:
            return "TaxSale"
    for kw in vesting_keywords:
        if kw in lower:
            return "Vesting"

    # Discretionary transactions
    sell_keywords = ["sale", "sold", "disposal", "selling", "on-market disposal",
                     "on market disposal", "on-market sale"]
    buy_keywords = ["purchase", "purchased", "bought", "acquisition",
                    "on-market purchase", "on market purchase",
                    "shares purchased"]

    for kw in sell_keywords:
        if kw in lower:
            return "Sell"
    for kw in buy_keywords:
        if kw in lower:
            return "Buy"
    return "Unknown"


def classify_interest(text: str) -> str:
    """Classify as Direct or Indirect interest."""
    text = text.lower()
    if "indirect" in text:
        return "Indirect"
    if "direct" in text:
        return "Direct"
    return "Unknown"


# ─── Regex Parser ────────────────────────────────────────────────────────────

class RegexParser:
    """
    Extracts director dealing fields using regex patterns.
    Works well for standard-format SENS announcements.
    """

    def _extract(self, text: str, field: str) -> Optional[str]:
        """Try each pattern for a field, return first match."""
        for pattern in PATTERNS.get(field, []):
            match = re.search(pattern, text, re.IGNORECASE | re.MULTILINE)
            if match:
                return match.group(1).strip()
        return None

    def _extract_all(self, text: str, field: str) -> list[str]:
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

    def _split_multiple_directors(self, text: str) -> list[str]:
        """
        Some announcements contain multiple directors in one filing.
        Split on patterns like 'A) Name:', 'B) Name:', '1. Name:', etc.
        """
        # Try to find numbered/lettered sections
        sections = re.split(
            r'(?:^|\n)\s*(?:[A-Z]\)|[0-9]+[\.\)])\s*Name\s*[:\-]',
            text, flags=re.IGNORECASE | re.MULTILINE
        )

        if len(sections) > 1:
            # First section is the header, rest are individual directors
            return sections[1:]

        return [text]

    def _split_transactions(self, text: str) -> list[str]:
        """
        Split a section into multiple transaction blocks when the same
        director has multiple transactions (repeated Date of transaction fields).

        e.g. Discovery example with transactions on 9 March and 10 March.
        """
        # Split on "Date of transaction" / "Date transaction effected" lines
        date_pattern = r'(?=(?:Date\s+(?:of\s+)?transaction(?:s)?\s*(?:effected)?\s*[:\-]))'
        parts = re.split(date_pattern, text, flags=re.IGNORECASE)
        parts = [p.strip() for p in parts if p.strip()]

        if len(parts) > 1:
            return parts
        return [text]

    def _make_deal(self, section: str, director: str, role: str,
                   common_date: str, common_type_raw: str, common_class: str,
                   common_interest: str, common_clearance: str) -> Optional[ParsedDeal]:
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

        # Calculate value if not provided
        if not value and shares and price:
            value = shares * price
        # Calculate price if not provided
        if not price and shares and value:
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
        confidence = max(0.0, confidence)

        return ParsedDeal(
            director=director,
            role=role,
            transaction_date=parse_date(date_raw),
            transaction_type=classify_transaction(type_raw),
            shares=shares or 0,
            price=price or 0.0,
            value=value or 0.0,
            class_of_securities=class_raw,
            nature_of_interest=classify_interest(interest_raw),
            clearance_received="yes" in clearance_raw.lower(),
            confidence=round(confidence, 2),
        )

    def parse(self, text: str) -> list[ParsedDeal]:
        """Parse one SENS announcement into one or more deals."""
        deals = []
        sections = self._split_multiple_directors(text)

        # Extract fields that are common across all directors in this filing
        common_date = self._extract(text, "transaction_date")
        common_type_raw = self._extract(text, "transaction_type")
        common_class = self._extract(text, "class_of_securities") or "Ordinary shares"
        common_interest = self._extract(text, "nature_of_interest") or ""
        common_clearance = self._extract(text, "clearance") or ""

        for section in sections:
            # For each director section, extract their specific fields
            # falling back to common fields where needed
            director = self._extract(section, "director_name")
            if not director:
                # Try to find name at the start of the section
                first_line = section.strip().split('\n')[0].strip()
                if first_line and len(first_line) < 80 and not any(
                    kw in first_line.lower() for kw in ['date', 'class', 'nature', 'price']
                ):
                    director = first_line
                else:
                    continue  # Can't identify director, skip

            role = self._extract(section, "role") or "Director"

            # Check for multiple transactions within this director's section
            tx_blocks = self._split_transactions(section)

            if len(tx_blocks) > 1:
                # Multiple transactions for same director
                for tx_block in tx_blocks:
                    deal = self._make_deal(
                        tx_block, director, role,
                        common_date, common_type_raw, common_class,
                        common_interest, common_clearance,
                    )
                    if deal and (deal.shares or deal.value):
                        deals.append(deal)
            else:
                deal = self._make_deal(
                    section, director, role,
                    common_date, common_type_raw, common_class,
                    common_interest, common_clearance,
                )
                if deal:
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
  "transaction_type": "Buy" or "Sell",
  "shares": integer number of shares,
  "price": float price per share in ZAR,
  "value": float total value in ZAR,
  "class_of_securities": "e.g. Ordinary shares",
  "nature_of_interest": "Direct" or "Indirect",
  "clearance_received": true or false
}

Return ONLY a JSON array of these objects. No markdown, no explanation.
If you cannot determine a field, use null.
"Buy" includes: purchases, awards, vestings, exercises.
"Sell" includes: sales, disposals, on-market selling."""

    def __init__(self, api_key: str):
        self.api_key = api_key

    def parse(self, text: str) -> list[ParsedDeal]:
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
        self.regex_parser = RegexParser()
        self.llm_parser = LLMParser(anthropic_api_key) if anthropic_api_key else None

    def parse(self, text: str, ticker: str = "", company: str = "") -> list[ParsedDeal]:
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


if __name__ == "__main__":
    parser = SENSParser()

    print("=" * 60)
    print("TEST 1: Single director (Naspers)")
    print("=" * 60)
    deals = parser.parse(SAMPLE_SENS, ticker="NPN", company="Naspers")
    for d in deals:
        print(json.dumps(asdict(d), indent=2))

    print("\n" + "=" * 60)
    print("TEST 2: Multiple directors (Shoprite)")
    print("=" * 60)
    deals = parser.parse(SAMPLE_MULTI, ticker="SHP", company="Shoprite")
    for d in deals:
        print(json.dumps(asdict(d), indent=2))
