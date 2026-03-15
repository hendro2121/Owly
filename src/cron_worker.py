"""
Raven Cron Worker
=================
Lightweight script for Railway cron service.
Calls the /api/refresh endpoint on the main web service.

Railway setup:
  1. Create a new "Cron" service in your Railway project
  2. Set the schedule: 0 10,15 * * 1-5  (12:00 and 17:00 SAST = 10:00 and 15:00 UTC)
  3. Set env vars: APP_URL, CRON_SECRET
  4. Start command: python src/cron_worker.py
"""

import os
import sys
import requests

APP_URL = os.environ.get("APP_URL", "").rstrip("/")
CRON_SECRET = os.environ.get("CRON_SECRET", "")

if not APP_URL or not CRON_SECRET:
    print("ERROR: APP_URL and CRON_SECRET env vars required")
    sys.exit(1)

url = f"{APP_URL}/api/refresh?secret={CRON_SECRET}"
print(f"Triggering refresh: {url.split('secret=')[0]}secret=***")

try:
    resp = requests.post(url, timeout=30)
    resp.raise_for_status()
    print(f"Response: {resp.json()}")
except Exception as e:
    print(f"Failed: {e}")
    sys.exit(1)
