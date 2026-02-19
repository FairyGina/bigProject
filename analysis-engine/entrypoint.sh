#!/bin/bash
set -e

(
  echo "⏳ Waiting 5s before migration..."
  sleep 5
  echo "🚀 Starting Data Migration (Background)..."
  python migrate_db.py
) &

echo "✅ Starting FastAPI Server immediately..."
exec uvicorn main:app --host 0.0.0.0 --port ${PORT:-8080}
