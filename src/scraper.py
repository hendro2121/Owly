"""
Raven Company IR Scraper
========================
Scrapes director dealing announcements directly from JSE-listed
company investor relations websites.

No third-party data provider dependency. Each company has its own
IR page structure, so we use a strategy pattern with per-company
adapters plus a generic fallback using search-based discovery.

Architecture:
  1. Discovery: Find announcement URLs via company sitemap, IR feed,
     or search-based crawling
  2. Extraction: Fetch each announcement page and extract the full text
  3. Output: Raw announcement text ready for the SENS parser

Usage:
    scraper = CompanyScraper()
    announcements = scraper.scrape("NPN")       # Single company
    announcements = scraper.scrape_all()         # All Top 40
"""

import re
import time
import json
import logging
import hashlib
from abc import ABC, abstractmethod
from datetime import datetime
from dataclasses import dataclass, asdict, field
from typing import Optional
from urllib.parse import urljoin, urlparse

import requests
import cloudscraper
from bs4 import BeautifulSoup

from companies import JSE_TOP_40

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)


# ─── Configuration ───────────────────────────────────────────────────────────

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/122.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-ZA,en;q=0.9",
}

REQUEST_DELAY = 2.5  # Seconds between requests to same domain


# ─── Data Model ──────────────────────────────────────────────────────────────

@dataclass
class RawAnnouncement:
    """A raw director dealing announcement scraped from a company website."""
    ticker: str
    company: str
    title: str
    date: str                  # Publication date (best effort)
    url: str                   # Source URL
    full_text: str             # Full announcement text
    source_domain: str         # e.g. "naspers.com"
    scraped_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    content_hash: str = ""     # For deduplication

    def __post_init__(self):
        if not self.content_hash and self.full_text:
            self.content_hash = hashlib.md5(self.full_text.encode()).hexdigest()


# ─── Keyword Filters ─────────────────────────────────────────────────────────

DEALING_KEYWORDS = [
    "dealings in securities by director",
    "dealings in securities by a director",
    "dealing in securities by director",
    "dealing in securities by a director",
    "dealings in securities by an associate",
    "dealings in securities by directors",
    "dealings in securities by prescribed officer",
    "dealings in securities by a prescribed officer",
    "dealings in securities by company secretary",
    "director dealing",
    "directors' dealings",
    "director's dealing",
]

def is_director_dealing(text: str) -> bool:
    """Check if text (title or body) relates to director dealings."""
    lower = text.lower()
    return any(kw in lower for kw in DEALING_KEYWORDS)


# ─── Base Strategy ───────────────────────────────────────────────────────────

class ScraperStrategy(ABC):
    """Base class for company-specific scraper strategies."""

    def __init__(self):
        self.session = cloudscraper.create_scraper()
        self.session.headers.update(HEADERS)
        self._last_request_time = {}  # per-domain throttle

    def _throttle(self, domain: str):
        """Rate-limit requests per domain."""
        now = time.time()
        last = self._last_request_time.get(domain, 0)
        wait = REQUEST_DELAY - (now - last)
        if wait > 0:
            time.sleep(wait)
        self._last_request_time[domain] = time.time()

    def fetch(self, url: str, timeout: int = 15) -> Optional[BeautifulSoup]:
        """Fetch URL and return parsed HTML."""
        domain = urlparse(url).netloc
        self._throttle(domain)
        try:
            resp = self.session.get(url, timeout=timeout, allow_redirects=True)
            resp.raise_for_status()
            return BeautifulSoup(resp.text, "html.parser")
        except requests.RequestException as e:
            logger.warning(f"Failed to fetch {url}: {e}")
            return None

    def fetch_text(self, url: str, timeout: int = 15) -> Optional[str]:
        """Fetch URL and return raw text content."""
        domain = urlparse(url).netloc
        self._throttle(domain)
        try:
            resp = self.session.get(url, timeout=timeout, allow_redirects=True)
            resp.raise_for_status()
            return resp.text
        except requests.RequestException as e:
            logger.warning(f"Failed to fetch {url}: {e}")
            return None

    def extract_text_from_soup(self, soup: BeautifulSoup) -> str:
        """Extract clean text from a BeautifulSoup page, removing nav/footer."""
        # Remove noise elements
        for tag in soup.find_all(["nav", "footer", "header", "script",
                                   "style", "noscript", "aside"]):
            tag.decompose()

        # Try to find main content area
        main = (
            soup.find("main") or
            soup.find("article") or
            soup.find(class_=re.compile(r"content|article|announcement|body", re.I)) or
            soup.find(id=re.compile(r"content|article|main", re.I)) or
            soup.find("body")
        )

        if main:
            return main.get_text(separator="\n", strip=True)
        return soup.get_text(separator="\n", strip=True)

    @abstractmethod
    def discover(self, ticker: str, company_info: dict) -> list[dict]:
        """
        Discover director dealing announcement URLs.
        Returns list of {"title": ..., "url": ..., "date": ...}
        """
        pass

    def extract(self, url: str) -> Optional[str]:
        """Fetch an announcement page and extract the full text."""
        soup = self.fetch(url)
        if not soup:
            return None
        return self.extract_text_from_soup(soup)


