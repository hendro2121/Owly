"""
Raven PDF Extractor
===================
Extracts director dealing text from SENS PDF announcements.

The JSE publishes SENS announcements as PDFs on instrument pages.
Many company IR sites also host announcement PDFs. This module
downloads and extracts text from those PDFs so the standard
SENS parser can process them.

Supports:
  - Direct PDF URL download + text extraction
  - Batch processing of PDF URLs
  - Text cleaning specific to SENS PDF formatting
  - Fallback OCR stub for scanned PDFs (future)

Usage:
    extractor = PDFExtractor()
    text = extractor.extract_from_url("https://...announcement.pdf")
    text = extractor.extract_from_file("/path/to/announcement.pdf")
"""

import os
import re
import time
import logging
import tempfile
import hashlib
from typing import Optional
from dataclasses import dataclass

import requests
import pdfplumber

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/122.0.0.0 Safari/537.36"
    ),
}

REQUEST_DELAY = 2.0


@dataclass
class PDFResult:
    """Result of PDF text extraction."""
    url: str
    text: str
    pages: int
    file_size: int          # bytes
    content_hash: str
    success: bool
    error: Optional[str] = None


class PDFExtractor:
    """Downloads and extracts text from SENS PDF announcements."""

    def __init__(self, cache_dir: str = None, delay: float = REQUEST_DELAY):
        self.session = requests.Session()
        self.session.headers.update(HEADERS)
        self.delay = delay
        self._last_request = 0.0
        self.cache_dir = cache_dir or os.path.join(tempfile.gettempdir(), "raven_pdfs")
        os.makedirs(self.cache_dir, exist_ok=True)

    def _throttle(self):
        elapsed = time.time() - self._last_request
        if elapsed < self.delay:
            time.sleep(self.delay - elapsed)
        self._last_request = time.time()

    def _cache_path(self, url: str) -> str:
        """Generate a cache file path from URL."""
        url_hash = hashlib.md5(url.encode()).hexdigest()
        return os.path.join(self.cache_dir, f"{url_hash}.pdf")

    def download(self, url: str) -> Optional[str]:
        """
        Download a PDF from URL, cache locally, return file path.
        Returns cached version if already downloaded.
        """
        cached = self._cache_path(url)
        if os.path.exists(cached):
            logger.info(f"  PDF cached: {os.path.basename(cached)}")
            return cached

        self._throttle()
        try:
            resp = self.session.get(url, timeout=30, stream=True)
            resp.raise_for_status()

            # Verify it's actually a PDF
            content_type = resp.headers.get("Content-Type", "")
            if "pdf" not in content_type.lower() and not url.lower().endswith(".pdf"):
                # Check magic bytes
                first_bytes = next(resp.iter_content(chunk_size=5))
                if not first_bytes.startswith(b"%PDF"):
                    logger.warning(f"  Not a PDF: {url} (Content-Type: {content_type})")
                    return None
                # Write the first bytes we already read
                with open(cached, "wb") as f:
                    f.write(first_bytes)
                    for chunk in resp.iter_content(chunk_size=8192):
                        f.write(chunk)
            else:
                with open(cached, "wb") as f:
                    for chunk in resp.iter_content(chunk_size=8192):
                        f.write(chunk)

            file_size = os.path.getsize(cached)
            logger.info(f"  Downloaded PDF: {file_size / 1024:.1f} KB")
            return cached

        except requests.RequestException as e:
            logger.warning(f"  PDF download failed: {url}: {e}")
            return None

    def extract_from_file(self, file_path: str) -> PDFResult:
        """Extract text from a local PDF file."""
        try:
            text_parts = []
            page_count = 0

            with pdfplumber.open(file_path) as pdf:
                page_count = len(pdf.pages)

                for page in pdf.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text_parts.append(page_text)

                    # Also try extracting tables (some SENS use tabular format)
                    tables = page.extract_tables()
                    for table in tables:
                        for row in table:
                            if row:
                                cells = [str(c).strip() for c in row if c]
                                if cells:
                                    text_parts.append(" | ".join(cells))

            raw_text = "\n".join(text_parts)
            cleaned = self._clean_sens_text(raw_text)

            file_size = os.path.getsize(file_path)
            content_hash = hashlib.md5(cleaned.encode()).hexdigest()

            if not cleaned or len(cleaned) < 20:
                return PDFResult(
                    url=file_path, text="", pages=page_count,
                    file_size=file_size, content_hash="",
                    success=False, error="No extractable text (may be scanned image)"
                )

            return PDFResult(
                url=file_path, text=cleaned, pages=page_count,
                file_size=file_size, content_hash=content_hash,
                success=True
            )

        except Exception as e:
            logger.error(f"  PDF extraction failed: {file_path}: {e}")
            return PDFResult(
                url=file_path, text="", pages=0, file_size=0,
                content_hash="", success=False, error=str(e)
            )

    def extract_from_url(self, url: str) -> PDFResult:
        """Download a PDF from URL and extract text."""
        logger.info(f"  Extracting PDF: {url[:80]}...")

        file_path = self.download(url)
        if not file_path:
            return PDFResult(
                url=url, text="", pages=0, file_size=0,
                content_hash="", success=False, error="Download failed"
            )

        result = self.extract_from_file(file_path)
        result.url = url  # Store original URL, not cache path
        return result

    def extract_batch(self, urls: list[str]) -> list[PDFResult]:
        """Extract text from multiple PDF URLs."""
        results = []
        for url in urls:
            result = self.extract_from_url(url)
            results.append(result)
            if result.success:
                logger.info(f"    Extracted {result.pages} pages, {len(result.text)} chars")
            else:
                logger.warning(f"    Failed: {result.error}")
        return results

    def _clean_sens_text(self, text: str) -> str:
        """
        Clean extracted PDF text for SENS parsing.

        SENS PDFs often have:
        - Page headers/footers with "Produced by the JSE SENS Department"
        - Watermarks and disclaimers
        - Broken lines from PDF column extraction
        - Extra whitespace
        """
        if not text:
            return ""

        lines = text.split("\n")
        cleaned_lines = []

        skip_patterns = [
            r"^Produced by the JSE SENS Department",
            r"^The SENS service is an information dissemination",
            r"^The JSE does not.*warrant",
            r"^The JSE.*accept no liability",
            r"^Page \d+ of \d+",
            r"^\s*$",
        ]

        for line in lines:
            line = line.strip()
            if not line:
                cleaned_lines.append("")
                continue

            # Skip boilerplate
            skip = False
            for pattern in skip_patterns:
                if re.match(pattern, line, re.IGNORECASE):
                    skip = True
                    break
            if skip:
                continue

            cleaned_lines.append(line)

        text = "\n".join(cleaned_lines)

        # Collapse multiple blank lines
        text = re.sub(r"\n{3,}", "\n\n", text)

        # Fix common PDF extraction artifacts
        text = re.sub(r"(\w)\s*-\s*\n\s*(\w)", r"\1\2", text)  # Rejoin hyphenated words
        text = text.strip()

        return text


