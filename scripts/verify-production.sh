#!/usr/bin/env bash
set -euo pipefail

EMAIL="${VERIFY_EMAIL:-demo-accountant@demo.com}"
PASSWORD="${VERIFY_PASSWORD:-Demo123!}"

HOST_MARKER="/.dockerenv"

# Inside backend container: app listens on 5000
DOCKER_URL="http://localhost:5000"
# On host: backend is mapped to 5001
HOST_URL="http://localhost:5001"

BASE_URL="${PRODUCTION_VERIFY_BASE_URL:-}"
if [ -z "$BASE_URL" ]; then
  if [ -f "$HOST_MARKER" ]; then
    echo "[verify] Running inside Docker container."
    BASE_URL="$DOCKER_URL"
  else
    echo "[verify] Running on host."
    BASE_URL="$HOST_URL"
  fi
fi
BASE_URL="${BASE_URL%/}"

curl -fsS "$BASE_URL/health" >/dev/null
echo "[verify] /health OK"

curl -fsS "$BASE_URL/ready" >/dev/null
echo "[verify] /ready OK"

LOGIN_RESPONSE="/tmp/verify-production-login.json"
TOKEN_FILE="/tmp/verify-production-token.txt"
cleanup() { rm -f "$LOGIN_RESPONSE" "$TOKEN_FILE"; }
trap cleanup EXIT

LOGIN_PAYLOAD='{"email":"'"$EMAIL"'","password":"'"$PASSWORD"'"}'

curl -fsS -X POST "$BASE_URL/api/auth/login" \
  -H 'Content-Type: application/json' \
  -d "$LOGIN_PAYLOAD" > "$LOGIN_RESPONSE"

grep -o '"token":"[^"]*"' "$LOGIN_RESPONSE" | sed 's/.*"token":"\([^"]*\)".*/\1/' > "$TOKEN_FILE" || {
  echo "[verify] FAIL: /api/auth/login did not return a token"
  echo "[verify] Response:"
  cat "$LOGIN_RESPONSE"
  exit 1
}

TOKEN="$(cat "$TOKEN_FILE" || true)"
if [ -z "$TOKEN" ]; then
  echo "[verify] FAIL: /api/auth/login returned an empty token"
  echo "[verify] Response:"
  cat "$LOGIN_RESPONSE"
  exit 1
fi
echo "[verify] /api/auth/login OK"

AUTH_ENDPOINTS=(
  "/api/dashboard/stats"
  "/api/invoices"
  "/api/expenses"
  "/api/bank-statements"
  "/api/ai/insights"
)

for endpoint in "${AUTH_ENDPOINTS[@]}"; do
  curl -fsS -H "Authorization: Bearer $TOKEN" "$BASE_URL$endpoint" >/dev/null
  echo "[verify] $endpoint OK"
done

echo "[verify] ALL CHECKS PASSED"
