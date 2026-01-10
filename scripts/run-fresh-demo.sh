#!/usr/bin/env bash
set -euo pipefail

echo "==============================================="
echo " SmartAccounting – Fresh Full Demo Bootstrap"
echo "==============================================="

# ---------------------------------------------
# 0. Safety check
# ---------------------------------------------
if ! command -v docker >/dev/null 2>&1; then
  echo "❌ Docker is not installed or not in PATH"
  exit 1
fi

# ---------------------------------------------
# 1. HARD RESET (containers + volumes)
# ---------------------------------------------
echo "🧼 Cleaning previous Docker state..."
docker compose down -v || true

# Optional but safe: remove dangling stuff
docker system prune -f >/dev/null

# ---------------------------------------------
# 2. START STACK (fresh build)
# ---------------------------------------------
echo "🐳 Starting Docker stack (fresh build)..."
docker compose up -d --build

# ---------------------------------------------
# 3. WAIT FOR BACKEND HEALTH
# ---------------------------------------------
echo "⏳ Waiting for backend health..."
until curl -sf http://localhost:5001/api/health >/dev/null; do
  sleep 2
done
echo "✅ Backend is healthy"

# ---------------------------------------------
# 4. RUN DATABASE MIGRATIONS
# ---------------------------------------------
echo "🧱 Running database migrations..."
docker exec -it smartaccounting-backend \
  sh -lc "NODE_ENV=production npx sequelize-cli db:migrate"

# ---------------------------------------------
# 5. SEED DEMO DATA (company + users + invoices)
# ---------------------------------------------
echo "🌱 Seeding demo data..."
docker exec -it smartaccounting-backend \
  sh -lc "DEMO_MODE=true ALLOW_DEMO_SEED=true node scripts/seed-demo-prod.js"

# ---------------------------------------------
# 6. OPTIONAL: RUN CORE SMOKE TESTS
# ---------------------------------------------
echo "🧪 Running production smoke tests..."
docker exec -it smartaccounting-backend \
  sh -lc "npm test -- tests/routes/production.smoke.test.js" || {
    echo "⚠️ Smoke tests failed (check logs)"
    exit 1
  }

# ---------------------------------------------
# 7. FINAL STATUS
# ---------------------------------------------
echo ""
echo "==============================================="
echo " ✅ SmartAccounting is READY"
echo "==============================================="
echo ""
echo "🌐 Frontend (dev): http://localhost:5173"
echo "🔌 Backend API   : http://localhost:5001/api"
echo ""
echo "👤 Demo Users (password: Demo123!)"
echo "  - demo-admin@demo.com"
echo "  - demo-accountant@demo.com"
echo "  - demo-auditor@demo.com"
echo "  - demo-viewer@demo.com"
echo ""
echo "🚀 You are fully bootstrapped."
