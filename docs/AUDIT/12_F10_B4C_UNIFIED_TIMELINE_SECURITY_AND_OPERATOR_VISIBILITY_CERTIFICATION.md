# F10-B4C — Unified Timeline Security and Operator Visibility Certification

## 1. Certification Identity

- Project: SmartAccounting
- Phase: F10-B4C
- Scope: Unified Timeline security, tenant authority, read-role access, safe error projection, and PostgreSQL fixture repeatability
- Design commit: `ef798b0`
- Implementation commit: `98c010f`
- Implementation title: `fix: secure enterprise timeline and stabilize postgres cleanup`
- Branch: `main`
- Remote: `origin/main`

## 2. Final Certification Verdict

F10-B4 Unified Timeline Security and Operator Visibility is certified as complete for its approved scope.

The certified implementation provides:

- Authenticated access through the global API authentication boundary.
- Backend-authoritative company scoping through `requireCompany`.
- Role-gated read access for `admin`, `accountant`, `auditor`, and `viewer`.
- Explicit rejection of client-supplied query company scope.
- Canonical API error handling without leaking internal service failures.
- Narrow route permission mappings without broad enterprise access.
- Stable success response compatibility.
- PostgreSQL-safe accounting fixture cleanup.
- Repeatable route regression across related reporting and approval suites.

No new timeline persistence table or event graph was created.

## 3. Certified Canonical Owner

The canonical read owner remains:

```text
src/services/enterprise/unified-read-model
```

The HTTP projection route is:

src/routes/enterprise/unifiedTimeline.routes.js

The route delegates timeline retrieval to:

getUnifiedTimeline(entityId, companyId)

The route is a read projection and is not a new accounting source of truth.

## 4. Canonical Route Contract

The certified routes are:

GET /api/enterprise/timeline
GET /api/enterprise/timeline/:entityId

The list route passes:

entityId = null
companyId = req.companyId

The entity route passes:

entityId = req.params.entityId
companyId = req.companyId

The successful response contract remains:

{
  "success": true,
  "...serviceResult": "preserved"
}
## 5. Authentication Boundary

Authentication remains owned by the global API middleware in src/app.js.

The effective order is:

API authentication
→ global permission guard
→ maintenance middleware
→ Unified Timeline route

Authentication was not duplicated inside the route.

Unauthenticated requests remain rejected before timeline service execution.

## 6. Backend Company Authority

The route uses:

requireCompany
req.companyId

as the only company authority supplied to the timeline service.

The route no longer accepts:

req.query.companyId

as tenant authority.

A token/header company mismatch remains rejected by the existing company-context middleware.

The certified mismatch contract is:

HTTP 403
errorCode = COMPANY_CONTEXT_INVALID
## 7. Client Company Override Rejection

A query parameter named companyId is rejected explicitly.

The certified contract is:

HTTP 400
errorCode = COMPANY_SCOPE_CLIENT_OVERRIDE_FORBIDDEN
message = Company scope must be derived from authenticated context

This prevents a client from attempting to override backend-derived company scope.

## 8. Certified Read Role Matrix

The Unified Timeline is a read-only projection.

The certified role matrix is:

Role	Timeline Read
admin	Allowed
accountant	Allowed
auditor	Allowed
viewer	Allowed

This follows the existing SmartAccounting policy that read-only accounting projections may be available to the four principal company roles while execution remains separately restricted.

No approval, posting, payment, tax submission, deletion, or irreversible operation was granted by this role matrix.

## 9. Narrow Permission Mapping

The global permission guard uses explicit route allowlists.

The following exact mappings were added for accountant, auditor, and viewer:

