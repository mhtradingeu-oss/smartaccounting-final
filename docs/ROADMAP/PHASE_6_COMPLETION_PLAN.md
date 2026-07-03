
SmartAccounting Phase 6 Completion Plan

Phase 6 focuses on completing the app safely after the Tax Bridge / DATEV / ELSTER safety lock.

Phase 6A — Full App Route & Feature Inventory Scan

Goal:
Create the real inventory of backend routes, frontend routes, services, pages, stubs, disabled features, duplicate paths, and dangerous actions.

Output:
Feature classification table:

ready
working but needs hardening
stub
disabled
duplicate
unused
dangerous

No patch unless a critical exposed danger is found.

Phase 6B — Full User Journey Runtime Test

Goal:
Prove that a real user can use the product end-to-end.

Journey:

login
company context
create/read invoice
create/read expense
reports
DATEV export preparation
Tax Bridge readiness/package
audit/log evidence
logout/stop clean
Phase 6C — Security / Company Isolation / Role Permission Audit

Goal:
Verify tenant/company isolation, auth middleware, role middleware, X-Company-Id behavior, admin/accountant/user permissions, audit logs, token safety, and rate limits.

Phase 6D — Invoice + Expense + Ledger Integrity Lock

Goal:
Harden invoice, expense, payment, VAT math, journal posting, ledger balancing, financial reports, and audit trail.

Phase 6E — Bank Statement / Reconciliation Lock

Goal:
Audit and harden bank statement import, duplicate prevention, transaction matching, categorization, reconciliation, and ledger posting boundaries.

Phase 6F — AI Assistant Safety Boundary Lock

Goal:
Ensure AI is advisory unless explicitly designed otherwise. AI must not file taxes, submit payments, delete data, post accounting entries, or make legal/tax conclusions without clear guardrails.

Phase 6G — Final UI/UX Stub Cleanup

Goal:
Remove misleading unfinished UI, hide disabled features behind clear feature gates, clean labels, fix broken links, and improve user-facing clarity.

Phase 6H — Production Docker / CI / Deployment Readiness

Goal:
Validate production Docker builds, CI, migrations, environment source of truth, backups, logs, monitoring, secrets hygiene, and release scripts.

Phase 6I — Final Release Candidate Report

Goal:
Produce the final release candidate report:

what is ready
what is disabled
what is preparation-only
known limitations
deployment checklist
post-release roadmap