# ─── Strategy: Naspers / Prosus (Sitecore CMS) ──────────────────────────────

class NaspersStrategy(ScraperStrategy):
    """
    Naspers publishes regulatory updates at:
    naspers.com/news-insights/regulatory-updates

    The page is JS-rendered (Sitecore), but individual announcement URLs
    follow a predictable pattern and are indexed by search engines.
    We discover them via the sitemap or Google.
    """

    BASE_URL = "https://www.naspers.com"
    REGULATORY_PATH = "/news-insights/regulatory-updates"

    def discover(self, ticker: str, company_info: dict) -> list[dict]:
        results = []

        # Try fetching the regulatory updates page
        soup = self.fetch(f"{self.BASE_URL}{self.REGULATORY_PATH}")
        if soup:
            # Look for links containing "dealing" or "securities"
            for link in soup.find_all("a", href=True):
                href = link["href"]
                text = link.get_text(strip=True)
                if is_director_dealing(text) or is_director_dealing(href):
                    full_url = urljoin(self.BASE_URL, href)
                    date = self._extract_date_from_url(href)
                    results.append({
                        "title": text or "Dealing in securities",
                        "url": full_url,
                        "date": date,
                    })

        logger.info(f"  Naspers IR: found {len(results)} dealing announcements")
        return results

    def _extract_date_from_url(self, url: str) -> str:
        """Naspers URLs contain year: /regulatory-updates/2025/dealing-..."""
        match = re.search(r'/(\d{4})/', url)
        return match.group(1) if match else ""


# ─── Strategy: Standard CMS Pattern ─────────────────────────────────────────

