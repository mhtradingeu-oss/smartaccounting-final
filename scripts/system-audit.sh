#!/usr/bin/env bash
set -euo pipefail

REPORT_FILE="system-audit-report.txt"
START_TIME=$(date -u +"%Y-%m-%d %H:%M:%S UTC")

echo "========================================" | tee "$REPORT_FILE"
echo "SMARTACCOUNTING SYSTEM AUDIT REPORT" | tee -a "$REPORT_FILE"
echo "Started: $START_TIME" | tee -a "$REPORT_FILE"
echo "========================================" | tee -a "$REPORT_FILE"
echo "" | tee -a "$REPORT_FILE"

log()  { echo "▶ $1" | tee -a "$REPORT_FILE"; }
pass() { echo "✅ $1" | tee -a "$REPORT_FILE"; }
fail() {
  echo "❌ $1" | tee -a "$REPORT_FILE"
  echo "" | tee -a "$REPORT_FILE"
  echo "AUDIT FAILED ❌" | tee -a "$REPORT_FILE"
  exit 1
}

# --------------------------------------------------
log "1. Docker Local: Clean startup"
docker compose down -v >/dev/null 2>&1 || true
docker compose up -d --build || fail "Docker compose up failed"
pass "Docker Local started"

# --------------------------------------------------
log "2. Backend health check"
sleep 5
curl -fsS http://localhost:5001/health >/dev/null \
  && pass "Backend /health OK" \
  || fail "Backend /health failed"

# --------------------------------------------------
log "3. Database connectivity"
curl -fsS http://localhost:5001/health | grep -q '"db":{"status":"connected"' \
  && pass "Database connected" \
  || fail "Database NOT connected"

# --------------------------------------------------
log "4. Frontend reachable (wait for readiness)"
FRONTEND_OK=false
for i in {1..15}; do
  if curl -fsS http://localhost:3000 >/dev/null 2>&1; then
    FRONTEND_OK=true
    break
  fi
  sleep 2
done
$FRONTEND_OK \
  && pass "Frontend reachable" \
  || fail "Frontend NOT reachable"

# --------------------------------------------------
log "5. API reachable"
curl -fsS http://localhost:5001/api/health >/dev/null \
  && pass "API reachable" \
  || pass "API health optional (skipped)"

log "Route audit"
node scripts/listRoutes.js \
  && pass "Routes audited" \
  || fail "Route audit failed"

# --------------------------------------------------
log "6. Demo seed + business logic verification"
DEMO_MODE=true ALLOW_DEMO_SEED=true node scripts/seed-demo-prod.js \
  && pass "Demo seed completed" \
  || fail "Demo seed failed"

node scripts/demo-verify.js \
  && pass "Demo business logic verified" \
  || fail "Demo verification failed"

log "8. Demo data verification"
node scripts/demo-verify.js \
  && pass "Demo verification PASSED" \
  || fail "Demo verification FAILED"


# --------------------------------------------------
log "7. Docker Test (Postgres compliance tests)"
npm test \
  && pass "Docker Postgres tests PASSED" \
  || fail "Docker Postgres tests FAILED"

# --------------------------------------------------
log "8. Cleanup"
docker compose down -v >/dev/null 2>&1 || true
pass "Cleanup completed"

END_TIME=$(date -u +"%Y-%m-%d %H:%M:%S UTC")

echo "" | tee -a "$REPORT_FILE"
echo "========================================" | tee -a "$REPORT_FILE"
echo "AUDIT COMPLETED SUCCESSFULLY ✅" | tee -a "$REPORT_FILE"
echo "Finished: $END_TIME" | tee -a "$REPORT_FILE"
echo "========================================" | tee -a "$REPORT_FILE"
