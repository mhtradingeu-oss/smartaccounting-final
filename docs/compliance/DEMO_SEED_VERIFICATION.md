# Demo Seed Verification

## Guarded execution
- The seeder checks `DEMO_MODE=true` and `ALLOW_DEMO_SEED=true` before running; if `NODE_ENV` is already `production` you must also set `ALLOW_DEMO_SEED_PROD=true`. The deterministic password is `Demo123!` unless you override `DEMO_PASSWORD`.
- Run the seed with:
  ```bash
  DEMO_MODE=true ALLOW_DEMO_SEED=true node scripts/seed-demo-prod.js
  ```
  Add `ALLOW_DEMO_SEED_PROD=true` when you are intentionally stepping into a production `NODE_ENV` so the guard is satisfied. The script prints a login sheet for `demo-admin@demo.com`, `demo-accountant@demo.com`, `demo-auditor@demo.com`, and `demo-viewer@demo.com`.

## API verification (`curl`)
1. Log in as the admin and capture a bearer token:
   ```bash
  TOKEN=$(curl -s http://localhost:5000/api/auth/login \
    -H 'Content-Type: application/json' \
    -d '{"email":"demo-admin@demo.com","password":"Demo123!"}' | jq -r '.token')
   ```
   (Replace `jq` with another JSON parser if it is not available.)
2. List invoices for the new company:
   ```bash
   curl -H "Authorization: Bearer $TOKEN" http://localhost:5000/api/invoices
   ```
   You should see all 12 invoices, including the draft/sent/paid mix and the reduced-rate invoices for `Kunsthaus Verlag GmbH` and `Brandenburg Creative GmbH`.
3. Inspect AI insights:
   ```bash
   curl -H "Authorization: Bearer $TOKEN" http://localhost:5000/api/ai/insights
   ```
   The response should include the `late-payment-risk`, `vat-anomaly-detection`, and `duplicate-invoice-suspicion` entries with `legalContext`, `reason`, and `confidenceScore` metadata.

## SQL verification
Use the company tax ID `DE123456789` to scope queries. Replace the subqueries when you already know the numeric `companyId`.
1. Confirm invoices and statuses:
   ```sql
   SELECT i."invoiceNumber", i.status, i."date", i."dueDate"
   FROM invoices i
   JOIN companies c ON c.id = i."companyId"
   WHERE c."taxId" = 'DE123456789'
   ORDER BY i."date";
   ```
2. Validate bank coverage and reconciliation:
   ```sql
   SELECT COUNT(*) AS bank_txn_count
   FROM bank_transactions
   WHERE "companyId" = (SELECT id FROM companies WHERE "taxId" = 'DE123456789');
   ```
   Expect `bank_txn_count = 25` and `is_reconciled` rows referencing invoice/expense references showing partial/full matches.
3. Review tax reports:
   ```sql
   SELECT "period", status, data
   FROM tax_reports
   WHERE "companyId" = (SELECT id FROM companies WHERE "taxId" = 'DE123456789')
   ORDER BY "period";
   ```
   The dataset includes two periods (Q1 draft, Q2 submitted) whose JSON data carries the computed VAT totals from the seeded invoices/expenses.
4. Spot-check AI insights + audit logs:
   ```sql
   SELECT type, "legalContext", "confidenceScore", "evidence"
   FROM ai_insights
   WHERE "companyId" = (SELECT id FROM companies WHERE "taxId" = 'DE123456789');
   ```
   ```sql
   SELECT action, "resourceType", reason
   FROM audit_logs
   WHERE reason IN ('demo:invoice','demo:expense','demo:bank-transaction','demo:tax-report','demo:ai-insight')
   ORDER BY "timestamp" DESC
   LIMIT 10;
   ```
   Expect entries for invoices, expenses, bank transactions, tax reports, and AI insights with immutable reason codes.

## AI assistant questions (read-only)
Use the AI assistant/insights routes (no mutations allowed) to verify each insight is surfaced.
1. **Late payment risk:** “Welche Rechnungen im Februar/März haben bereits Teilzahlungen, stehen aber noch auf `SENT`?” — the assistant should mention `SA-INV-2026-002` and cite the GoBD (§239) legal context.
2. **VAT anomaly detection:** “Zeige mir Ausgaben mit ungewöhnlichen Steuersätzen im März 2026.” — the assistant should flag `Berlin summit hospitality` with `UStG § 14` reasoning (7 % VAT on a travel category).
3. **Duplicate invoice suspicion:** “Liegt eine doppelte Rechnung für Märkisches Ventures GmbH vor?” — the assistant should reference `SA-INV-2026-005` / `SA-INV-2026-011` and remind you to check GoBD § 239 / UStG § 14 before reversing.

Running these prompts against the seeded data proves the new AI insights (and their explainability metadata) are returned as read-only guidance.