class StandardIRStrategy(ScraperStrategy):
    """
    Generic strategy for companies with standard IR/news page layouts.

    Works by:
    1. Fetching the company's IR news/announcements/SENS page
    2. Finding all links on the page
    3. Filtering for director dealing keywords
    4. Following links to get full announcement text

    This handles companies like:
    - Standard Bank, FirstRand, Absa, Nedbank (bank IR pages)
    - MTN, Vodacom (telecoms)
    - Shoprite, Woolworths (retail)
    - Anglo American, BHP, Gold Fields (miners)
    """

    # Per-company news/SENS page URLs
    NEWS_PAGES = {
        "SBK": [
            "https://www.standardbank.com/sbg/standard-bank-group/investor-relations/information-hub/sens-announcements",
        ],
        "FSR": [
            "https://www.firstrand.co.za/investors/sens-announcements/",
        ],
        "ABG": [
            "https://www.absa.africa/investor-relations/sens-announcements/",
        ],
        "NED": [
            "https://www.nedbank.co.za/content/nedbank/desktop/gt/en/aboutus/investor-centre/sens-announcements.html",
        ],
        "DSY": [
            "https://www.discovery.co.za/corporate/investor-relations-sens",
        ],
        "SLM": [
            "https://www.sanlam.com/investors/shareholder-information/sens-announcements",
        ],
        "OMU": [
            "https://www.oldmutual.com/investor-relations/reporting-centre/sens-announcements",
        ],
        "CPI": [
            "https://www.capitecbank.co.za/investor-relations/sens",
        ],
        "MTN": [
            "https://www.mtn.com/investors/financial-reporting/sens-announcements/",
        ],
        "VOD": [
            "https://www.vodacom.com/sens.php",
        ],
        "SHP": [
            "https://www.shopriteholdings.co.za/investors/sens.html",
        ],
        "WHL": [
            "https://www.woolworthsholdings.co.za/investors/sens-announcements/",
        ],
        "AGL": [
            "https://www.angloamerican.com/investors/regulatory-announcements",
        ],
        "SOL": [
            "https://www.sasol.com/investors/sens-announcements",
        ],
        "GFI": [
            "https://www.goldfields.com/sens-announcements.php",
        ],
        "SSW": [
            "https://www.sibanyestillwater.com/investors/sens/",
        ],
        "REM": [
            "https://www.remgro.com/investors/sens-announcements/",
        ],
        "APN": [
            "https://www.aspenpharma.com/investor-relations/sens-announcements/",
        ],
    }

    def discover(self, ticker: str, company_info: dict) -> list[dict]:
        pages = self.NEWS_PAGES.get(ticker, [])
        results = []

        for page_url in pages:
            logger.info(f"  Fetching IR page: {page_url}")
            soup = self.fetch(page_url)
            if not soup:
                continue

            for link in soup.find_all("a", href=True):
                text = link.get_text(strip=True)
                href = link["href"]

                if is_director_dealing(text) or is_director_dealing(href):
                    full_url = urljoin(page_url, href)
                    date = self._guess_date(link, href)
                    results.append({
                        "title": text or "Director dealing",
                        "url": full_url,
                        "date": date,
                    })

        # Also try the company's general IR page as fallback
        if not results and company_info.get("ir_page"):
            ir_url = company_info["ir_page"]
            logger.info(f"  Trying general IR page: {ir_url}")
            soup = self.fetch(ir_url)
            if soup:
                for link in soup.find_all("a", href=True):
                    text = link.get_text(strip=True)
                    if is_director_dealing(text):
                        full_url = urljoin(ir_url, link["href"])
                        results.append({
                            "title": text,
                            "url": full_url,
                            "date": self._guess_date(link, link["href"]),
                        })

        logger.info(f"  {ticker} IR: found {len(results)} dealing announcements")
        return results

    def _guess_date(self, element, href: str) -> str:
        """Try to extract a date from context."""
        # Check URL for date patterns
        url_match = re.search(r'(\d{4})[/-](\d{2})[/-](\d{2})', href)
        if url_match:
            return f"{url_match.group(1)}-{url_match.group(2)}-{url_match.group(3)}"

        # Check surrounding text
        parent = element.parent
        if parent:
            text = parent.get_text()
            patterns = [
                r'(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4})',
                r'(\d{4}-\d{2}-\d{2})',
                r'(\d{2}/\d{2}/\d{4})',
            ]
            for p in patterns:
                m = re.search(p, text, re.IGNORECASE)
                if m:
                    return m.group(1)

        return ""


# ─── Strategy: PDF-based SENS (JSE instrument pages) ────────────────────────