# ─── Integration with Scraper ────────────────────────────────────────────────

def extract_pdf_announcements(pdf_links: list[dict]) -> list[dict]:
    """
    Process a list of PDF announcement links from the scraper.

    Input: [{"title": ..., "url": ..., "date": ..., "is_pdf": True}]
    Output: [{"title": ..., "url": ..., "date": ..., "full_text": ...}]
    """
    extractor = PDFExtractor()
    results = []

    for link in pdf_links:
        if not link.get("is_pdf"):
            continue

        result = extractor.extract_from_url(link["url"])
        if result.success:
            results.append({
                "title": link.get("title", ""),
                "url": link["url"],
                "date": link.get("date", ""),
                "full_text": result.text,
                "pages": result.pages,
                "content_hash": result.content_hash,
            })

    return results


# ─── CLI ─────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import argparse

    ap = argparse.ArgumentParser(description="Raven PDF Extractor")
    ap.add_argument("--url", "-u", help="PDF URL to extract")
    ap.add_argument("--file", "-f", help="Local PDF file to extract")
    ap.add_argument("--output", "-o", help="Save extracted text to file")
    args = ap.parse_args()

    extractor = PDFExtractor()

    if args.url:
        result = extractor.extract_from_url(args.url)
    elif args.file:
        result = extractor.extract_from_file(args.file)
    else:
        ap.print_help()
        exit(1)

    if result.success:
        print(f"\nExtracted {result.pages} pages, {len(result.text)} characters\n")
        print("=" * 60)
        print(result.text[:2000])
        if len(result.text) > 2000:
            print(f"\n... ({len(result.text) - 2000} more characters)")
        print("=" * 60)

        if args.output:
            with open(args.output, "w") as f:
                f.write(result.text)
            print(f"\nSaved to {args.output}")
    else:
        print(f"\nExtraction failed: {result.error}")
