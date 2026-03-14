"""Startup script for Railway deployment."""
import os
import sys
import uvicorn

port = int(os.environ.get("PORT", 8000))
os.chdir("/app")
sys.path.insert(0, "/app/src")
uvicorn.run("api:app", host="0.0.0.0", port=port)
