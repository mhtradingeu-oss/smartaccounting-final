#!/usr/bin/env bash
set -u

ROOT="${1:-.}"
cd "$ROOT" || exit 1

STAMP="$(date +%Y%m%d_%H%M%S)"
OUT="docs/final-truth/audits/SMARTACCOUNTING_FULL_TRUTH_SCAN_${STAMP}.txt"
mkdir -p "$(dirname "$OUT")"

exec > >(tee "$OUT") 2>&1

section() {
  printf "\n\n====================================================================\n"
  printf "%s\n" "$1"
  printf "====================================================================\n"
}

safe_rg() {
  rg -n --hidden \
    --glob '!node_modules/**' \
    --glob '!client/node_modules/**' \
    --glob '!dist/**' \
    --glob '!build/**' \
    --glob '!coverage/**' \
    --glob '!.git/**' \
    --glob '!docs/final-truth/audits/**' \
    --glob '!docs/AUDIT/**' \
    --glob '!docs/audits/**' \
    --glob '!*.log' \
    "$@" || true
}

section "0. SCAN METADATA"
date
pwd
git rev-parse --show-toplevel 2>/dev/null || true
git status --short --branch
git rev-list --left-right --count origin/main...HEAD 2>/dev/null || true
git log --oneline -20 2>/dev/null || true

section "1. AUTHORITATIVE FINAL VISION"
ls -l docs/final-truth/SMARTACCOUNTING_FINAL_PRODUCT_VISION.md 2>/dev/null || true
sed -n '1,260p' docs/final-truth/SMARTACCOUNTING_FINAL_PRODUCT_VISION.md 2>/dev/null || true

section "2. REPOSITORY STRUCTURE"
find . -maxdepth 3 -type d \
  -not -path './.git*' \
  -not -path './node_modules*' \
  -not -path './client/node_modules*' \
  -not -path './dist*' \
  -not -path './build*' \
  -not -path './coverage*' | sort
printf "\nFILES BY TOP-LEVEL AREA\n"
find src client/src server/src tests docs scripts migrations seeders -type f 2>/dev/null | sort

section "3. PACKAGE AND RUNTIME CONTRACTS"
for f in package.json client/package.json docker-compose.yml docker-compose.prod.yml .env.example client/vite.config.js scripts/start-all.sh scripts/stop-all.sh; do
  if [ -f "$f" ]; then
    printf "\n--- %s ---\n" "$f"
    sed -n '1,360p' "$f"
  fi
done

section "4. APPLICATION ENTRYPOINTS AND ROUTE REGISTRATION"
for f in index.js src/app.js src/server.js server/index.js server/src/app.js; do
  if [ -f "$f" ]; then
    printf "\n--- %s ---\n" "$f"
    sed -n '1,420p' "$f"
  fi
done
safe_rg "app\.use|router\.(get|post|put|patch|delete)|express\.Router|EXPRESS_API_PREFIX|swagger|health|ready|metrics" index.js src server client/src

section "5. MODELS MIGRATIONS AND DATABASE TRUTH"
find src/models server/src/models migrations seeders -type f 2>/dev/null | sort
safe_rg "sequelize\.define|class .* extends Model|init\(|references:|allowNull|unique:|indexes:|transaction\(" src/models server/src/models migrations seeders

section "6. AUTH SECURITY ROLES PERMISSIONS TENANT ISOLATION"
safe_rg "authenticate|authorize|requireRole|permissionGuard|requireCompany|companyId|x-company-id|tenant|role|admin|accountant|auditor|viewer|rateLimit|helmet|cors|csrf|mfa|refresh token|session" src server client/src tests

section "7. ACCOUNTING CORE"
safe_rg "Invoice|Expense|JournalEntry|JournalLine|Ledger|ChartOfAccount|posting preview|previewPosting|finalize|post|reverse|reversal|balanced|debit|credit|accounts receivable|accounts payable|credit note" src server client/src tests

section "8. REPORTING VAT TAX DATEV GOBD ELSTER"
safe_rg "trial-balance|profit-loss|balance-sheet|general-ledger|account-ledger|cash flow|aging|vat-summary|UStVA|ustva|DATEV|datev|GoBD|gobd|ELSTER|elster|tax-bridge|tax readiness|period close|lock period" src server client/src tests docs

section "9. DOCUMENT OCR INTAKE"
safe_rg "OCR|ocr|document intake|reviewed values|decisionFingerprint|draftKind|createDraftFromReviewed|extraction|confidence|duplicate document|pdf text|unsupported pdf" src server client/src tests docs

