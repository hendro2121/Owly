"""
Raven SENS Scraper
==================
Scrapes director dealing announcements from Sharenet's SENS page.

Sharenet serves full SENS announcement text in plain HTML <pre> tags.
No JavaScript rendering, no Cloudflare bypass, no API keys needed.

The listing page shows today's announcements. We run this daily
and accumulate data over time.

Architecture:
  1. Fetch Sharenet SENS listing page
  2. Filter for director dealing announcements
  3. Fetch each article page and extract full text from <pre> tag
  4. Return raw announcement text ready for the SENS parser

Usage:
    scraper = SharenetScraper()
    announcements = scraper.scrape()
"""

import re
import time
import logging
import hashlib
from datetime import datetime
from dataclasses import dataclass, field
from typing import Optional

import requests
from bs4 import BeautifulSoup

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

SHARENET_BASE = "https://www.sharenet.co.za"
SENS_LIST_URL = f"{SHARENET_BASE}/v3/sens.php"
REQUEST_DELAY = 1.0  # Seconds between requests


# ─── Data Model ──────────────────────────────────────────────────────────────

@dataclass
class RawAnnouncement:
    """A raw director dealing announcement scraped from Sharenet."""
    ticker: str
    company: str
    title: str
    date: str                  # YYYY-MM-DD
    url: str                   # Sharenet article URL
    full_text: str             # Full announcement text
    source_domain: str = "sharenet.co.za"
    scraped_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    content_hash: str = ""

    def __post_init__(self):
        if not self.content_hash and self.full_text:
            self.content_hash = hashlib.md5(self.full_text.encode()).hexdigest()


# ─── Keyword Filters ─────────────────────────────────────────────────────────

DEALING_KEYWORDS = [
    "dealings in securities",
    "dealing in securities",
    "dealing in shares",
    "director dealing",
    "directors' dealings",
    "director's dealing",
]

# Announcements matching these keywords should be excluded — they're corporate
# actions (share trusts, employee schemes) not individual director dealings
EXCLUDE_KEYWORDS = [
    "share trust",
    "share incentive",
    "employee share",
    "share scheme trust",
    "share purchase trust",
    "major subsidiary",
    "staff share",
]


def is_director_dealing(text: str) -> bool:
    """Check if text relates to director dealings (not share trust/scheme)."""
    lower = text.lower()
    if any(kw in lower for kw in EXCLUDE_KEYWORDS):
        return False
    return any(kw in lower for kw in DEALING_KEYWORDS)


# ─── Scraper ─────────────────────────────────────────────────────────────────

