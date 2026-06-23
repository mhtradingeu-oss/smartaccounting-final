# Accounting Reports API Contract

Status: implemented and regression-tested  
Scope: B5 Financial Reporting Layer  
Branch: main

## Purpose

This document is the API contract snapshot for the SmartAccounting financial reporting endpoints.

The reporting layer is read-only. It derives financial reports from posted journal entries scoped to the active company. Draft journal entries are excluded from financial truth reports.

## Authorization model

### Report read endpoints

Allowed roles:

- admin
- accountant
- auditor
- viewer

### Report export endpoint

Allowed roles:

- admin
- accountant
- auditor

Viewer is intentionally excluded from report export access.

## Common rules

All report endpoints are company-scoped through the active authenticated company context.

Unless explicitly noted:

- only posted journal entries are included
- draft journal entries are excluded
- cross-company access is rejected
- dates are passed as query parameters
- responses use JSON
- successful responses include success=true

## Endpoints

### Trial Balance

Endpoint:

- GET /api/reports/trial-balance

Query parameters:

| Parameter | Required | Description |
|---|---:|---|
| from | no | Inclusive lower entry date filter |
| to | no | Inclusive upper entry date filter |

Main response fields:

- success
- report.companyId
- report.filters.from
- report.filters.to
- report.filters.status=posted
- report.rows
- report.totals.debitTotal
- report.totals.creditTotal
- report.totals.difference
- report.totals.isBalanced

### Profit and Loss

Endpoint:

- GET /api/reports/profit-loss

Query parameters:

| Parameter | Required | Description |
|---|---:|---|
| from | no | Inclusive lower entry date filter |
| to | no | Inclusive upper entry date filter |

Main response fields:

- success
- report.companyId
- report.filters
- report.revenue.total
- report.revenue.rows
- report.expenses.total
- report.expenses.rows
- report.totals.totalRevenue
- report.totals.totalExpenses
- report.totals.netIncome

### Balance Sheet

Endpoint:

- GET /api/reports/balance-sheet

Query parameters:

| Parameter | Required | Description |
|---|---:|---|
| asOf | no | Inclusive reporting date |
| to | no | Fallback if asOf is not provided |

Main response fields:

- success
- report.companyId
- report.filters.asOf
- report.filters.status=posted
- report.assets.total
- report.assets.rows
- report.liabilities.total
- report.liabilities.rows
- report.equity.total
- report.equity.rows
- report.totals.totalAssets
- report.totals.totalLiabilities
- report.totals.totalEquity
- report.totals.liabilitiesAndEquity
- report.totals.accountingEquationDifference
- report.totals.isBalanced

### General Ledger

Endpoint:

- GET /api/reports/general-ledger

Query parameters:

| Parameter | Required | Description |
|---|---:|---|
| from | no | Inclusive lower entry date filter |
| to | no | Inclusive upper entry date filter |
| accountId | no | Filter by account ID |
| accountCode | no | Filter by account code |
| sourceType | no | Filter by journal entry source type |

Main response fields:

- success
- report.companyId
- report.filters
- report.accounts
- report.totals.debitTotal
- report.totals.creditTotal

Each account row may include:

- accountId
- accountCode
- accountName
- accountType
- normalBalance
- openingBalance
- debitTotal
- creditTotal
- closingBalance
- movements

Each movement may include:

- journalEntryId
- journalEntryLineId
- entryDate
- sourceType
- sourceId
- description
- debit
- credit
- balanceImpact

### Account Ledger

Endpoint:

- GET /api/reports/account-ledger

Query parameters:

| Parameter | Required | Description |
|---|---:|---|
| accountId | yes unless accountCode is provided | Filter by account ID |
| accountCode | yes unless accountId is provided | Filter by account code |
| from | no | Inclusive lower entry date filter |
| to | no | Inclusive upper entry date filter |
| sourceType | no | Filter by journal entry source type |

Missing account filter error:

- error=true
- errorCode=ACCOUNT_LEDGER_ACCOUNT_REQUIRED

Main response fields:

- success
- report.companyId
- report.filters
- report.account
- report.openingBalance
- report.movements
- report.debitTotal
- report.creditTotal
- report.closingBalance
- report.totals

### VAT Summary

Endpoint:

- GET /api/reports/vat-summary

Query parameters:

| Parameter | Required | Description |
|---|---:|---|
| from | no | Inclusive lower entry date filter |
| to | no | Inclusive upper entry date filter |
| taxCode | no | Filter by tax code, for example DE_19 |
| vatRate | no | Filter by VAT rate, for example 19 or 7 |

