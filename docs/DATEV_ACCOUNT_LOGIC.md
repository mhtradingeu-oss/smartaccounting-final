# DATEV Account Logic

## Overview

Describes how SmartAccounting determines the correct DATEV account for each transaction type.

### Invoices

- Revenue account is selected based on VAT rate and transaction type.
- Example: 19% VAT → SKR03: 8400, SKR04: 4400

### Expenses

- Input VAT account is selected based on VAT rate.
- Example: 19% VAT → SKR03/SKR04: 1576

### Corrections

- Corrections use the same logic as the original transaction, with reversal flag set.

### Payments

- Payments are mapped to bank/cash accounts as per DATEV guidelines.

## References

- See also: DATEV_MAPPING_SKR03.md, DATEV_MAPPING_SKR04.md
