# Database as Law Report

## Summary & Scope
- Hardened Postgres so it is literally the law: every expense carries an accountable creator and immutable VAT math, invoices and transactions obey the same math invariants, tax reports enforce their four-state lifecycle, and AI audit logs now record `companyId`, `requestId`, and structured metadata while remaining immutable with current-timestamp defaults.
- Added the sqlite parity shim for new UUID defaults (now covering both the `id`/`requestId` columns and the timing triggers) so dev branches still benefit from request IDs; Postgres remains the canonical gate and is exercised by `npm run test:postgres`.
- AI data and automation remain read-only: the application cannot write to `expenses`, `invoices`, `transactions`, or `tax_reports`; any AI insights/decisions land only in `ai_insights` and `ai_insight_decisions` (the schema for which already enforces explainability fields).

## Applied migrations
- `20260109000000-lock-expenses-accountability.js`
- `20260109001000-lock-audit-immutability.js`
- `20260109002000-lock-tax-report-status.js`
- `20260110000000-lock-expenses-accountability-and-vat.js`
- `20260111002000-strengthen-status-and-enum-checks.js`
- `20260111003000-sqlite-parity-shims.js`
- `20260112000000-add-audit-log-company-requestid.js`

## Table constraint summary
- **expenses**: `createdByUserId`, `netAmount`, `vatAmount`, `grossAmount`, and `vatRate` are `NOT NULL`, `amount` mirrors `grossAmount`, and `expenses_vat_math_consistency` keeps every value non-negative while enforcing `gross = net + vat` and `vat = net * vatRate` before rows reach Postgres.
- **invoice_items**: every line enforces `lineGross = lineNet + lineVat`, `lineVat = lineNet * vatRate`, and non-negative numbers through the `invoice_items_line_consistency` check, so invoiced VAT can never be manufactured in-app.
- **transactions**: `transactions_vat_credit_debit_checks` requires non-negative amounts, respects credit/debit semantics, and ensures any VAT amount ties back to the declared `vat_rate`, so journal entries cannot diverge on paper vs. VAT math.
- **audit_logs**: now persist `companyId`, `requestId`, and `metadata`, keep `createdAt`/`updatedAt` anchored to `CURRENT_TIMESTAMP`, and trigger `audit_logs_immutable_check` so immutability and tenant context are enforced before application code sees the row.
- **tax_reports**: `status` is constrained to `('draft','submitted','accepted','rejected')`, with `data` stored as JSON; the `companyId` FK prevents orphaned filings.
- **bank_statement_import_dry_runs**: `status` check ensures only allowed life-cycle states (PENDING/PROCESSING/CONFIRMED/FAILED); JSON payloads run through `json_valid` triggers when SQLite JSON1 is present.
- **ai_insights**: enums for `severity` & `entityType`, plus JSON validation, guarantee every insight retains explainability metadata (`why`, `legalContext`, `evidence`, `confidenceScore`, `modelVersion`, `disclaimer`).

## Evidence commands to run
1. `docker compose -f docker-compose.test.yml exec -T db psql -U postgres -d smartaccounting_test -c '\\d+ expenses'`
   ```
   amount          | numeric(12,2)            |           | not null |
   date            | date                     |           | not null |
   userId          | integer                  |           | not null |
   companyId       | integer                  |           | not null |
   createdByUserId | integer                  |           | not null |
   netAmount       | numeric(12,2)            |           | not null |
   vatRate         | numeric(5,4)             |           | not null |
   vatAmount       | numeric(12,2)            |           | not null |
   grossAmount     | numeric(12,2)            |           | not null |
   Check constraints:
       "expenses_vat_math_consistency" CHECK ("netAmount" >= 0::numeric AND "vatAmount" >= 0::numeric AND "grossAmount" >= 0::numeric AND "vatRate" >= 0::numeric AND "grossAmount" = ("netAmount" + "vatAmount") AND "vatAmount" = ("netAmount" * "vatRate"))
   ```
