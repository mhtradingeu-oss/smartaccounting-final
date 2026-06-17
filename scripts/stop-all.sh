#!/bin/bash

echo "🛑 STOPPING ENTERPRISE SYSTEM..."

docker compose down

pkill -f nodemon >/dev/null 2>&1 || true
pkill -f vite >/dev/null 2>&1 || true

npx kill-port 5001 5173 5441 >/dev/null 2>&1 || true

echo "✅ ALL SERVICES STOPPED CLEANLY"