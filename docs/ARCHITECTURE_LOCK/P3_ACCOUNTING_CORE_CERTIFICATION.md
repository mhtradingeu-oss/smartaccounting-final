# P3 Accounting Core Certification — SmartAccounting

Date: 2026-07-09  
Status: PASS WITH REGISTERED WARNINGS  
Scope: Accounting core, ledger, journal entries, posting preview, final posting, reversal, immutability, company isolation, VAT reporting signals.

## 1. Purpose

This document locks the P3 accounting core truth after static scan, runtime smoke, targeted patch, and post-commit verification.

P3 validates that SmartAccounting has a working accounting foundation before any deeper AI execution, tax bridge automation, DATEV/ELSTER expansion, or advanced compliance workflow.

---

## 2. Validation checkpoints completed

P3 included:

- P3 Accounting Core Certification Scan
- P3-A Accounting Runtime Certification Smoke
- P3-A-CLEAN runtime test preview cleanup
- P3-B Expense Posting Duplicate Guard Scan
- P3-C Journal Immutability + Reversal Runtime Proof
- P3-C Reversal Lock Bug Patch
- P3-C Post-Commit Verification

---

## 3. Final code patch

Commit:

- `69017f7 fix: stabilize journal reversal row locking`

File changed:

- `src/services/accountingPostingService.js`

Reason:

- Runtime reversal failed with PostgreSQL error:
  - `FOR UPDATE cannot be applied to the nullable side of an outer join`

Fix:

- Locked `JournalEntry` without joined `lines`.
- Loaded `JournalEntryLine` rows separately inside the same transaction with row lock.
- No broad refactor.
- No route contract change.
- No schema change.

---

## 4. Accounting service verification

Targeted test file:

- `tests/services/accountingPostingService.test.js`

Result:

- 28 tests passed
- 1 suite passed

Covered behavior:

- monetary normalization
- balanced journal validation
- unbalanced journal rejection
- invalid debit/credit rejection
- VAT expense posting lines
- restricted expense posting lines without input VAT
- draft journal entry creation
- expense posting preview creation
- preview reuse instead of duplication
- audit log on preview creation/reuse
- finalizing posting preview into posted entry
- rejection when final posting has no preview
- duplicate final posting prevention
- reversal with compensating lines
- draft reversal rejection
- duplicate reversal prevention
- company boundary rejection
- posted journal entry immutability
- posted journal entry line immutability
- posted journal line deletion prevention
- expense preview company boundary rejection
- account outside active company rejection

---

## 5. Runtime proof

P3-C after patch proved:

- viewer cannot reverse journal entries
- wrong company context cannot reverse journal entries
- accountant can reverse a posted entry
- reversal creates a posted compensating journal entry
- original journal entry receives `reversedAt`
- double reversal is blocked
- reversal debit total equals reversal credit total

Observed runtime signals:

- viewer reverse: `403 PERMISSION_DENIED`
- wrong company reverse: `403 COMPANY_CONTEXT_INVALID`
- accountant reverse: `201 Journal entry reversed`
- double reverse: `409 JOURNAL_ENTRY_ALREADY_REVERSED`
- `ORIGINAL_REVERSED_AT_PRESENT true`
- `REVERSAL_FOUND true`
- `REVERSAL_BALANCED true`

---

## 6. Ledger / journal truth

Certified accounting core components:

- `ChartAccount`
- `JournalEntry`
- `JournalEntryLine`
- `accountingPostingService`
- `chartOfAccountsService`
- journal entry route access
- ledger reporting endpoints

Important behavior:

- posted entries are immutable
- corrections happen through reversal entries
- journal lines are balanced
- cross-company accounts are rejected
- companyId is required in accounting service operations

---

## 7. Reports runtime truth

P3-A verified successful runtime responses for:

- `/api/journal-entries`
- `/api/journal-entries?status=posted`
- `/api/reports/trial-balance`
- `/api/reports/profit-loss`
- `/api/reports/balance-sheet`
- `/api/reports/vat-summary`

Decision:

- Accounting reports are backed by real journal/ledger data.
- Reporting endpoints are operational in the current runtime.

---

## 8. Company isolation truth

P3-A and P3-C verified:

- wrong company journal read is blocked
- wrong company expense posting preview is blocked
- wrong company reversal is blocked

Observed:

- `403 COMPANY_CONTEXT_INVALID`

Decision:

- Accounting runtime respects company boundary for tested critical paths.

---

## 9. Role boundary truth

P3-A and P3-C verified:

- viewer cannot create journal entry
- viewer cannot create posting preview
- viewer cannot finalize expense posting
- viewer cannot reverse journal entry

Observed:

- `403 PERMISSION_DENIED`

Decision:

- Viewer write restrictions are active on tested accounting mutation paths.

---

## 10. VAT / tax reporting truth

P3-A verified:

- VAT summary endpoint is operational
- input/output VAT rows are derived from posted journal entries
- VAT accounts are present in chart/reporting data

Decision:

- VAT reporting is functional as ledger-based reporting.
- Full German tax legal certification remains outside P3.

---

## 11. Registered warnings

### P3-WARN-1 — Tax Bridge readiness route permission

`/api/tax-bridge/readiness` returned `403 PERMISSION_DENIED` for accountant.

Decision:

- Not a security issue.
- Needs UX/role contract review in a later Tax Bridge phase.

### P3-WARN-2 — Multiple accounting/tax engines exist

Static scan showed several accounting/tax-related services, including legacy or advisory/demo engines.

Decision:

- `accountingPostingService` is the certified accounting posting source for P3.
- Legacy/demo/advisory services must not be used for autonomous accounting execution without later certification.

### P3-WARN-3 — Runtime reversal proof changed local demo DB

P3-C created a real reversal entry in the local dev database as proof.

Decision:

- No source artifact was created.
- Local demo reporting may reflect this reversal.
- Do not repeat P3-C against random production-like data.

---

## 12. Final P3 decision

P3 is closed as:

- PASS WITH REGISTERED WARNINGS
- Accounting core runtime is operational
- Journal reversal bug fixed and verified
- Immutability and reversal behavior certified by tests and runtime proof
- No further P3 source patch required now

---

## 13. Next allowed phase

Next phase:

- P4 — Invoice / Expense / VAT End-to-End Certification

P4 must validate:

- invoice lifecycle
- invoice posting integration
- expense lifecycle
- expense posting integration
- VAT treatment consistency
- attachments/document evidence
- DATEV readiness signals
- audit log coverage
- company isolation end-to-end

No AI execution may bypass P4.

---

## 14. Engineering rule

Continue using the locked workflow:

1. Scan truth first.
2. Read relevant files.
3. Patch narrowly.
4. Validate runtime and tests.
5. Stage explicitly.
6. Commit separately.
7. Push only after verification.
8. Keep repo clean.

Never use:

- `git add .`