class SharenetScraper:
    """
    Scrapes director dealing SENS announcements from Sharenet.

    Sharenet's SENS page (sharenet.co.za/v3/sens.php) shows today's
    announcements. Each article page has the full SENS text in a <pre> tag.
    """

    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update(HEADERS)
        self._last_request = 0.0

    def _throttle(self):
        """Rate-limit requests."""
        now = time.time()
        wait = REQUEST_DELAY - (now - self._last_request)
        if wait > 0:
            time.sleep(wait)
        self._last_request = time.time()

    def _get(self, url: str, timeout: int = 30) -> Optional[requests.Response]:
        """GET request with throttling."""
        self._throttle()
        try:
            resp = self.session.get(url, timeout=timeout)
            resp.raise_for_status()
            return resp
        except requests.RequestException as e:
            logger.warning(f"Failed to fetch {url}: {e}")
            return None

    def discover(self) -> list[dict]:
        """
        Fetch today's SENS listing and return director dealing articles.

        Returns list of dicts: {title, url, date, ticker, company}
        """
        resp = self._get(SENS_LIST_URL)
        if not resp:
            return []

        soup = BeautifulSoup(resp.text, "html.parser")
        links = soup.find_all("a", href=lambda h: h and "sens_display" in h)

        results = []
        for link in links:
            title = link.get_text(strip=True)
            if not is_director_dealing(title):
                continue

            href = link["href"]
            url = f"{SHARENET_BASE}{href}" if href.startswith("/") else href

            # Extract date from tdate param (YYYYMMDDHHMMSS)
            date = ""
            match = re.search(r"tdate=(\d{8})", href)
            if match:
                raw = match.group(1)
                date = f"{raw[:4]}-{raw[4:6]}-{raw[6:8]}"

            # Extract company name and ticker from title
            # Titles look like: "GRINDROD LIMITED - Dealings in Securities"
            company, ticker = self._parse_title(title)

            results.append({
                "title": title,
                "url": url,
                "date": date,
                "ticker": ticker,
                "company": company,
            })

        logger.info(f"Found {len(results)} director dealing announcements")
        return results

    def _parse_title(self, title: str) -> tuple:
        """Extract company name from SENS title. Returns (company, ticker)."""
        # Title format: "COMPANY NAME - Dealings in Securities..."
        # Split on first occurrence of dealing keyword
        for kw in DEALING_KEYWORDS:
            idx = title.lower().find(kw)
            if idx > 0:
                company = title[:idx].rstrip(" -–—\t")
                return company, ""
        return title, ""

    def extract(self, url: str) -> Optional[str]:
        """Fetch a Sharenet SENS article and return the full text."""
        resp = self._get(url)
        if not resp:
            return None

        soup = BeautifulSoup(resp.text, "html.parser")
        pre = soup.find("pre")
        if pre:
            text = pre.get_text(separator="\n", strip=True)
            if len(text) > 50:
                return text

        logger.info(f"  No content found on {url}")
        return None

    def _extract_ticker_from_text(self, text: str) -> str:
        """Extract JSE share code from SENS body text."""
        # Pan African style: "Share code on JSE: PAN"
        match = re.search(
            r'Share\s+code\s+on\s+JSE\s*[:\s]\s*([A-Z]{2,5})',
            text, re.IGNORECASE
        )
        if match:
            return match.group(1).upper()
        # Standard: "JSE share code: NPN" / "Share code: HCI"
        match = re.search(
            r'(?:JSE\s+(?:share\s+)?code|Share\s+code)\s*[:\s]\s*([A-Z]{2,5})',
            text, re.IGNORECASE
        )
        if match:
            return match.group(1).upper()
        # Sibanye style: "Share codes: SSW (JSE)" or "Tickers JSE: SSW"
        match = re.search(
            r'(?:Share\s+codes?|Tickers?\s+JSE)\s*[:\s]\s*([A-Z]{2,5})\s*\(?\s*(?:JSE)?\s*\)?',
            text, re.IGNORECASE
        )
        return match.group(1).upper() if match else ""

    def scrape(self) -> list[RawAnnouncement]:
        """
        Scrape today's director dealing announcements.

        Returns list of RawAnnouncement objects with full text.
        """
        links = self.discover()
        if not links:
            logger.info("No director dealing announcements found today")
            return []

        announcements = []
        for i, link in enumerate(links, 1):
            logger.info(f"  [{i}/{len(links)}] {link['title'][:60]}...")

            full_text = self.extract(link["url"])
            if not full_text:
                continue

            # Try to get ticker from the announcement text
            ticker = link["ticker"] or self._extract_ticker_from_text(full_text)
            company = link["company"]

            announcements.append(RawAnnouncement(
                ticker=ticker,
                company=company,
                title=link["title"],
                date=link["date"],
                url=link["url"],
                full_text=full_text,
            ))

        logger.info(f"Scraped {len(announcements)} announcements successfully")
        return announcements


# ─── CLI ─────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import json
    import os

    scraper = SharenetScraper()
    results = scraper.scrape()

    if results:
        os.makedirs("output", exist_ok=True)
        from dataclasses import asdict
        output = [asdict(r) for r in results]
        with open("output/raw_announcements.json", "w") as f:
            json.dump(output, f, indent=2, ensure_ascii=False)
        print(f"\nSaved {len(output)} announcements to output/raw_announcements.json")
    else:
        print("\nNo announcements found today")
