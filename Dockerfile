FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl nodejs npm \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY frontend/ ./frontend/
RUN cd frontend && npm install && npm run build

COPY src/ ./src/

RUN mkdir -p /app/data /app/output

ENV PYTHONPATH=/app/src
ENV PYTHONUNBUFFERED=1

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s \
    CMD curl -f http://localhost:${PORT:-8000}/api/health || exit 1

CMD uvicorn src.api:app --host 0.0.0.0 --port ${PORT:-8000}