class JSEInstrumentStrategy(ScraperStrategy):
    """
    The JSE's own instrument pages at jse.co.za/jse/instruments/{id}
    list SENS announcements with downloadable PDFs.

    This is a public-facing page on the JSE website — not the licensed
    SENS data feed. It shows recent announcements with PDF download links.

    Note: PDFs require PDF text extraction (PyPDF2 or pdfplumber).
    """

    # JSE instrument page IDs for Top 40 companies
    JSE_INSTRUMENT_IDS = {
        "SBK": "2831",
        "NPN": "2505",
        "CPI": "9614",
        "FSR": "2476",
        "SHP": "2819",
        "MTN": "17427",
        "ABG": "55134",
        "VOD": "44968",
    }

    def discover(self, ticker: str, company_info: dict) -> list[dict]:
        inst_id = self.JSE_INSTRUMENT_IDS.get(ticker)
        if not inst_id:
            return []

        url = f"https://www.jse.co.za/jse/instruments/{inst_id}"
        logger.info(f"  Fetching JSE instrument page: {url}")
        soup = self.fetch(url)
        if not soup:
            return []

        results = []
        for link in soup.find_all("a", href=True):
            text = link.get_text(strip=True)
            if is_director_dealing(text):
                href = link["href"]
                full_url = urljoin(url, href)
                results.append({
                    "title": text,
                    "url": full_url,
                    "date": "",
                    "is_pdf": href.lower().endswith(".pdf"),
                })

        logger.info(f"  JSE page for {ticker}: found {len(results)} announcements")
        return results


# ─── Strategy: Search-Based Discovery ────────────────────────────────────────

class SearchDiscoveryStrategy(ScraperStrategy):
    """
    Fallback strategy: uses the company's own site search or known URL
    patterns to discover director dealing pages.

    Many corporate sites have a search function or API endpoint that
    returns JSON results. We can query these directly.
    """

    # Known site search endpoints or patterns
    SEARCH_PATTERNS = {
        # Companies where we know the URL pattern for SENS pages
        "NPN": {
            "type": "url_pattern",
            "base": "https://www.naspers.com/news-insights/regulatory-updates",
            "pattern": "/regulatory-updates/{year}/dealing",
        },
    }

    def discover(self, ticker: str, company_info: dict) -> list[dict]:
        config = self.SEARCH_PATTERNS.get(ticker)
        if not config:
            return []

        results = []

        if config["type"] == "url_pattern":
            # Try recent years
            current_year = datetime.now().year
            for year in range(current_year, current_year - 3, -1):
                # Try to find pages matching the pattern
                base = config["base"]
                soup = self.fetch(base)
                if soup:
                    for link in soup.find_all("a", href=True):
                        href = link["href"]
                        if str(year) in href and is_director_dealing(
                            link.get_text(strip=True) + " " + href
                        ):
                            full_url = urljoin(base, href)
                            results.append({
                                "title": link.get_text(strip=True),
                                "url": full_url,
                                "date": str(year),
                            })

        return results


# ─── Strategy: Moneyweb SENS ─────────────────────────────────────────────────

