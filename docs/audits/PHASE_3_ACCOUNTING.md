# PHASE_3_ACCOUNTING.md

## Accounting flow diagrams

1. **Invoice lifecycle:** `invoiceService.createInvoice` enforces EUR (via `src/utils/vatIntegrity.js`), iterates invoice items, rounds each line to two decimals (`lineNet`, `lineVat`, `lineGross`), feeds those figures into `VatComplianceService.validateTransaction`, and persists the header/items plus any attachments inside a transaction (`database/seeders/demo/20251226-demo-seed.js` builds invoices with the same rounding rules for consistency).  
2. **Expense capture:** `expenseService.createExpense` enforces vendor/category requirements, calculates VAT from net or gross, rounds every line to cents, validates with `VatComplianceService`, and saves the expense with attachments in a DB transaction; the demo seeder mirrors those calculations (re-deriving `net`/`vat` when only `gross` exists).  
3. **VAT compliance guard:** `VatComplianceService` only allows EU VAT rates (0%, 7%, 19%), verifies all entries are EUR, and recomputes `vat`/`gross` from `net` so any rounding drift is rejected with structured error codes (`VAT_MISMATCH`, `GROSS_MISMATCH`).  
4. **Tax reporting path:** `taxCalculator.calculateUstReport` is supposed to aggregate outbound/inbound invoices, derive GoBD fields (`kz81`, `kz83`, etc.), and surface Elster-ready numbers, feeding into `mapToElsterFields`. `calculateKst/GewSt/EÜR/BWA` run against `Transaction` data for downstream legal reports.

## Edge cases

- **Net-vs-gross entry:** `expenseService` tolerates the caller providing only `grossAmount` and back-calculates `net`/`vat` (and vice versa) while still coercing both to two decimal places so rounding never drifts beyond cents.  
- **VAT rate enforcement:** `VatComplianceService` rejects non-standard rates or currencies, so even if a line item attempts to submit `vatRate=0.25` or `currency=USD`, the system raises `VAT_RATE_ILLEGAL` / `CURRENCY_ILLEGAL` before persisting.  
- **Status transitions:** `invoiceService` only allows `DRAFT → SENT`, `SENT → {PAID, OVERDUE, CANCELLED}`, and `OVERDUE → {PAID, CANCELLED}`; the board prevents reopening `PAID` invoices. `expenseService` similarly only allows `draft → {booked, archived}` and `booked → archived`.  
- **Missing fields in tax reporting:** `taxCalculator` insists on `Invoice.rawAttributes` containing `type`, `invoiceDate`, `vatRate`, etc., and queries statuses `[processed, approved, paid]`. The current `Invoice` model only defines `date`, `status` (uppercase values), and no `type`, so `calculateUstReport` immediately throws `INSUFFICIENT_DATA` and never reaches legal aggregation logic.

## Legal correctness (EU VAT)

- **EU VAT rate fence:** The compliance service hard-codes the three German rates (19%, 7%, 0%), matches UStG expectations, and rejects any other rate (no implicit rounding to hypothetical values).  
- **Currency guard:** Both invoice and expense pipelines use `enforceCurrencyIsEur`, so EUR is the only accepted currency, which keeps VAT bases compliant and avoids FX-induced rounding errors.  
- **Rounding discipline:** Every derived amount (`lineNet`, `lineVat`, `lineGross`, `expense.netAmount`, `vatAmount`, `grossAmount`) goes through `.toFixed(2)` before storage, ensuring the ledger only sees cent-level precision (matching GoBD expectations).  
- **Tax reporting cadence:** `TaxCalculator.calculateUstReport` maps to the legal Elster codes (`Kz81`, `Kz83`, etc.) and computes deadlines (`10th day of the next month` for VAT). However, because the query filters on non-existent invoice metadata, no VAT numbers are ever produced—this is a material legal risk (VAT return would report zeros) until the schema/filters align with the actual invoice data model.

## Test coverage gaps

- `tests/services/vatComplianceService.test.js` covers the compliance engine: valid 19% entry, illegal rates/currencies, and mismatch cases (`VAT_MISMATCH`, `GROSS_MISMATCH`).  
- **Missing coverage:** No unit or integration tests exercise `invoiceService.createInvoice`, `expenseService.createExpense`, or their status transitions, so rounding/VAT enforcement logic relies solely on runtime behavior and the demo seeder.  
- **Tax calculator untested:** There are no tests for `taxCalculator`, so it has never been validated against actual invoices/transactions (and, given the missing `type/invoiceDate` fields, it currently cannot run at all).  
- **Demo seed vs. production:** The seeded invoices/expenses follow the same math as the services, but there is no automated assertion that timestamps, statuses, or totals match the production flows; this gap means regressions in rounding or VAT enforcement could be introduced without detection.

**Gate: FAIL** – `taxCalculator.calculateUstReport` is currently impossible to execute because the `Invoice` model lacks the required `type`/`invoiceDate` columns and stores statuses as `DRAFT/SENT/PAID` while the calculator filters for `[processed, approved, paid]`. As a result, no VAT return can be generated (it would always report zero), which violates legal reporting obligations. This must be fixed before the financial stack can be considered consistent.
