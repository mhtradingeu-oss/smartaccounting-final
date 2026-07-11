F9 — Controlled Safe Draft Execution Certification

Version: 1.0

Status: CERTIFIED

Project: SmartAccounting

Phase: F9

Certification Date: 2026-07-11

Executive Summary

This certification confirms that the AI Approval Queue execution pipeline has been extended to support controlled execution of approved AI-generated accounting drafts while preserving all SmartAccounting production guarantees.

The implementation has been verified through static validation, SQLite regression testing, PostgreSQL runtime certification, live execution testing, concurrent execution verification, repository integrity verification, and development runtime health verification.

No production data migrations were introduced beyond existing schema support.

No legacy execution engines were reintroduced.

No unsafe execution paths were exposed.

Certified Scope

The following capabilities are certified.

Approved Draft Execution

Approved AI approval queue items may execute only after explicit authorization.

Supported roles:

Admin
Accountant

Viewer and Auditor remain read-only.

Execution Endpoint
POST /api/ai/approval-queue/execute

Certified.

Allowed AI Tools

Only the reviewed document draft tools are executable.

create_expense_draft_from_reviewed_document

create_invoice_draft_from_reviewed_document

No additional tools may execute.

Unknown tools are rejected before execution.

Request Protection

The client cannot supply execution authority.

The following request fields are rejected if present:

companyId
toolId
documentId
decisionFingerprint
draftKind
payload
executionMode

Execution authority is reconstructed exclusively from the approved queue item.

Security Guarantees
Company Isolation

Every execution is scoped to:

companyId

Cross-company execution is impossible.

Role Protection

Allowed:

Admin
Accountant

Denied:

Viewer
Auditor
Tool Whitelisting

Execution uses an explicit whitelist.

Unknown tools cannot execute.

Approval Ownership

Only approved queue items belonging to the authenticated company may execute.

Atomic Execution Protection

Execution begins through an atomic execution claim.

Only one execution claim may succeed.

Concurrent requests cannot create duplicate drafts.

Duplicate Protection

Verified.

Two simultaneous HTTP requests produce:

1 draft

1 executed approval

1 rejected duplicate execution
Draft Recovery Evidence

Every successful draft persists immutable recovery evidence.

Stored information includes:

Draft ID
Draft Type
Decision Fingerprint
Tool ID
Request ID
Recorded Timestamp

Recovery evidence is idempotent.

It cannot be replaced after successful persistence.

Execution Completion

Execution completion records:

Executed draft
Execution metadata
Request identifier
Execution timestamp

Approval transitions:

approved

↓

executed
Failure Behaviour

Failures before draft creation:

Execution claim is released.

Approval returns to:

approved

Failures after draft creation:

Execution remains claimed.

Recovery evidence remains immutable.

No duplicate draft may be produced.

Runtime Validation

Live runtime certification confirmed:

Login
Authorization
Queue lookup
Draft creation
Execution persistence
Recovery persistence
Duplicate retry rejection
PostgreSQL Certification

Verified using isolated Docker PostgreSQL environment.

Validated:

migrations
execution
concurrency
cleanup

Result:

PASS
SQLite Certification

Regression suite completed successfully.

51 tests passed
PostgreSQL Regression

Regression suite completed successfully.

51 tests passed
Repository Integrity

Verified:

No syntax errors

No lint errors

No diff whitespace issues

Origin synchronized

Scope limited to approved files
Runtime Health

Development runtime verified.

Backend

PostgreSQL

Redis

Health endpoint

Status:

Healthy
Explicit Non-Scope

This phase intentionally does NOT introduce:

Ledger posting
Payment execution
Bank execution
ELSTER submission
DATEV export
Journal posting
Financial transaction execution
Queue workers
Background schedulers

The execution pipeline is limited exclusively to reviewed draft generation.

Protected Invariants

The following architectural guarantees remain mandatory.

Backend Authority

The backend is the only execution authority.

Immutable Decision Origin

Decision fingerprint cannot be replaced.

Company Isolation

Every execution remains tenant-scoped.

Approval First

Execution cannot occur before approval.

Single Draft Guarantee

One approval may create only one draft.

Recovery Persistence

Recovery evidence is immutable.

Safe Retry

Duplicate execution attempts cannot generate additional drafts.

No Client Authority

Clients cannot submit execution metadata.

Explicit Tool Whitelist

Only certified reviewed-document tools may execute.

Files Certified
src/routes/aiApprovalQueue.js

src/security/permissions.js

tests/routes/aiApprovalQueue.test.js

Supporting evidence includes the associated audit scripts and final truth documentation generated during certification.

Certification Result
F9 Controlled Safe Draft Execution

STATUS

CERTIFIED