class MoneywebSENSStrategy(ScraperStrategy):
    """
    Scrapes director dealing SENS announcements from Moneyweb's SENS archive.

    Moneyweb aggregates ALL JSE SENS filings in one place with a keyword
    search and date range filter. This replaces per-company IR page scraping.

    Listing page structure:
      - Each announcement is a div.sens-row
      - Ticker in div.col-lg-1 a
      - Title/link in div.col-lg-6 a[href*="/mny_sens/"]
      - Date in time[datetime]

    Article page structure:
      - Full SENS text in div#sens-content pre
      - Ticker in text as "JSE share code: XXX"

    URL: https://www.moneyweb.co.za/tools-and-data/moneyweb-sens/
    Search: ?search=dealings+in+securities&startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
    Pagination: /page/N/
    """

    BASE_URL = "https://www.moneyweb.co.za"
    SENS_PATH = "/tools-and-data/moneyweb-sens/"
    SEARCH_TERM = "dealings in securities"

    # Transaction types to exclude — vestings and tax-offset sales
    # are not discretionary insider signals
    EXCLUDE_TITLE_KEYWORDS = [
        "conditional share plan",
        "conditional share rights",
        "performance share plan",
        "restricted share plan",
        "share appreciation rights",
        "share incentive scheme",
        "long-term incentive",
        "lti award",
        "forfeitable share plan",
        "acceptance of shares",          # vesting acceptance
        "acceptance of conditional",     # CSP vesting
        "vesting of shares",
        "tax obligation",
        "tax liability",
        "net settlement",
    ]

    def __init__(self):
        super().__init__()
        self._seen_urls = set()

    def _build_url(self, page: int = 1, start_date: str = "",
                   end_date: str = "", share_code: str = "") -> str:
        """Build Moneyweb SENS search URL with filters."""
        url = f"{self.BASE_URL}{self.SENS_PATH}"
        if page > 1:
            url += f"page/{page}/"
        params = [f"search={self.SEARCH_TERM.replace(' ', '+')}"]
        if start_date:
            params.append(f"startDate={start_date}")
        if end_date:
            params.append(f"endDate={end_date}")
        if share_code:
            params.append(f"shareCode={share_code}")
        return url + "?" + "&".join(params)

    def _is_vesting_or_tax(self, title: str) -> bool:
        """Check if title indicates a vesting or tax-offset transaction."""
        lower = title.lower()
        return any(kw in lower for kw in self.EXCLUDE_TITLE_KEYWORDS)

    def _parse_listing_page(self, soup: BeautifulSoup) -> list[dict]:
        """Parse a Moneyweb SENS listing page into article metadata."""
        results = []
        rows = soup.find_all("div", class_="sens-row")

        for row in rows:
            # Extract ticker
            ticker_div = row.find("div", class_=re.compile(r"col-lg-1"))
            ticker_link = ticker_div.find("a") if ticker_div else None
            ticker = ticker_link.get_text(strip=True) if ticker_link else ""

            # Extract title and URL
            title_div = row.find("div", class_=re.compile(r"col-lg-6"))
            title_link = title_div.find("a", href=True) if title_div else None
            if not title_link:
                continue

            href = title_link["href"]
            if "/mny_sens/" not in href:
                continue

            # Company name is in <strong>, title is the rest
            strong = title_link.find("strong")
            company_name = strong.get_text(strip=True) if strong else ""
            full_title = title_link.get_text(strip=True)
            # Remove company name prefix and separator
            announcement_title = full_title
            if company_name:
                announcement_title = full_title.replace(company_name, "", 1).strip()
                announcement_title = re.sub(r'^[\s\u2013\-]+', '', announcement_title).strip()

            # Extract datetime
            time_tag = row.find("time", attrs={"datetime": True})
            date_str = ""
            if time_tag:
                dt_attr = time_tag["datetime"]
                date_str = dt_attr[:10]  # YYYY-MM-DD

            full_url = urljoin(self.BASE_URL, href)

            # Skip if already seen (dedup)
            if full_url in self._seen_urls:
                continue
            self._seen_urls.add(full_url)

            # Check it's actually a director dealing
            combined = f"{full_title} {href}"
            if not is_director_dealing(combined):
                continue

            # Filter out vestings and tax-offset sales
            if self._is_vesting_or_tax(announcement_title):
                logger.info(f"  Skipping vesting/tax: {announcement_title[:60]}")
                continue

            results.append({
                "ticker": ticker,
                "company": company_name,
                "title": announcement_title or full_title,
                "url": full_url,
                "date": date_str,
            })

        return results

    def _extract_ticker_from_text(self, text: str) -> str:
        """Extract JSE share code from SENS body text."""
        match = re.search(
            r'(?:JSE\s+(?:share\s+)?code|Share\s+code)\s*[:\s]\s*([A-Z]{2,5})',
            text, re.IGNORECASE
        )
        return match.group(1).upper() if match else ""

    def discover(self, ticker: str, company_info: dict) -> list[dict]:
        """Discover director dealing announcements for a specific ticker."""
        results = []
        for page in range(1, 6):
            url = self._build_url(page=page, share_code=ticker)
            logger.info(f"  Moneyweb SENS page {page}: {url}")
            soup = self.fetch(url)
            if not soup:
                break
            page_results = self._parse_listing_page(soup)
            if not page_results:
                break
            results.extend(page_results)
        logger.info(f"  Moneyweb: found {len(results)} dealing announcements for {ticker}")
        return results

    def discover_all(self, max_pages: int = 10, start_date: str = "",
                     end_date: str = "") -> list[dict]:
        """
        Discover ALL director dealing announcements across all companies.

        Args:
            max_pages: Maximum listing pages to scrape
            start_date: Filter from date (YYYY-MM-DD)
            end_date: Filter to date (YYYY-MM-DD)

        Returns list of dicts with: ticker, company, title, url, date
        """
        results = []
        for page in range(1, max_pages + 1):
            url = self._build_url(page=page, start_date=start_date,
                                  end_date=end_date)
            logger.info(f"  Moneyweb SENS page {page}/{max_pages}: {url}")
            soup = self.fetch(url)
            if not soup:
                break
            page_results = self._parse_listing_page(soup)
            if not page_results:
                logger.info(f"  No more results at page {page}")
                break
            results.extend(page_results)
            logger.info(f"  Page {page}: {len(page_results)} articles "
                        f"({len(results)} total)")
        return results

    def extract(self, url: str) -> Optional[str]:
        """
        Fetch an individual Moneyweb SENS article and extract the full text.

        The SENS text lives in: div#sens-content pre
        """
        soup = self.fetch(url)
        if not soup:
            return None

        # Primary: div#sens-content pre
        sens_div = soup.find("div", id="sens-content")
        if sens_div:
            pre = sens_div.find("pre")
            if pre:
                return pre.get_text(separator="\n", strip=True)
            return sens_div.get_text(separator="\n", strip=True)

        # Secondary: div[itemprop="text"]
        itemprop_div = soup.find("div", attrs={"itemprop": "text"})
        if itemprop_div:
            return itemprop_div.get_text(separator="\n", strip=True)

        # Last resort: generic extraction
        return self.extract_text_from_soup(soup)