2. `docker compose -f docker-compose.test.yml exec -T db psql -U postgres -d smartaccounting_test -c '\\d+ invoice_items'` (ensure the `invoice_items_line_consistency` check is listed and the `vatRate`, `lineNet`, `lineVat`, `lineGross` columns are NOT NULL).
3. `docker compose -f docker-compose.test.yml exec -T db psql -U postgres -d smartaccounting_test -c '\\d+ transactions'` (confirm `transactions_vat_credit_debit_checks` appears and VAT/amount columns are constrained).
4. `docker compose -f docker-compose.test.yml exec -T db psql -U postgres -d smartaccounting_test -c "SELECT conname FROM pg_constraint WHERE conname IN ('expenses_vat_math_consistency','invoice_items_line_consistency','transactions_vat_credit_debit_checks','tax_reports_status_check','audit_logs_immutable_check','bank_statement_import_dry_runs_status_check','ai_insights_severity_check');"`
   ```
   conname
   ------------------------------
   audit_logs_immutable_check
   bank_statement_import_dry_runs_status_check
   expenses_vat_math_consistency
   invoice_items_line_consistency
   transactions_vat_credit_debit_checks
   ai_insights_severity_check
   tax_reports_status_check
   ```
5. `docker compose -f docker-compose.test.yml exec -T db psql -U postgres -d smartaccounting_test -c "SELECT column_name, is_nullable FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name IN ('companyId','requestId') ORDER BY column_name;"`
   ```
   column_name | is_nullable
   ------------+-------------
   companyId   | NO
   requestId   | NO
   ```
6. `npm run test:postgres` (runs migrations plus `tests/postgres/complianceConstraints.test.js`, which now covers VAT math, invoice item math, transaction VAT checks, audit log schema, and enforce statuses).

## Failure examples
- VAT math violation:
  ```sh
  INSERT INTO expenses (...) VALUES (..., netAmount=100, vatRate=0.19, vatAmount=20, grossAmount=120, ...);
  ERROR: new row for relation "expenses" violates check constraint "expenses_vat_math_consistency"
  ```
- Invoice item math violation:
  ```sh
  INSERT INTO invoice_items (...) VALUES (..., lineNet=100, lineVat=22, lineGross=124, vatRate=0.19, ...);
  ERROR: new row for relation "invoice_items" violates check constraint "invoice_items_line_consistency"
  ```
- Transaction VAT mismatch:
  ```sh
  INSERT INTO transactions (...) VALUES (..., amount=100, vat_rate=0.19, vat_amount=10, ...);
  ERROR: new row for relation "transactions" violates check constraint "transactions_vat_credit_debit_checks"
  ```
- Audit log immutability flip:
  ```sh
  UPDATE audit_logs SET immutable = false WHERE action = 'audit-test';
  ERROR: new row for relation "audit_logs" violates check constraint "audit_logs_immutable_check"
  ```
- Tax report status guard:
  ```sh
  INSERT INTO tax_reports (..., status='pending', ...);
  ERROR: new row for relation "tax_reports" violates check constraint "tax_reports_status_check"
  ```
- Missing requestId on audit log:
  ```sh
  INSERT INTO audit_logs (..., requestId=NULL, companyId=1, userId=1, ...);
  ERROR: null value in column "requestId" violates not-null constraint
  ```

## Remaining risks & mitigations
- **SQLite JSON1 availability**: the parity shim checks `pragma_compile_options` and installs `json_valid` triggers only when JSON1 is enabled. When it is missing, JSON validation cannot run in SQLite—Postgres remains the canonical gate (see `npm run test:postgres`).
- **users.companyId is nullable**: service accounts and early bootstrap flows still allow null companies. App-level guards (seed scripts and user creation workflows) enforce assignment for production tenants, and compliance tests run against Postgres to prove those paths obey constraints.
- **SQLite constraint parity**: invoice-item/transaction math checks are Postgres-only; the SQLite shim cannot replicate those CHECK expressions, so developers must run `npm run test:postgres` (which runs `tests/postgres/complianceConstraints.test.js`) as part of CI to keep the Postgres schema guarded. Any production rollout without that guarantee risks missing a check.

**The database enforces the law. The application cannot bypass it.**
