# P4 — Invoice / Expense / VAT / DATEV Certification

## Status

PASS WITH REGISTERED WARNINGS

P4 certifies the invoice, expense, VAT reporting, DATEV export preparation, Tax Bridge readiness, attachment include stability, role guards, and company boundary behavior after the attachment evidence fix.

## Source commit

- Final verified commit: `abf9cd2 fix: stabilize expense attachment evidence linking`
- Previous P3 lock: `147467f docs: lock P3 accounting core certification`

## Scope certified

- Invoice list and detail read
- Expense list and detail read
- VAT summary report
- Trial balance report
- DATEV export preparation
- Tax Bridge readiness
- Company boundary protection
- Viewer write guard
- Attachment include stability for invoices and expenses
- Expense document evidence linking service behavior
- Migration status for expense attachment schema

## Critical fix included in P4

P4 discovered and fixed an attachment schema mismatch:

- `expenses.id` is INTEGER.
- `file_attachments.expense_id` was UUID.
- This caused PostgreSQL include failure for `Expense.hasMany(FileAttachment, { foreignKey: 'expenseId' })`.

The fix was committed as:

`abf9cd2 fix: stabilize expense attachment evidence linking`

Files changed:

- `database/migrations/20260121000000-fix-file-attachments-expense-id-integer.js`
- `src/models/FileAttachment.js`
- `src/services/expenseService.js`

The migration converts `file_attachments.expense_id` to INTEGER and adds a foreign key to `expenses.id`.

## Runtime certification evidence

### Migration

`20260121000000-fix-file-attachments-expense-id-integer.js` is up.

### Login

- admin login: HTTP 200
- accountant login: HTTP 200
- auditor login: HTTP 200
- viewer login: HTTP 200

### Accounting document reads

- accountant `GET /api/invoices`: HTTP 200
- accountant `GET /api/invoices/1`: HTTP 200
- accountant `GET /api/expenses`: HTTP 200
- accountant `GET /api/expenses/1`: HTTP 200

### Reports

- accountant `GET /api/reports/vat-summary`: HTTP 200
- accountant `GET /api/reports/trial-balance`: HTTP 200
- Trial balance returned balanced totals.

### DATEV

The correct DATEV export preparation route is:

`GET /api/exports/datev`

Certified role behavior:

- admin: HTTP 200
- accountant: HTTP 200
- auditor: HTTP 200

The obsolete/non-canonical route `/api/datev/export` is not the certified endpoint.

### Tax Bridge

The Tax Bridge readiness route is:

`GET /api/tax-bridge/readiness`

Certified role behavior:

- admin: HTTP 200
- accountant: HTTP 403
- auditor: HTTP 403

This is currently certified as an admin-only readiness endpoint.

The Tax Bridge explicitly remains preparation-only:

- no DATEV API upload
- no ELSTER submission
- tax filing/payment decisions require user and/or Steuerberater review

### Company boundary

Wrong-company access returned `403 COMPANY_CONTEXT_INVALID` for:

- invoices list
- invoice detail
- expenses list
- expense detail
- DATEV export
- Tax Bridge readiness

### Viewer write guard

Viewer write attempts returned `403 PERMISSION_DENIED` for:

- `POST /api/invoices`
- `POST /api/expenses`

### Attachment include

Post-fix runtime include verification:

- `EXPENSE_INCLUDE_OK true`
- `INVOICE_INCLUDE_OK true`

This confirms that the previous PostgreSQL integer/UUID include failure is resolved.

## Test evidence

Targeted tests passed after the P4 attachment fix:

- `tests/routes/expenses.test.js`
- `tests/routes/datevExport.test.js`
- `tests/routes/taxBridgeReadiness.test.js`
- `tests/datev/datev.export.expenses.test.js`
- `tests/datev/datev.export.invoices.test.js`
- `tests/services/accountingPostingService.test.js`

Validation passed:

- `npm run lint -- --quiet`
- app require smoke returned `APP_REQUIRE_OK function true`

## Registered warnings

### P4-WARN-1 — Tax Bridge readiness is admin-only

`/api/tax-bridge/readiness` returns 403 for accountant and auditor. This is accepted as the current role contract, but it must be documented for product decisions.

### P4-WARN-2 — Demo expense attachments are still missing

Tax Bridge readiness reports:

- `expenseAttachments: 0`
- warning code: `NO_EXPENSE_ATTACHMENTS`

This is now a data/evidence coverage warning, not a schema/include bug.

### P4-WARN-3 — Draft invoices exist

Tax Bridge readiness reports draft invoices. Draft invoices are excluded from DATEV export preparation until finalized or explicitly excluded.

### P4-WARN-4 — DATEV and ELSTER are preparation-only

The system prepares/export files and readiness reports. It does not submit directly to DATEV or ELSTER.

## Final decision

P4 is certified as:

PASS WITH REGISTERED WARNINGS

No further P4 source patch is required before moving to the next certification phase, unless product scope changes the Tax Bridge role contract or requires demo expense attachment seed coverage.
