#!/bin/bash
# Verifies core API endpoints using demo-accountant credentials
set -euo pipefail

API_URL="http://localhost:3000/api"
EMAIL="demo-accountant@demo.com"
PASSWORD="demopass2"

# Get JWT token
TOKEN=$(curl -s -X POST "$API_URL/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"email":"'$EMAIL'","password":"'$PASSWORD'"}' | jq -r '.token')

if [[ "$TOKEN" == "null" || -z "$TOKEN" ]]; then
  echo "[FAIL] Login failed for $EMAIL"
  exit 1
fi

echo "[OK] Login succeeded. Token acquired."

# Endpoints to check
endpoints=(
  "/companies"
  "/invoices"
  "/expenses"
  "/bank-statements"
)

for ep in "${endpoints[@]}"; do
  echo -n "Checking $API_URL$ep ... "
  http_code=$(curl -s -o response.json -w "%{http_code}" -H "Authorization: Bearer $TOKEN" "$API_URL$ep")
  if [[ "$http_code" != "200" ]]; then
    echo "[FAIL] HTTP $http_code"
    cat response.json
    exit 2
  fi
  if ! jq empty response.json 2>/dev/null; then
    echo "[FAIL] Response is not valid JSON"
    cat response.json
    exit 3
  fi
  echo "[OK]"
done

rm -f response.json

echo "[SUCCESS] All core API endpoints returned 200 and valid JSON."
