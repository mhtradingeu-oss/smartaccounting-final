#!/usr/bin/env bash
# SmartAccounting production-grade verification script
# Works for: Docker local, host, CI

set -euo pipefail

REPORT="verify-production-report.txt"
START="$(date -u +"%Y-%m-%d %H:%M:%S UTC")"

EMAIL="${VERIFY_EMAIL:-accountant@demo.de}"
PASSWORD="${VERIFY_PASSWORD:-Demo123!}"

HOST_MARKER="/.dockerenv"

DOCKER_URL="http://localhost:5000"
HOST_URL="http://localhost:5001"

BASE_URL="${PRODUCTION_VERIFY_BASE_URL:-}"
if [[ -z "$BASE_URL" ]]; then
  if [[ -f "$HOST_MARKER" ]]; then
    ENV_MODE="docker-container"
    BASE_URL="$DOCKER_URL"
  else
    ENV_MODE="host"
    BASE_URL="$HOST_URL"
  fi
else
  ENV_MODE="explicit"
fi
BASE_URL="${BASE_URL%/}"

require() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "❌ Missing dependency: $1" | tee -a "$REPORT"
    exit 1
  }
}

require curl
require jq

log(){ echo "▶ $1" | tee -a "$REPORT"; }
pass(){ echo "✅ $1" | tee -a "$REPORT"; }
fail(){ echo "❌ $1" | tee -a "$REPORT"; exit 1; }

echo "========================================" | tee "$REPORT"
echo "SMARTACCOUNTING PRODUCTION VERIFY" | tee -a "$REPORT"
echo "Started: $START" | tee -a "$REPORT"
echo "Mode: $ENV_MODE" | tee -a "$REPORT"
echo "Base URL: $BASE_URL" | tee -a "$REPORT"
echo "User: $EMAIL" | tee -a "$REPORT"
echo "========================================" | tee -a "$REPORT"
echo "" | tee -a "$REPORT"

# --------------------------------------------------
log "1) Wait for /health"
for i in {1..15}; do
  if curl -fsS "$BASE_URL/health" >/dev/null 2>&1; then
    pass "/health OK"
    break
  fi
  sleep 2
  [[ $i -eq 15 ]] && fail "/health not ready"
done

log "2) Wait for /ready"
for i in {1..15}; do
  if curl -fsS "$BASE_URL/ready" >/dev/null 2>&1; then
    pass "/ready OK"
    break
  fi
  sleep 2
  [[ $i -eq 15 ]] && fail "/ready not ready"
done

# --------------------------------------------------
log "3) Login as demo accountant"

LOGIN_JSON="$(curl -fsS -X POST "$BASE_URL/api/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")" \
  || fail "Login request failed"

TOKEN="$(echo "$LOGIN_JSON" | jq -r '.token // empty')"
COMPANY_ID="$(echo "$LOGIN_JSON" | jq -r '.user.companyId // empty')"

[[ -n "$TOKEN" && "$TOKEN" != "null" ]] \
  && pass "Login successful (JWT issued)" \
  || fail "Login did not return token: $LOGIN_JSON"
[[ -n "$COMPANY_ID" && "$COMPANY_ID" != "null" ]] \
  && pass "Company context available ($COMPANY_ID)" \
  || fail "Login did not return companyId: $LOGIN_JSON"

AUTH=(-H "Authorization: Bearer $TOKEN" -H "X-Company-Id: $COMPANY_ID")

# --------------------------------------------------
log "4) Authenticated endpoints (RBAC-safe)"

ENDPOINTS=(
  "/api/dashboard/stats"
  "/api/invoices"
  "/api/expenses"
  "/api/bank-statements"
  "/api/ai/insights"
)

for ep in "${ENDPOINTS[@]}"; do
  curl -fsS "${AUTH[@]}" "$BASE_URL$ep" >/dev/null \
    && pass "$ep OK" \
    || fail "$ep FAILED"
done

# --------------------------------------------------
END="$(date -u +"%Y-%m-%d %H:%M:%S UTC")"

echo "" | tee -a "$REPORT"
echo "========================================" | tee -a "$REPORT"
echo "VERIFY COMPLETED SUCCESSFULLY ✅" | tee -a "$REPORT"
echo "Finished: $END" | tee -a "$REPORT"
echo "========================================" | tee -a "$REPORT"
