#!/usr/bin/env bash
# Verifies core API endpoints using DEMO users (RBAC-aware)

set -euo pipefail

REPORT="core-api-audit.txt"
API_URL="${API_URL:-http://localhost:5001/api}"
if [[ "$API_URL" == *"backend:"* ]] || [[ "$API_URL" != http://localhost* ]]; then
  echo "❌ API_URL must point to localhost, never docker service name (backend:)."
  exit 1
fi
EMAIL="${DEMO_EMAIL:-demo-accountant@demo.com}"
PASSWORD="${DEMO_PASSWORD:-Demo123!}"

START="$(date -u +"%Y-%m-%d %H:%M:%S UTC")"

echo "========================================" | tee "$REPORT"
echo "SMARTACCOUNTING CORE API AUDIT" | tee -a "$REPORT"
echo "Started: $START" | tee -a "$REPORT"
echo "API_URL: $API_URL" | tee -a "$REPORT"
echo "User: $EMAIL" | tee -a "$REPORT"
echo "========================================" | tee -a "$REPORT"
echo "" | tee -a "$REPORT"

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

# --------------------------------------------------
log "1) Login as demo accountant"

LOGIN_JSON="$(curl -fsS --retry 5 --retry-delay 2 \
  -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")" \
  || fail "Login request failed"

TOKEN="$(echo "$LOGIN_JSON" | jq -r '.token // empty')"
COMPANY_ID="$(echo "$LOGIN_JSON" | jq -r '.user.companyId // empty')"

[[ -n "$TOKEN" ]] \
  && pass "Login successful (token acquired)" \
  || fail "Login did not return token: $LOGIN_JSON"
[[ -n "$COMPANY_ID" ]] \
  && pass "Company context available ($COMPANY_ID)" \
  || fail "Login did not return companyId: $LOGIN_JSON"

AUTH=(-H "Authorization: Bearer $TOKEN" -H "X-Company-Id: $COMPANY_ID")

# --------------------------------------------------
log "2) Core endpoints (read-only, accountant role)"

declare -A endpoints=(
  ["/companies"]="200"
  ["/invoices"]="200"
  ["/expenses"]="200"
  ["/bank-statements"]="200"
)

for ep in "${!endpoints[@]}"; do
  expected="${endpoints[$ep]}"
  echo -n "Checking $ep ... " | tee -a "$REPORT"

  http_code="$(curl -s -o response.json -w "%{http_code}" \
    "${AUTH[@]}" "$API_URL$ep")"

  if [[ "$http_code" != "$expected" ]]; then
    echo "[FAIL $http_code]" | tee -a "$REPORT"
    cat response.json | tee -a "$REPORT"
    exit 2
  fi

  if ! jq empty response.json >/dev/null 2>&1; then
    echo "[FAIL invalid JSON]" | tee -a "$REPORT"
    cat response.json | tee -a "$REPORT"
    exit 3
  fi

  echo "[OK]" | tee -a "$REPORT"
done

rm -f response.json

pass "All core API endpoints returned expected responses"

END="$(date -u +"%Y-%m-%d %H:%M:%S UTC")"
echo "" | tee -a "$REPORT"
echo "Finished: $END" | tee -a "$REPORT"
echo "========================================" | tee -a "$REPORT"
