# SCHEMA INVENTORY REPORT

## Sequelize Models

| Model Name                | File Path                               | Key Fields                | Enums/Enum Fields    |
| ------------------------- | --------------------------------------- | ------------------------- | -------------------- |
| AuditLog                  | src/models/AuditLog.js                  | id, companyId, userId     |                      |
| AIInsight                 | src/models/AIInsight.js                 | id, companyId, entityId   | entityType, severity |
| Invoice                   | src/models/Invoice.js                   | id, invoiceNumber, userId | status               |
| BankStatementImportDryRun | src/models/BankStatementImportDryRun.js | id, companyId             |                      |
| AIInsightDecision         | src/models/AIInsightDecision.js         | id, insightId, companyId  | decision             |
| RevokedToken              | src/models/RevokedToken.js              | id, userId                |                      |
| ActiveToken               | src/models/ActiveToken.js               | id, userId                |                      |
| TaxReport                 | src/models/TaxReport.js                 | id, companyId             |                      |
| Transaction               | src/models/Transaction.js               | id, companyId             |                      |
| BankStatement             | src/models/BankStatement.js             | id, companyId             |                      |
| User                      | src/models/User.js                      | id, email, companyId      |                      |
| Company                   | src/models/Company.js                   | id, name                  |                      |
| Expense                   | src/models/Expense.js                   | id, companyId             |                      |
| FileAttachment            | src/models/FileAttachment.js            | id, invoiceId             |                      |
| InvoiceItem               | src/models/InvoiceItem.js               | id, invoiceId             |                      |
| BankTransaction           | src/models/BankTransaction.js           | id, bankStatementId       |                      |

## Migrations (in order)

| Filename                                                | Purpose/Description                   | Tables/Columns Touched         |
| ------------------------------------------------------- | ------------------------------------- | ------------------------------ |
| 20251225000100-create-companies.js                      | Create companies table                | companies                      |
| 20251225000200-create-users.js                          | Create users table                    | users                          |
| 20251225000300-create-revoked-tokens.js                 | Create revoked_tokens table           | revoked_tokens                 |
| 20251225000400-create-audit-logs.js                     | Create audit_logs table               | audit_logs                     |
| 20251225000500-create-invoices.js                       | Create invoices table                 | invoices                       |
| 20251225000600-create-invoice-items.js                  | Create invoice_items table            | invoice_items                  |
| 20251225000700-create-expenses.js                       | Create expenses table                 | expenses                       |
| 20251225000800-create-bank-statements.js                | Create bank_statements table          | bank_statements                |
| 20251225000900-create-bank-transactions.js              | Create bank_transactions table        | bank_transactions              |
| 20251225001000-create-tax-reports.js                    | Create tax_reports table              | tax_reports                    |
| 20251225001300-create-active-tokens.js                  | Create active_tokens table            | active_tokens                  |
| 20251227000000-extend-demo-schema.js                    | Extend demo schema                    | multiple                       |
| 20251227001000-create-file-attachments.js               | Create file_attachments table         | file_attachments               |
| 20251228000100-create-transactions.js                   | Create transactions table             | transactions                   |
| 20251228000200-update-tax-reports-schema.js             | Update tax_reports schema             | tax_reports                    |
| 20251228000300-extend-bank-transactions.js              | Extend bank_transactions              | bank_transactions              |
| 20251228000400-add-ai-enabled-to-companies.js           | Add aiEnabled to companies            | companies                      |
| 20251228000500-create-bank-statement-import-dry-runs.js | Create bank_statement_import_dry_runs | bank_statement_import_dry_runs |
| 20260102000000-set-invoice-items-id-default.js          | Set default for invoice_items id      | invoice_items                  |

## Seeders

| Filename                               | What it Inserts         | Required Schema        |
| -------------------------------------- | ----------------------- | ---------------------- |
| 20251225001100-seed-default-company.js | Default company         | companies              |
| 20251225001200-seed-admin-user.js      | Admin user              | users, companies       |
| demo/20251226-demo-seed.js             | Demo data (users, etc.) | users, companies, etc. |

## Migration/Seeder Scripts & Environment Flags

| Script                      | Purpose                    | Key Environment Flags Used                          |
| --------------------------- | -------------------------- | --------------------------------------------------- |
| scripts/migrate-prod.js     | Run production migrations  | NODE_ENV, DATABASE_URL, USE_SQLITE                  |
| scripts/seed-demo-prod.js   | Seed demo data in prod     | DEMO_MODE, ALLOW_DEMO_SEED, NODE_ENV, DEMO_PASSWORD |
| scripts/check-migrations.js | Check migration readiness  | USE_SQLITE, DATABASE_URL                            |
| scripts/demo-verify.js      | Verify demo endpoints/data | USE_SQLITE, NODE_ENV, JWT_SECRET                    |

## Known Risk Areas

- **Enums**: Models use enums for status, severity, entityType, and decision fields. Enum changes require migration and code update.
- **Nullable Fields**: Some fields (e.g., amount, reason, generatedAt) are nullable; ensure business logic handles nulls.
- **Feature Flags**: DEMO_MODE, ALLOW_DEMO_SEED, USE_SQLITE, DATABASE_URL, and others control critical behaviors. Misconfiguration can affect data integrity or environment safety.

---

_Generated by automated schema audit on 2025-12-29._
