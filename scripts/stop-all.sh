#!/bin/bash

set -e

echo "🛑 STOPPING SMARTACCOUNTING ENTERPRISE SYSTEM..."

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FRONTEND_PID_FILE="$PROJECT_ROOT/logs/frontend.pid"

echo ""
echo "🌐 Stopping SmartAccounting frontend..."

if [ -f "$FRONTEND_PID_FILE" ]; then
  FRONTEND_PID="$(cat "$FRONTEND_PID_FILE" 2>/dev/null || true)"

  if [ -n "$FRONTEND_PID" ] && ps -p "$FRONTEND_PID" >/dev/null 2>&1; then
    FRONTEND_CMD="$(ps -p "$FRONTEND_PID" -o command= 2>/dev/null || true)"

    if echo "$FRONTEND_CMD" | grep -q "$PROJECT_ROOT/client"; then
      echo "   stopping frontend PID $FRONTEND_PID"
      kill "$FRONTEND_PID" 2>/dev/null || true
      sleep 1

      if ps -p "$FRONTEND_PID" >/dev/null 2>&1; then
        echo "   frontend still running, forcing stop PID $FRONTEND_PID"
        kill -9 "$FRONTEND_PID" 2>/dev/null || true
      fi
    else
      echo "   PID file exists, but PID $FRONTEND_PID does not belong to this project. Skipping."
    fi
  else
    echo "   no running frontend PID found"
  fi

  rm -f "$FRONTEND_PID_FILE"
else
  echo "   no frontend PID file found"
fi

echo ""
echo "🐳 Stopping SmartAccounting Docker services..."
cd "$PROJECT_ROOT"
docker compose down

echo ""
echo "✅ SMARTACCOUNTING SERVICES STOPPED CLEANLY"