Main response fields:

- success
- report.companyId
- report.filters
- report.inputVat.total
- report.inputVat.rows
- report.outputVat.total
- report.outputVat.rows
- report.rows
- report.totals.inputVatTotal
- report.totals.outputVatTotal
- report.totals.netVatPayable
- report.totals.isPayable

VAT rows may include:

- journalEntryId
- journalEntryLineId
- entryDate
- sourceType
- sourceId
- accountId
- accountCode
- accountName
- accountType
- taxCategory
- vatDirection
- taxCode
- vatRate
- debit
- credit
- amount
- description

## Export endpoint

Endpoint:

- GET /api/reports/export

Allowed roles:

- admin
- accountant
- auditor

Viewer is not allowed to export financial reports.

Query parameters:

| Parameter | Required | Description |
|---|---:|---|
| reportType | yes | Report type to export |
| format | no | json or csv; defaults to json |
| from | no | Passed through to supported report types |
| to | no | Passed through to supported report types |
| asOf | no | Used by balance sheet |
| accountId | no | Used by ledger reports |
| accountCode | no | Used by ledger reports |
| sourceType | no | Used by ledger reports |
| taxCode | no | Used by VAT summary |
| vatRate | no | Used by VAT summary |

Supported reportType values:

- trial-balance
- profit-loss
- balance-sheet
- general-ledger
- account-ledger
- vat-summary

JSON export response fields:

- success
- meta.companyId
- meta.reportType
- meta.format
- meta.count
- meta.filters
- report
- rows

CSV export behavior:

- Content-Type: text/csv
- Content-Disposition: attachment;filename="<reportType>.csv"
- CSV headers are stable even when the exported report has no rows.

## CSV columns by report type

### trial-balance

- accountId
- accountCode
- accountName
- accountType
- normalBalance
- debitTotal
- creditTotal
- balance

### profit-loss

- section
- accountId
- accountCode
- accountName
- accountType
- debitTotal
- creditTotal
- balance

### balance-sheet

- section
- accountId
- accountCode
- accountName
- accountType
- debitTotal
- creditTotal
- balance

### general-ledger

- accountId
- accountCode
- accountName
- accountType
- normalBalance
- openingBalance
- closingBalance
- journalEntryId
- journalEntryLineId
- entryDate
- sourceType
- sourceId
- description
- debit
- credit
- balanceImpact

### account-ledger

- accountId
- accountCode
- accountName
- accountType
- normalBalance
- openingBalance
- closingBalance
- journalEntryId
- journalEntryLineId
- entryDate
- sourceType
- sourceId
- description
- debit
- credit
- balanceImpact

### vat-summary

- journalEntryId
- journalEntryLineId
- entryDate
- sourceType
- sourceId
- accountId
- accountCode
- accountName
- accountType
- taxCategory
- vatDirection
- taxCode
- vatRate
- debit
- credit
- amount
- description

## Error codes

| Error code | Meaning |
|---|---|
| REPORT_TYPE_REQUIRED | Export endpoint was called without reportType |
| UNSUPPORTED_EXPORT_FORMAT | Export format is not json or csv |
| UNSUPPORTED_REPORT_TYPE | Export report type is not supported |
| ACCOUNT_LEDGER_ACCOUNT_REQUIRED | Account ledger requires accountId or accountCode |

## Test contract

Core report regression:

- npx jest --runInBand tests/routes/reports.test.js tests/routes/journalEntries.test.js tests/services/accountingPostingService.test.js tests/routes/expenses.test.js tests/services/chartOfAccountsService.test.js

OCR safety regression:

- npx jest --runInBand tests/routes/ocrDocumentIntake.test.js tests/services/documentIntakeAssistantService.test.js

## B5 implementation commits

- 06c71f8 feat: add trial balance report endpoint
- d789095 feat: add profit and loss report endpoint
- bf115b7 feat: add balance sheet report endpoint
- 947733f feat: add general ledger report endpoint
- 0d4f4cc feat: add account ledger report endpoint
- 4551dd8 feat: add VAT summary report endpoint
- 4964943 feat: add financial report export endpoint
- 2ef97ca fix: harden financial report exports

## Current guarantees

- Financial reports are company-scoped.
- Financial reports use posted journal entries only.
- Report export is limited to admin, accountant, and auditor roles.
- Viewer may read reports but may not export them.
- VAT summary separates input VAT and output VAT.
- Account ledger requires an explicit account filter.
- CSV export includes stable headers for empty reports.
- Regression suites listed above must pass before changing this contract.
