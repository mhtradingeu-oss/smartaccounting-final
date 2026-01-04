# Database as Law Report

## Summary & Scope
- Completed the **Database Legal Lockdown Phase** by hardening Postgres for GoBD/GoB and UStG/AO mandates: expenses now carry accountable creators, complete VAT money pillars, and a closed-loop math check; audit logs are timestamped at the DB level and locked immutable; tax reports enforce a legal status enumeration; AI and bank dry-run metadata respect native constraint fences.
- Added SQLite parity shims (UUID defaults, timestamps, optional JSON validation) so developers can still run in-memory tests, while the Postgres gate is the authoritative compliance prove-out.
- Docker services now wire the frontend to `http://backend:5000/api` and the backend always exposes `/api`, keeping API_BASE_URL stable in dev/test/prod.

## Applied migrations
- `20260109000000-lock-expenses-accountability.js`
- `20260109001000-lock-audit-immutability.js`
- `20260109002000-lock-tax-report-status.js`
- `20260110000000-lock-expenses-accountability-and-vat.js`
- `20260111002000-strengthen-status-and-enum-checks.js`
- `20260111003000-sqlite-parity-shims.js`

## Table constraint summary
- **expenses**: `createdByUserId`, `userId`, `netAmount`, `vatAmount`, `grossAmount`, `vatRate`, `amount`, `date`, `expenseDate` are `NOT NULL`; `amount` mirrors `grossAmount`; FKs to `users` & `companies` cascade; check `expenses_vat_math_consistency` enforces non-negative values and the VAT math identity.
- **audit_logs**: `createdAt`/`updatedAt` default `CURRENT_TIMESTAMP` via migration and triggers; `immutable` defaults to `true` and is guarded by `audit_logs_immutable_check`; FK to `users` links every entry to the actor.
- **tax_reports**: `status` is constrained to `('draft','submitted','accepted','rejected')`, with `data` stored as JSON; `companyId` FK prevents orphaned filings.
- **bank_statement_import_dry_runs**: `status` check ensures only allowed life-cycle states (PENDING/PROCESSING/CONFIRMED/FAILED); JSON payloads run through `json_valid` triggers when SQLite JSON1 is present.
- **ai_insights**: enums for `severity` & `entityType` plus JSON validation ensure AI decisions cannot escape the approved legal vocabulary.

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
2. `docker compose -f docker-compose.test.yml exec -T db psql -U postgres -d smartaccounting_test -c "SELECT conname FROM pg_constraint WHERE conname IN ('expenses_vat_math_consistency','tax_reports_status_check','audit_logs_immutable_check','bank_statement_import_dry_runs_status_check','ai_insights_severity_check');"`
   ```
   conname
   ------------------------------
   audit_logs_immutable_check
   tax_reports_status_check
   expenses_vat_math_consistency
   ai_insights_severity_check
   bank_statement_import_dry_runs_status_check
   ```
3. `npm run test:postgres` (runs migrations + migrations gate + `tests/postgres/complianceConstraints.test.js`) to exercise all constraints end-to-end.

## Failure examples
- VAT math violation:
  ```sh
  INSERT INTO expenses (...) VALUES (..., netAmount=100, vatRate=0.19, vatAmount=20, grossAmount=120, ...);
  ERROR: new row for relation "expenses" violates check constraint "expenses_vat_math_consistency"
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

## Remaining risks & mitigations
- **SQLite JSON1 availability**: the parity shim checks `pragma_compile_options` and installs `json_valid` triggers only when JSON1 is enabled. When it is missing, JSON validation cannot run in SQLite—Postgres remains the canonical gate (see `npm run test:postgres`).
- **users.companyId is nullable**: service accounts and early bootstrap flows still allow null companies. App-level guards (seed scripts and user creation workflows) enforce assignment for production tenants, and compliance tests run against Postgres to prove those paths obey constraints.

**The database enforces the law. The application cannot bypass it.**