GET /api/enterprise/timeline
GET /api/enterprise/timeline/*

The admin role continues to use its existing wildcard authority.

No broad mapping such as the following was added:

GET /api/enterprise/*

This preserves separation from unrelated enterprise endpoints, including observability, graph, and future administrative surfaces.

## 10. Defense-in-Depth Role Guard

The route retains a local role guard for:

admin
accountant
auditor
viewer

The global permission allowlist and route-level role guard serve different purposes:

The global permission guard authorizes the concrete HTTP path.
The local role guard documents and enforces the route's intended role policy.

No new permission vocabulary or permission framework was introduced.

## 11. Canonical Error Contract

The canonical ApiError constructor is:

new ApiError(status, code, message, details)

The route passes failures to the canonical Express error handler.

A timeline service failure returns a safe response equivalent to:

{
  "error": true,
  "message": "Failed to load unified timeline",
  "errorCode": "INTERNAL_ERROR",
  "requestId": null
}

Internal database or service error messages are not exposed to the client.

## 12. Targeted Timeline Test Coverage

The targeted Unified Timeline route suite contains 11 tests.

It certifies:

Unauthenticated request rejection.
Required company context.
Token/header company mismatch rejection.
Query company override rejection.
Admin same-company read access.
Accountant same-company read access.
Auditor same-company read access.
Viewer same-company read access.
Correct entityId and backend company propagation.
Stable success response compatibility.
Safe canonical handling of service failures.

Certified result:

Test Suites: 1 passed, 1 total
Tests: 11 passed, 11 total
## 13. Related SQLite Regression

The selected related regression covered:

tests/routes/enterpriseUnifiedTimeline.test.js
tests/routes/reports.test.js
tests/routes/aiApprovalQueue.test.js

Certified SQLite result:

Test Suites: 3 passed, 3 total
Tests: 87 passed, 87 total

This proved that the timeline security patch did not break:

Financial reports.
AI approval queue reads and controlled decisions.
Controlled safe draft execution tests.
Role and company isolation behavior.
Existing report export restrictions.
## 14. PostgreSQL Runtime Safety

The PostgreSQL validation used the fixed isolated Compose project:

smartaccounting_test

The runtime identity preflight proved:

database = smartaccounting_test
user = postgres
dialect = postgres

Migrations completed successfully before the selected PostgreSQL regression.

The development database smartaccounting was not targeted.

## 15. PostgreSQL Cleanup Blocker Discovery

The first combined PostgreSQL regression exposed a pre-existing cleanup gap.

The blocking constraint was:

chart_accounts_companyId_fkey

The PostgreSQL error code was:

23503

The blocking relationship was:

chart_accounts.companyId
→ companies.id

The database retained:

chart_accounts = 5
companies = 4

because centralized test cleanup did not delete ChartAccount fixtures before deleting companies.

This was a test fixture cleanup defect, not a production timeline or permission defect.

## 16. Centralized Accounting Fixture Cleanup

The centralized cleanup contract in:

tests/utils/testHelpers.js

was extended to delete accounting dependents in foreign-key-safe order:

JournalEntryLine
→ JournalEntry
→ ChartAccount
→ User
→ Company

Existing cleanup of AIApprovalQueueItem remains intact.

The implementation did not:

Disable foreign keys.
Drop constraints.
Use TRUNCATE CASCADE.
Add an ON DELETE CASCADE migration.
Modify production accounting behavior.
## 17. Direct PostgreSQL Cleanup Proof

After rebuilding the non-bind-mounted test backend image, direct centralized cleanup succeeded:

DIRECT_CLEANUP = PASS
CLEANUP_EXIT = 0

The certified post-cleanup table counts were:

ai_approval_queue_items = 0
chart_accounts = 0
companies = 0
journal_entries = 0
journal_entry_lines = 0

This proves that the cleanup implementation operates against PostgreSQL and is not only present in host source code.

## 18. Selected PostgreSQL Regression

The PostgreSQL regression covered:

tests/routes/enterpriseUnifiedTimeline.test.js
tests/routes/reports.test.js
tests/routes/aiApprovalQueue.test.js

Certified result:

Test Suites: 3 passed, 3 total
Tests: 87 passed, 87 total
TEST_EXIT = 0

The post-test table counts remained:

ai_approval_queue_items = 0
chart_accounts = 0
companies = 0
journal_entries = 0
journal_entry_lines = 0

This proves fixture repeatability and absence of relevant PostgreSQL residue after the selected suites.

## 19. Docker Image Freshness Finding

The PostgreSQL test backend does not bind-mount repository source.

Therefore, host-side changes to test helpers or runtime code require rebuilding the backend image before validation:

docker compose \
  -p smartaccounting_test \
  -f docker-compose.test.yml \
  up -d --build backend

A stale test image must not be interpreted as evidence that the current host patch failed.

## 20. Implementation Scope

Commit 98c010f changed exactly four files:

src/routes/enterprise/unifiedTimeline.routes.js
src/security/permissions.js
tests/routes/enterpriseUnifiedTimeline.test.js
tests/utils/testHelpers.js

Commit summary:

4 files changed
300 insertions
28 deletions

No unrelated file was included.

## 21. Protected Invariants

This certification locks the following invariants:

Backend company context is authoritative.
Client query company scope cannot override authenticated company context.
Cross-company requests remain rejected.
Timeline reads remain read-only.
Timeline access is limited to the four certified company roles.
No broad /api/enterprise/* permission rule may replace the narrow mappings.
Service failures must pass through the canonical safe error contract.
Timeline success response compatibility must be preserved.
No new timeline table may be introduced without a new insufficiency proof.
No new event graph may be introduced without a new insufficiency proof.
PostgreSQL fixture cleanup must respect foreign-key dependency order.
Repeated test execution must not depend on dropping database constraints.
Test backend images must be rebuilt when source changes are not bind-mounted.
Production accounting behavior must remain unaffected by test cleanup changes.
## 22. Explicit Non-Scope

F10-B4C did not add or certify new behavior for:

Timeline frontend presentation.
New operator dashboard components.
New timeline persistence.
New event graph persistence.
Event emission bridges.
Observability administration.
Graph administration.
Approval execution behavior.
Ledger posting.
Invoice or expense final posting.
Payments or bank transfers.
Direct DATEV upload.
ELSTER submission.
Tax filing.
Record deletion.
Production database migrations.
Monthly close or period locking.
Kanzlei workspace behavior.

Operator visibility in this phase means secure backend availability of the existing unified timeline projection. It does not certify a final frontend operator experience.

## 23. Repository and Synchronization Proof

The implementation commit is present locally and remotely:

98c010f

The verified repository state after push was:

## main...origin/main
0 0
## 24. Next Phase Gate

No new implementation phase may begin until this certification document is:

Reviewed.
Structurally validated.
Committed alone.
Pushed.
Verified with clean status and 0 0 divergence.

The next F10-B phase must begin with a new truth scan.

No new timeline table, event graph, or duplicated execution evidence store may be created without proving that existing approval, audit, execution, recovery, request, draft, document, and fingerprint evidence is insufficient.

## 25. Final Certification
F10-B4A Enterprise Timeline Security Design: PASS
F10-B4B Route Security and Permission Resolution: PASS
F10-B4B8 PostgreSQL Fixture Repeatability: PASS
F10-B4B9 Implementation Commit and Push: PASS
F10-B4C Certification: PASS

Production accounting behavior changed: NO
New timeline persistence created: NO
New event graph created: NO
Repository synchronized: YES