# ─── Main Scraper ────────────────────────────────────────────────────────────

class CompanyScraper:
    """
    Orchestrates scraping across all strategies for each company.

    For each company, it:
    1. Tries the company-specific strategy (if one exists)
    2. Falls back to the standard IR page strategy
    3. Optionally tries the JSE instrument page
    4. Deduplicates results
    5. Fetches full text for each unique announcement
    """

    def __init__(self):
        self.naspers = NaspersStrategy()
        self.standard = StandardIRStrategy()
        self.jse = JSEInstrumentStrategy()
        self.search = SearchDiscoveryStrategy()

        # Map tickers to their primary strategy
        self.strategy_map = {
            "NPN": self.naspers,
            "PRX": self.naspers,  # Prosus uses similar structure
        }

    def _get_strategies(self, ticker: str) -> list[ScraperStrategy]:
        """Get ordered list of strategies to try for a company."""
        strategies = []

        # Company-specific strategy first
        if ticker in self.strategy_map:
            strategies.append(self.strategy_map[ticker])

        # Standard IR page strategy
        strategies.append(self.standard)

        # JSE instrument page as supplement
        strategies.append(self.jse)

        return strategies

    def scrape(self, ticker: str, max_announcements: int = 20) -> list[RawAnnouncement]:
        """Scrape a single company for director dealing announcements."""
        company_info = next((c for c in JSE_TOP_40 if c["ticker"] == ticker), None)
        if not company_info:
            logger.warning(f"Unknown ticker: {ticker}")
            return []

        logger.info(f"\n{'='*55}")
        logger.info(f"  Scraping {ticker} ({company_info['name']})")
        logger.info(f"{'='*55}")

        # Phase 1: Discover announcement URLs across all strategies
        all_links = []
        seen_urls = set()

        for strategy in self._get_strategies(ticker):
            try:
                links = strategy.discover(ticker, company_info)
                for link in links:
                    url = link["url"]
                    if url not in seen_urls:
                        seen_urls.add(url)
                        all_links.append(link)
            except Exception as e:
                logger.warning(f"  Strategy {type(strategy).__name__} failed: {e}")

        logger.info(f"  Discovered {len(all_links)} unique announcement URLs")

        if not all_links:
            logger.info(f"  No announcements found for {ticker}")
            return []

        # Phase 2: Fetch full text for each announcement
        announcements = []
        for link in all_links[:max_announcements]:
            url = link["url"]
            is_pdf = link.get("is_pdf", False)

            if is_pdf:
                try:
                    from pdf_extractor import PDFExtractor
                    pdf_ext = PDFExtractor()
                    result = pdf_ext.extract_from_url(url)
                    if result.success and is_director_dealing(result.text):
                        domain = urlparse(url).netloc
                        announcements.append(RawAnnouncement(
                            ticker=ticker,
                            company=company_info["name"],
                            title=link["title"],
                            date=link.get("date", ""),
                            url=url,
                            full_text=result.text,
                            source_domain=domain,
                        ))
                        logger.info(f"    Extracted PDF: {result.pages} pages")
                    else:
                        logger.info(f"    PDF not a director dealing or extraction failed")
                except ImportError:
                    logger.info(f"  Skipping PDF (pdfplumber not installed): {url}")
                continue

            logger.info(f"  Fetching: {link['title'][:60]}...")

            # Use the strategy that found it to extract
            full_text = self.standard.extract(url)

            if full_text and len(full_text) > 50:
                # Verify it's actually a director dealing announcement
                if is_director_dealing(full_text) or is_director_dealing(link["title"]):
                    domain = urlparse(url).netloc
                    announcements.append(RawAnnouncement(
                        ticker=ticker,
                        company=company_info["name"],
                        title=link["title"],
                        date=link.get("date", ""),
                        url=url,
                        full_text=full_text,
                        source_domain=domain,
                    ))
                else:
                    logger.info(f"    Not a director dealing, skipping")
            else:
                logger.info(f"    No usable content extracted")

        logger.info(f"  Scraped {len(announcements)} announcements for {ticker}")
        return announcements

    def scrape_all(self, max_per_company: int = 10) -> list[RawAnnouncement]:
        """Scrape all JSE Top 40 companies."""
        all_announcements = []
        for company in JSE_TOP_40:
            try:
                anns = self.scrape(company["ticker"], max_per_company)
                all_announcements.extend(anns)
            except Exception as e:
                logger.error(f"Failed to scrape {company['ticker']}: {e}")
        return all_announcements

    def scrape_tickers(self, tickers: list[str], max_per: int = 10) -> list[RawAnnouncement]:
        """Scrape specific tickers."""
        all_announcements = []
        for ticker in tickers:
            try:
                anns = self.scrape(ticker.upper(), max_per)
                all_announcements.extend(anns)
            except Exception as e:
                logger.error(f"Failed to scrape {ticker}: {e}")
        return all_announcements


