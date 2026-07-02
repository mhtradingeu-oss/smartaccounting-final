#!/bin/bash

set -e

echo ""
echo "======================================"
echo "🚀 SMARTACCOUNTING ENTERPRISE CENTER"
echo "======================================"
echo ""

# -----------------------------
# 1. VERIFY DOCKER
# -----------------------------
echo "🐳 Checking Docker..."

if ! docker ps >/dev/null 2>&1; then
  echo "❌ Docker is not running. Start Docker Desktop first."
  exit 1
fi

echo "✔ Docker is running"

# -----------------------------
# 2. CLEAN ONLY LOCAL FRONTEND PORT
# -----------------------------
echo ""
echo "🧹 Cleaning frontend port..."

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FRONTEND_PID_FILE="$PROJECT_ROOT/logs/frontend.pid"
pid=$(lsof -tiTCP:5173 -sTCP:LISTEN | head -1 || true)

stop_frontend_pid() {
  local target_pid="$1"

  if [ -z "$target_pid" ]; then
    return 0
  fi

  echo "   stopping SmartAccounting frontend on port 5173 (PID $target_pid)"
  kill "$target_pid" 2>/dev/null || true
  sleep 1

  if ps -p "$target_pid" >/dev/null 2>&1; then
    echo "   frontend still running, forcing stop PID $target_pid"
    kill -9 "$target_pid" 2>/dev/null || true
  fi
}

if [ -n "$pid" ]; then
  pid_cwd="$(lsof -p "$pid" 2>/dev/null | awk '$4=="cwd"{print $9; exit}')"

  if [ -f "$FRONTEND_PID_FILE" ] && grep -qx "$pid" "$FRONTEND_PID_FILE"; then
    stop_frontend_pid "$pid"
    rm -f "$FRONTEND_PID_FILE"
  elif [ "$pid_cwd" = "$PROJECT_ROOT/client" ]; then
    echo "   found stale SmartAccounting frontend without matching PID file"
    stop_frontend_pid "$pid"
    rm -f "$FRONTEND_PID_FILE"
  else
    echo "ERROR: Port 5173 is already in use by PID $pid, but it is not this SmartAccounting frontend."
    echo "       cwd: ${pid_cwd:-unknown}"
    echo "       To protect other projects, start-all.sh will not kill it automatically."
    echo "       Stop that process manually or choose another VITE_DEV_PORT."
    exit 1
  fi
else
  echo "   port 5173 already free"
  rm -f "$FRONTEND_PID_FILE"
fi

echo "✔ Frontend environment cleaned"

# -----------------------------
# 3. RESTART PROJECT DOCKER SERVICES SAFELY
# -----------------------------
echo ""
echo "🐳 Restarting SmartAccounting Docker Stack..."

docker compose down
docker compose up -d db backend

# -----------------------------
# 4. WAIT FOR BACKEND HEALTH
# -----------------------------
echo ""
echo "⏳ Waiting for backend health..."

READY=false

for i in {1..30}
do
  if curl -s http://localhost:5001/api/docs >/dev/null 2>&1; then
    echo "✔ Backend is READY"
    READY=true
    break
  fi

  echo "   ...waiting ($i/30)"
  sleep 2
done

if [ "$READY" = false ]; then
  echo ""
  echo "❌ Backend failed to start within timeout"
  echo ""
  echo "🔎 Backend status:"
  docker compose ps
  echo ""
  echo "🔎 Backend logs:"
  docker compose logs --tail=120 backend
  exit 1
fi

# -----------------------------
# 5. START FRONTEND
# -----------------------------
echo ""
echo "🌐 Starting Frontend (Vite)..."

mkdir -p logs

cd client
VITE_DEV_PORT=5173 VITE_HMR_CLIENT_PORT=5173 npm run dev -- --port 5173 > ../logs/frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..

echo "$FRONTEND_PID" > logs/frontend.pid

# -----------------------------
# 6. SYSTEM DASHBOARD
# -----------------------------
echo ""
echo "======================================"
echo "📊 ENTERPRISE CONTROL CENTER STATUS"
echo "======================================"
echo ""
echo "🟢 Frontend:"
echo "   http://localhost:5173"
echo ""
echo "🟢 Backend:"
echo "   http://localhost:5001"
echo "   http://localhost:5001/api/docs"
echo ""
echo "🟢 Database:"
echo "   localhost:5441"
echo ""
echo "🟡 Logs:"
echo "   logs/frontend.log"
echo ""
echo "======================================"
echo "✅ SYSTEM FULLY OPERATIONAL"
echo "======================================"

wait $FRONTEND_PID