section "10. AI ARCHITECTURE AND PROVIDERS"
find src/services/ai server/src/modules/ai-brain server/src/modules/voice client/src -type f 2>/dev/null | sort
safe_rg "AIOrchestrator|orchestrator|tool registry|toolId|policyVersion|purpose|approval queue|Approval|claimExecution|completeExecution|failExecution|recovery|prompt|provider|OpenAI|Anthropic|modelVersion|confidence|insight|forecast|explain" src server client/src tests docs

section "11. APPROVAL EXECUTION RECOVERY TIMELINE"
safe_rg "approval|approve|reject|executing|executed|claimExecution|completeExecution|failExecution|recovery evidence|recover existing|safeDraftExecution|execution timeline|correlationId|idempot" src server client/src tests docs

section "12. BANK AND RECONCILIATION"
safe_rg "bank statement|bank transaction|CAMT|MT940|reconciliation|match suggestion|partial payment|split transaction|bank fee|unmatched|IBAN" src server client/src tests docs

section "13. FRONTEND ROUTES PAGES AND UX COVERAGE"
find client/src/pages client/src/components client/src/services client/src/hooks client/src/context client/src/store -type f 2>/dev/null | sort
safe_rg "Route|ProtectedRoute|FeatureGate|SmartReview|Dashboard|Invoice|Expense|Document|Bank|Journal|Report|VAT|DATEV|Audit|Approval|Recovery|Kanzlei|Mandant|Notification|Billing|Settings" client/src

section "14. KANZLEI MULTI-COMPANY TEAM WORKSPACE"
safe_rg "Kanzlei|Mandant|mandate|accounting firm|client workspace|assigned client|team task|advisor note|company switch|multi-company" src server client/src tests docs

section "15. NOTIFICATIONS JOBS QUEUES AUTOMATION"
safe_rg "notification|email job|BullMQ|bull|queue|worker|job|retry|dead-letter|cron|scheduler|background|Redis" src server client/src tests scripts docs

section "16. FILE STORAGE EXPORTS BACKUPS DISASTER RECOVERY"
safe_rg "storage|S3|upload|attachment|checksum|hash|backup|restore|RPO|RTO|disaster recovery|ZIP|archiver|export history|manifest" src server client/src tests scripts docs docker-compose*

section "17. OBSERVABILITY AND OPERATIONS"
safe_rg "logger|logging|requestId|correlationId|metrics|prometheus|sentry|trace|health|ready|uptime|slow query|alert|monitor" src server client/src tests scripts docs docker-compose*

section "18. GDPR LEGAL RETENTION COMMERCIAL BILLING"
safe_rg "GDPR|DSGVO|privacy|retention|deletion|data export|consent|DPA|subprocessor|billing|subscription|plan|trial|Stripe|pricing|SLA|terms" src server client/src tests docs

section "19. TEST INVENTORY AND QUALITY SIGNALS"
find tests src client/src server -type f \( -name '*test*' -o -name '*spec*' \) 2>/dev/null | sort
safe_rg "describe\(|test\(|it\(|skip\(|todo\(|FIXME|TODO|HACK|Force exiting Jest|open handle" tests src client/src server docs

section "20. LEGACY DUPLICATION AND ARCHITECTURAL DRIFT"
safe_rg "legacy|deprecated|duplicate|orphan|unused|experimental|temporary|mock|fallback|not implemented|disabled|501|405" src server client/src docs tests
printf "\nPOTENTIAL DUPLICATE FILE NAMES\n"
find src server/src client/src -type f 2>/dev/null | awk -F/ '{print $NF}' | sort | uniq -d

section "21. DOCUMENTATION AND PHASE HISTORY"
find docs -type f 2>/dev/null | sort
safe_rg "P[0-9]+|CERT-[0-9]+|PASS|LOCKED|CLOSED|source of truth|handover|roadmap|production ready|release candidate" docs

section "22. STATIC VALIDATION COMMAND INVENTORY"
node -e 'const p=require("./package.json"); console.log(JSON.stringify(p.scripts||{}, null, 2))' 2>/dev/null || true
node -e 'const p=require("./client/package.json"); console.log(JSON.stringify(p.scripts||{}, null, 2))' 2>/dev/null || true

section "23. RUNTIME STATUS WITHOUT MUTATION"
docker compose ps 2>/dev/null || true
curl -sS -i --max-time 5 http://localhost:5001/health 2>/dev/null || true
curl -sS -i --max-time 5 http://localhost:5001/api/health 2>/dev/null || true
curl -sS -i --max-time 5 http://localhost:5173/ 2>/dev/null | sed -n '1,40p' || true

section "24. FINAL REPOSITORY VERIFICATION"
git diff --check
git status --short --branch
git rev-list --left-right --count origin/main...HEAD 2>/dev/null || true
printf "\nTRUTH_SCAN_OUTPUT=%s\n" "$OUT"
printf "SCAN_COMPLETE=YES\n"
