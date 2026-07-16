# OWLY

**JSE Insider Trading Intelligence**

Owly tracks every director trade on the Johannesburg Stock Exchange and turns it into structured, searchable intelligence.

## Stack

- **Backend:** FastAPI + PostgreSQL
- **Frontend:** React + Vite
- **Scraper:** Python (BeautifulSoup + pdfplumber)
- **Parser:** Regex + Claude LLM fallback
- **Deploy:** Railway (Docker)

## Quick Start

### Backend
```bash
pip install -r requirements.txt
cd src
DATABASE_URL=your_postgres_url uvicorn api:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Deploy to Railway
1. Push to GitHub
2. Connect repo in Railway
3. Add PostgreSQL database in Railway
4. Railway auto-deploys from Dockerfile

## Project Structure
```
owly/
├── src/
│   ├── api.py              # FastAPI server (PostgreSQL)
│   ├── scraper.py          # Company IR website scrapers
│   ├── parser.py           # SENS text parser
│   ├── pdf_extractor.py    # PDF text extraction
│   ├── pipeline.py         # Scrape > Parse > Store
│   └── companies.py        # JSE Top 40 registry
├── frontend/
│   ├── src/App.jsx         # React app
│   ├── src/api.js          # API client
│   └── ...
├── Dockerfile
├── railway.json
└── requirements.txt
```
