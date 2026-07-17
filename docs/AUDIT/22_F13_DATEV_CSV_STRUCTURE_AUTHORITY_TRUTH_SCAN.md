# F13 — DATEV CSV Structure and Authority Truth Scan

## Status

CSV STRUCTURE REVIEW COMPLETE — AUTHORITY NOT YET APPROVED

## Purpose

This document records the structure and visible authority signals of the two local DATEV CSV exports.

It does not approve any SKR04 BWA mapping, runtime definition, DATEV compatibility claim, or source redistribution.

## Source 1

- File: `datev-export.csv`
- Local path: `/Users/nadeemnour/Downloads/datev-export.csv`
- SHA-256: `86c791714feeb9a006b2be39212ce2cb3d40fbe9ecb0e7ac5458610345597ded`
- Size bytes: `2037`
- Encoding: `utf-8-sig`
- Delimiter: `COMMA`
- Non-empty rows: `22`
- Most common column count: `11`
- Preliminary classification: `NO_MAPPING_SIGNAL_FOUND`

### Header

1. `recordType`
2. `recordId`
3. `bookingDate`
4. `account`
5. `counterAccount`
6. `amount`
7. `vatAmount`
8. `currency`
9. `taxKey`
10. `bookingText`
11. `attachmentPaths`

### Header Authority Signals

No relevant header signal found.

### Content Keyword Signals

No relevant keyword signal found.

### Sample Rows

- `recordType | recordId | bookingDate | account | counterAccount | amount | vatAmount | currency | taxKey | bookingText | attachmentPaths`
- `invoice | 1 | 2026-02-01 | 1200 | 8400 | 2500.00 | 475.00 | EUR | 19 | Invoice SA-INV-2026-001 | `
- `invoice | 2 | 2026-02-08 | 1200 | 8400 | 1750.00 | 332.50 | EUR | 19 | Invoice SA-INV-2026-002 | `
- `invoice | 4 | 2026-02-20 | 1200 | 8400 | 2380.00 | 452.20 | EUR | 19 | Invoice SA-INV-2026-004 | `
- `invoice | 5 | 2026-03-03 | 1200 | 8400 | 3000.00 | 570.00 | EUR | 19 | Invoice SA-INV-2026-005 | `
- `invoice | 6 | 2026-03-09 | 1200 | 8400 | 2900.00 | 551.00 | EUR | 19 | Invoice SA-INV-2026-006 | `
- `invoice | 8 | 2026-03-24 | 1200 | 8300 | 700.00 | 49.00 | EUR | 7 | Invoice SA-INV-2026-008 | `
- `invoice | 9 | 2026-04-02 | 1200 | 8400 | 4200.00 | 798.00 | EUR | 19 | Invoice SA-INV-2026-009 | `

## Source 2

- File: `datev-export (1).csv`
- Local path: `/Users/nadeemnour/Downloads/datev-export (1).csv`
- SHA-256: `86c791714feeb9a006b2be39212ce2cb3d40fbe9ecb0e7ac5458610345597ded`
- Size bytes: `2037`
- Encoding: `utf-8-sig`
- Delimiter: `COMMA`
- Non-empty rows: `22`
- Most common column count: `11`
- Preliminary classification: `NO_MAPPING_SIGNAL_FOUND`

### Header

1. `recordType`
2. `recordId`
3. `bookingDate`
4. `account`
5. `counterAccount`
6. `amount`
7. `vatAmount`
8. `currency`
9. `taxKey`
10. `bookingText`
11. `attachmentPaths`

### Header Authority Signals

No relevant header signal found.

### Content Keyword Signals

No relevant keyword signal found.

### Sample Rows

- `recordType | recordId | bookingDate | account | counterAccount | amount | vatAmount | currency | taxKey | bookingText | attachmentPaths`
- `invoice | 1 | 2026-02-01 | 1200 | 8400 | 2500.00 | 475.00 | EUR | 19 | Invoice SA-INV-2026-001 | `
- `invoice | 2 | 2026-02-08 | 1200 | 8400 | 1750.00 | 332.50 | EUR | 19 | Invoice SA-INV-2026-002 | `
- `invoice | 4 | 2026-02-20 | 1200 | 8400 | 2380.00 | 452.20 | EUR | 19 | Invoice SA-INV-2026-004 | `
- `invoice | 5 | 2026-03-03 | 1200 | 8400 | 3000.00 | 570.00 | EUR | 19 | Invoice SA-INV-2026-005 | `
- `invoice | 6 | 2026-03-09 | 1200 | 8400 | 2900.00 | 551.00 | EUR | 19 | Invoice SA-INV-2026-006 | `
- `invoice | 8 | 2026-03-24 | 1200 | 8300 | 700.00 | 49.00 | EUR | 7 | Invoice SA-INV-2026-008 | `
- `invoice | 9 | 2026-04-02 | 1200 | 8400 | 4200.00 | 798.00 | EUR | 19 | Invoice SA-INV-2026-009 | `

## Cross-File Decision

The CSV files do not presently demonstrate a complete standard BWA-Form 1 SKR04 2024 row-assignment schema.

## Authority Requirements Still Open

- DATEV publisher or system provenance
- explicit SKR04
- explicit BWA-Form 1
- explicit applicable year 2024
- complete row-to-account or row-to-Kontenzweck assignment
- standard versus customer-customized status
- source revision
- completeness of all rows and assignment sections

## Blocking Decision

F13-R11-C2 remains blocked unless a complete standard BWA-Form 1 SKR04 2024 assignment is proven.

## Repository Safety

- No CSV file was copied.
- No CSV file was modified.
- No source data was staged.
- No mapping was inferred from labels alone.
- No runtime code was changed.

## Approved Next Action

Classify each CSV as transaction export, account master export, account-purpose export, BWA schema export, or unknown.

Only a file proven to contain the complete standard BWA-Form 1 SKR04 2024 assignment may advance to reviewed mapping.
