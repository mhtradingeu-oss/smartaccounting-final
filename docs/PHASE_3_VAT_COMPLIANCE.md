# VAT/UStG Compliance Engine (Phase 3)

## Purpose
Ensures all accounting transactions comply with German VAT law (UStG):
- Only legal VAT rates (0, 7, 19)
- Net/VAT/Gross math is correct
- EUR currency enforced
- No auto-fix: illegal data is always rejected

## Key Features
- **Reusable**: Can be called by invoices, expenses, or any transaction
- **API**: `/api/compliance/validate-transaction` (POST)
- **Structured errors**: Returns compliance codes for each violation
- **No business logic changes**: Pure validation layer

## Validation Rules
- VAT rate must be 0, 7, or 19
- Currency must be EUR
- VAT = net * rate (rounded to 2 decimals)
- Gross = net + VAT (rounded to 2 decimals)
- All errors are reported, nothing is auto-corrected

## Example Error Codes
- `VAT_RATE_ILLEGAL`: VAT rate is not allowed
- `CURRENCY_ILLEGAL`: Currency is not EUR
- `VAT_MISMATCH`: VAT does not match net * rate
- `GROSS_MISMATCH`: Gross does not match net + VAT

## Tests
- Accepts valid transactions
- Rejects illegal VAT rates
- Rejects non-EUR currency
- Detects math mismatches

---
Prepared: 2025-12-15
By: GitHub Copilot (GPT-4.1)
