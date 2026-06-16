# VAT Logic Whitepaper

## Overview

This document details the VAT calculation logic in SmartAccounting, including all edge cases and compliance rules.

## VAT Calculation

- VAT is calculated as: `net amount × VAT rate`
- No recalculation during export; persisted values are used

## Rounding Rules

- All amounts are rounded to two decimal places (commercial rounding)
- Example: 99.995 → 100.00

## Reverse-Charge Handling

- Reverse-charge transactions are flagged and mapped to correct accounts
- Both input and output VAT are shown as required by DATEV

## Tax Point Date Logic

- The tax point date is determined by the invoice/expense date unless overridden by law
- All exports use the persisted tax point date

## Compliance

- All logic is reviewed by Steuerberater
- No hidden or silent adjustments
