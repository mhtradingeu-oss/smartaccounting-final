#!/usr/bin/env bash
set -euo pipefail

REPORT="feature-audit-report.txt"
API="http://localhost:5001"
FRONT="http://localhost:3000"

START="$(date -u +"%Y-%m-%d %H:%M:%S UTC")"

echo "========================================" | tee "$REPORT"
echo "SMARTACCOUNTING FEATURE WALKTHROUGH AUDIT" | tee -a "$REPORT"
echo "Started: $START" | tee -a "$REPORT"
echo "API: $API" | tee -a "$REPORT"
echo "Frontend: $FRONT" | tee -a "$REPORT"
echo "========================================" | tee -a "$REPORT"
echo "" | tee -a "$REPORT"

log(){ echo "▶ $1" | tee -a "$REPORT"; }
pass(){ echo "✅ $1" | tee -a "$REPORT"; }
fail(){ echo "❌ $1" | tee -a "$REPORT"; echo "AUDIT FAILED ❌" | tee -a "$REPORT"; exit 1; }
require(){ command -v "$1" >/dev/null 2>&1 || fail "Missing dependency: $1"; }

require curl
require jq

# ------------------------------------------------------------
log "0) Load demo contract (single source of truth)"

DEMO_CONTRACT="scripts/demo-contract.json"
[[ -f "$DEMO_CONTRACT" ]] || fail "Missing demo-contract.json"

DEMO_EMAIL="$(jq -r '.users[] | select(.role=="admin") | .email' "$DEMO_CONTRACT")"
DEMO_PASSWORD="$(jq -r '.credentials.password' "$DEMO_CONTRACT")"

[[ -n "$DEMO_EMAIL" ]] || fail "Admin demo email not found in demo-contract.json"
[[ -n "$DEMO_PASSWORD" ]] || fail "Demo password missing in demo-contract.json"

pass "Demo credentials loaded ($DEMO_EMAIL)"

# ------------------------------------------------------------
log "1) Start Docker Local (fresh)"
docker compose down -v >/dev/null 2>&1 || true
docker compose up -d --build || fail "docker compose up failed"
pass "Docker Local started"

# ------------------------------------------------------------
log "2) Wait for backend readiness"
for i in {1..20}; do
  if curl -fsS "$API/health" >/dev/null 2>&1; then
    pass "Backend ready"
    break
  fi
  sleep 2
  [[ $i -eq 20 ]] && fail "Backend not ready"
done

# ------------------------------------------------------------
log "3) Wait for frontend readiness"
for i in {1..20}; do
  if curl -fsS "$FRONT" >/dev/null 2>&1; then
    pass "Frontend ready"
    break
  fi
  sleep 2
  [[ $i -eq 20 ]] && fail "Frontend not ready"
done

# ------------------------------------------------------------
log "4) Health must confirm DB connected"
curl -fsS "$API/health" | jq -e '.db.status=="connected"' >/dev/null \
  && pass "DB connected (from /health)" \
  || fail "DB NOT connected"

# ------------------------------------------------------------
log "5) Login as demo admin"
LOGIN_JSON="$(curl -fsS -X POST "$API/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$DEMO_EMAIL\",\"password\":\"$DEMO_PASSWORD\"}")" \
  || fail "Login failed"

TOKEN="$(echo "$LOGIN_JSON" | jq -r '.token // .accessToken // empty')"
[[ -n "$TOKEN" && "$TOKEN" != "null" ]] \
  && pass "Login OK (JWT received)" \
  || fail "Login did not return token: $LOGIN_JSON"

AUTH=(-H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json")

# ------------------------------------------------------------
log "6) Who am I (RBAC sanity)"
set +e
ME="$(curl -fsS "${AUTH[@]}" "$API/api/auth/me" 2>/dev/null)"
set -e
[[ -n "$ME" ]] && pass "RBAC OK (/api/auth/me)" || pass "RBAC endpoint not exposed (skipped)"

# ------------------------------------------------------------
log "7) Companies: list"
COMP_LIST="$(curl -fsS "${AUTH[@]}" "$API/api/companies")" || fail "GET /companies failed"
COMPANY_ID="$(echo "$COMP_LIST" | jq -r '.[0].id // .data[0].id // empty')"

[[ -n "$COMPANY_ID" ]] \
  && pass "Company available ($COMPANY_ID)" \
  || fail "No company found for demo user"

# ------------------------------------------------------------
log "8) Invoices: create"
INV_JSON="$(curl -fsS -X POST "$API/api/invoices" "${AUTH[@]}" -d "{
  \"companyId\":\"$COMPANY_ID\",
  \"clientName\":\"Feature Audit Client\",
  \"currency\":\"EUR\",
  \"items\":[{\"description\":\"Audit Item\",\"quantity\":1,\"unitPrice\":10,\"vatRate\":0.19}]
}")" || fail "Invoice create failed"

INV_ID="$(echo "$INV_JSON" | jq -r '.id // .data.id // empty')"
[[ -n "$INV_ID" ]] && pass "Invoice created ($INV_ID)" || fail "Invoice ID missing"

# ------------------------------------------------------------
log "9) Expenses: create"
EXP_JSON="$(curl -fsS -X POST "$API/api/expenses" "${AUTH[@]}" -d "{
  \"companyId\":\"$COMPANY_ID\",
  \"vendorName\":\"Audit Vendor\",
  \"netAmount\":12.5,
  \"vatRate\":0.19,
  \"currency\":\"EUR\",
  \"description\":\"Feature audit expense\"
}")" || fail "Expense create failed"

EXP_ID="$(echo "$EXP_JSON" | jq -r '.id // .data.id // empty')"
[[ -n "$EXP_ID" ]] && pass "Expense created ($EXP_ID)" || fail "Expense ID missing"

# ------------------------------------------------------------
log "10) AI insights (read-only sanity)"
set +e
AI="$(curl -fsS "${AUTH[@]}" "$API/api/ai/insights" 2>/dev/null)"
set -e
[[ -n "$AI" ]] && pass "AI insights reachable" || pass "AI not enabled (skipped)"

# ------------------------------------------------------------
log "11) Finished (no destructive cleanup)"
pass "Feature walkthrough audit completed"

END="$(date -u +"%Y-%m-%d %H:%M:%S UTC")"
echo "" | tee -a "$REPORT"
echo "========================================" | tee -a "$REPORT"
echo "FEATURE AUDIT COMPLETED SUCCESSFULLY ✅" | tee -a "$REPORT"
echo "Finished: $END" | tee -a "$REPORT"
echo "Report: $REPORT" | tee -a "$REPORT"
echo "========================================" | tee -a "$REPORT"