# ─── CLI ─────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import argparse

    ap = argparse.ArgumentParser(description="Raven Company IR Scraper")
    ap.add_argument("--ticker", "-t", help="Ticker(s) to scrape, comma-separated")
    ap.add_argument("--all", "-a", action="store_true", help="Scrape all Top 40")
    ap.add_argument("--max", "-m", type=int, default=10, help="Max announcements per company")
    ap.add_argument("--output", "-o", default="output/raw_announcements.json")
    args = ap.parse_args()

    scraper = CompanyScraper()

    if args.ticker:
        tickers = [t.strip().upper() for t in args.ticker.split(",")]
        results = scraper.scrape_tickers(tickers, args.max)
    elif args.all:
        results = scraper.scrape_all(args.max)
    else:
        ap.print_help()
        exit(1)

    # Save
    import os
    os.makedirs(os.path.dirname(args.output), exist_ok=True)
    output = [asdict(r) for r in results]
    with open(args.output, "w") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    print(f"\nSaved {len(output)} announcements to {args.output}")

    # Quick summary
    by_company = {}
    for r in results:
        by_company.setdefault(r.ticker, []).append(r)
    print(f"\nBy company:")
    for ticker, anns in sorted(by_company.items()):
        print(f"  {ticker}: {len(anns)} announcements")
