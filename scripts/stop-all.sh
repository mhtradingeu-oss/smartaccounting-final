#!/bin/bash

set -e

echo "🛑 STOPPING SMARTACCOUNTING ENTERPRISE SYSTEM..."

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FRONTEND_PID_FILE="$PROJECT_ROOT/logs/frontend.pid"

echo ""
echo "🌐 Stopping SmartAccounting frontend..."

stop_frontend_pid() {
  local target_pid="$1"

  if [ -z "$target_pid" ]; then
    return 0
  fi

  echo "   stopping frontend PID $target_pid"
  kill "$target_pid" 2>/dev/null || true
  sleep 1

  if ps -p "$target_pid" >/dev/null 2>&1; then
    echo "   frontend still running, forcing stop PID $target_pid"
    kill -9 "$target_pid" 2>/dev/null || true
  fi
}

if [ -f "$FRONTEND_PID_FILE" ]; then
  FRONTEND_PID="$(cat "$FRONTEND_PID_FILE" 2>/dev/null || true)"

  if [ -n "$FRONTEND_PID" ] && ps -p "$FRONTEND_PID" >/dev/null 2>&1; then
    FRONTEND_CWD="$(lsof -p "$FRONTEND_PID" 2>/dev/null | awk '$4=="cwd"{print $9; exit}')"

    if [ "$FRONTEND_CWD" = "$PROJECT_ROOT/client" ]; then
      stop_frontend_pid "$FRONTEND_PID"
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

STALE_FRONTEND_PID="$(lsof -tiTCP:5173 -sTCP:LISTEN | head -1 || true)"
if [ -n "$STALE_FRONTEND_PID" ]; then
  STALE_FRONTEND_CWD="$(lsof -p "$STALE_FRONTEND_PID" 2>/dev/null | awk '$4=="cwd"{print $9; exit}')"

  if [ "$STALE_FRONTEND_CWD" = "$PROJECT_ROOT/client" ]; then
    echo "   found stale SmartAccounting frontend on port 5173"
    stop_frontend_pid "$STALE_FRONTEND_PID"
  else
    echo "   port 5173 is used by another process; leaving it untouched"
  fi
fi

echo ""
echo "🐳 Stopping SmartAccounting Docker services..."
cd "$PROJECT_ROOT"
docker compose down

echo ""
echo "✅ SMARTACCOUNTING SERVICES STOPPED CLEANLY"
