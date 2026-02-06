#!/bin/bash
set -e

echo "🚀 Starting Data Migration..."
python migrate_db.py

echo "✅ Migration Complete. Starting FastAPI Server..."
exec uvicorn main:app --host 0.0.0.0 --port 8000
