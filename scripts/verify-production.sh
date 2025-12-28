#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${PRODUCTION_VERIFY_BASE_URL:-http://localhost:5000}"
API_BASE="${BASE_URL%/}/api"

if [ -f /.dockerenv ]; then
  echo "[verify] Running inside Docker container."
else
  echo "[verify] Warning: container marker not detected; ensure this script runs inside Docker."
fi

log_step() {
  printf "[verify] %-40s ... " "$1"
}

check_endpoint_auth() {
  log_step "$1"
  curl --fail --silent --show-error -H "Authorization: Bearer ${TOKEN}" "${API_BASE}${2}" >/dev/null
  echo "OK"
}

log_step "Health check"
curl --fail --silent --show-error "${BASE_URL%/}/health" >/dev/null
echo "OK"

LOGIN_PAYLOAD='{"email":"demo-accountant@demo.com","password":"Demo123!"}'
log_step "Authenticating demo accountant"
LOGIN_RESPONSE=$(curl --fail --silent --show-error -X POST "${API_BASE}/auth/login" \
  -H 'Content-Type: application/json' \
  -d "$LOGIN_PAYLOAD")

TOKEN=$(python3 - <<'PY'
import json, sys

data = json.load(sys.stdin)
token = data.get('token')
if not token:
    sys.exit('missing token')
print(token)
PY <<<"$LOGIN_RESPONSE")
echo "OK"

check_endpoint_auth "Dash stats" "/dashboard/stats"
check_endpoint_auth "Invoices list" "/invoices"
check_endpoint_auth "Expenses list" "/expenses"
check_endpoint_auth "Bank statements" "/bank-statements"
check_endpoint_auth "AI insights" "/ai/insights"

echo "[verify] Production verification completed successfully."
