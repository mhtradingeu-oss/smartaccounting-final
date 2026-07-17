# F13 — SKR04 2024 Local Source Acquisition Truth Scan

## Status

LOCAL SOURCE INVENTORY COMPLETE — AUTHORITY REVIEW NOT YET COMPLETE

## Purpose

This document records local candidate source files that may support the SKR04 2024 BWA mapping review.

It does not approve any account mapping, source authority, copyright status, schema completeness, or runtime implementation.

## Scan Boundary

The scan searched the user Downloads directory, Desktop directory, and SmartAccounting repository.

## Candidate Inventory

| File | Type | Size Bytes | Modified UTC | SHA-256 | Local Path |
|---|---|---:|---|---|---|
| 02-prisma-schema.txt | text/plain | 0 | 2026-07-02T23:40:50.534728+00:00 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | `/Users/nadeemnour/Desktop/MH-Assistant-PRODUCTION-LOCAL/audits/backend/deep-truth-final/02-prisma-schema.txt` |
| 02-prisma-schema.txt | text/plain | 0 | 2026-06-03T11:58:40.171845+00:00 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | `/Users/nadeemnour/Desktop/backup MH-assestent /Last-Update-MH-Assistant MY BACKUP/audits/backend/deep-truth-final/02-prisma-schema.txt` |
| 02-prisma-schema.txt | text/plain | 0 | 2026-06-03T11:58:40.171845+00:00 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | `/Users/nadeemnour/Desktop/backup MH-assestent /Last-Update-MH-Assistant/audits/backend/deep-truth-final/02-prisma-schema.txt` |
| 02-prisma-schema.txt | text/plain | 0 | 2026-07-02T17:56:37.846534+00:00 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | `/Users/nadeemnour/Desktop/backup MH-assestent /production-clean-control-plane/audits/backend/deep-truth-final/02-prisma-schema.txt` |
| #10039 01-07-2024 BWA Jahresübersicht.pdf | application/pdf | 9522 | 2026-07-05T11:05:08+00:00 | `4f5c3fcdb85b36781e7d4d5540153be599d4d965febc11766a8cc51dd9a250d8` | `/Users/nadeemnour/Downloads/#10039 01-07-2024 BWA Jahresübersicht.pdf` |
| #10039 v.01-02.03.04.-2024_Jahresübersicht BWA.pdf | application/pdf | 9655 | 2026-07-05T11:05:49+00:00 | `f0d06ff8f78a88eae6638663b9c4686afe4391235833c1eb044108e66c7ae7fe` | `/Users/nadeemnour/Downloads/#10039 v.01-02.03.04.-2024_Jahresübersicht BWA.pdf` |
| datev-export (1).csv | text/csv | 2037 | 2026-07-13T17:38:25.844169+00:00 | `86c791714feeb9a006b2be39212ce2cb3d40fbe9ecb0e7ac5458610345597ded` | `/Users/nadeemnour/Downloads/datev-export (1).csv` |
| datev-export.csv | text/csv | 2037 | 2026-07-05T10:52:57.367791+00:00 | `86c791714feeb9a006b2be39212ce2cb3d40fbe9ecb0e7ac5458610345597ded` | `/Users/nadeemnour/Downloads/datev-export.csv` |
| PHASE_5_DATEV_ELSTER_TRUTH_20260703_093458.txt | text/plain | 294585 | 2026-07-03T07:35:59.719998+00:00 | `02c2d57097695d9fca45c5c1142059d496b731f714e6528e4869740a88a4d88b` | `/Users/nadeemnour/smartaccounting-final/local-audit-private/phase5/PHASE_5_DATEV_ELSTER_TRUTH_20260703_093458.txt` |

## Required Manual Classification

Every candidate must be classified as exactly one of:

- OFFICIAL_ACCOUNT_FRAMEWORK
- OFFICIAL_BWA_SCHEMA
- OFFICIAL_YEAR_CHANGE_DOCUMENT
- CUSTOMER_BWA_REPORT
- CUSTOMER_CUSTOMIZED_SCHEMA
- LEGACY_NOTE
- UNKNOWN

## Authority Review Questions

- Is DATEV the publisher?
- Is SKR04 explicit?
- Is BWA-Form 1 explicit?
- Is 2024 explicit?
- Is the source revision visible?
- Are complete row-to-account assignments present?
- Are Kontenzwecke used instead of direct accounts?
- Is the schema standard or customer customized?
- Are pages or assignment sections missing?
- Is redistribution permitted?

## Blocking Decision

A candidate BWA report is presentation evidence only unless it contains the complete authoritative row assignment.

A Kontenrahmen is account vocabulary only and does not by itself prove BWA row assignment.

F13-R11-C2 remains blocked until a complete standard BWA-Form 1 SKR04 2024 row-assignment source is acquired and reviewed.

## Repository Safety

- No external source file was copied.
- No external source file was staged.
- No source mapping was inferred.
- No runtime code was changed.
- No DATEV compatibility claim was created.

## Approved Next Action

Review each candidate manually and record classification, completeness, revision, standard-versus-custom status, and authority decision.

Only after that review may a source-evidence register or reviewed mapping table be created.
