# SmartAccounting Final Release Handover

## Status

Release Candidate certified through CERT-11.

Repository:
- Branch: main
- Remote: origin/main
- Status at handover: clean

## Certification Gates

- CERT-0: Local runtime / ports / scripts — CLOSED
- CERT-1: Backend runtime port alignment — CLOSED
- CERT-2: Postgres migration verification gate — CLOSED
- CERT-3: Security / RBAC / company scope / invoice concurrency — CLOSED
- CERT-4: German accounting / VAT / GoBD / DATEV — CLOSED
- CERT-5: Bank statements / reconciliation — CLOSED
- CERT-6: AI / OCR / document intake / read-only assistant governance — CLOSED
- CERT-7: Production security / auth / GDPR / export / audit readiness — CLOSED
- CERT-8: Frontend build / UX / API integration tests — CLOSED
- CERT-9: Full system release candidate gate — CLOSED
- CERT-10: Postgres / Docker / CI reality gate — CLOSED
- CERT-11: Release documentation / deployment readiness / handover — CLOSED

## Runtime

Canonical local runtime:

- Frontend: http://localhost:5173
- Backend: http://localhost:5001
- Swagger/API docs: http://localhost:5001/api/docs
- Docker Postgres: localhost:5441
- Docker Redis: localhost:6381

Use:

```bash
npm run start:all
npm run stop:all
Core Test Commands

SQLite targeted backend tests:

npm run test:sqlite -- --runInBand

Postgres compliance gate:

npm run test:postgres

Postgres migration readiness:

npm run db:verify

Frontend build:

npm run build --prefix client

Frontend tests:

npm run test --prefix client
Certified Accounting Scope

The release candidate includes verified coverage for:

Invoices
Expenses
Journal entries
Accounting posting previews
Final posting
Reversals
Posted journal immutability
VAT math integrity
EUR currency integrity
UStVA aggregation
GoBD audit log hash chain
DATEV invoice export
DATEV expense export
DATEV audit log creation
Dashboard company-scoped financial stats
Certified Bank / Reconciliation Scope

Verified:

Bank statement dry-run import
PDF/OCR dry-run
Import confirmation token flow
Duplicate confirmation rejection
Manual reconciliation
Undo reconciliation with reason
Audit log creation
Company scoping
Viewer restrictions
Certified AI / OCR / Governance Scope

Verified:

AI assistant read-only governance
German accounting knowledge contract
Assistant capability contract
AI provider wiring and safe fallback
Provider metadata does not leak keys/prompts/stack traces
AI insights company scoping
AI disabled blocking
AI decisions remain read-only
AI exports scoped by company
AI assistant stream requestId/done event
Voice assistant guarded by purpose/policy/role/feature flag
OCR preview
OCR results company scoping
OCR idempotency
OCR validation
Document intake assistant
Draft creation only from reviewed values
Mutation intent blocked
Certified Security / GDPR Scope

Verified:

Login / refresh / logout
Refresh token replay rejection
Revoked JWT rejection
RBAC role behavior
Request ID middleware
Company context guard
SQL injection protections
Brute-force protection
Input sanitization
GDPR data export
GDPR anonymization
GDPR audit log creation
Export plan guard
Export PDF guard
AuditLogService hash chain
Docker / Postgres / CI Reality

Verified with Docker:

Docker available
Docker Compose available
Backend image builds
Postgres test container becomes healthy
Migrations run against Postgres
Migration readiness check passes
Postgres compliance constraints pass
Test DB container and volume are removed after test

Known non-blocking warning:

Docker may report an orphan smartaccounting-redis-dev container from the local dev stack.
Docker may keep the default network if another dev container is still using it.
Release Documentation Present

Existing release/readiness docs include:

docs/FINAL_RELEASE_RUNBOOK.md
docs/PRODUCTION_DEPLOYMENT_RUNBOOK.md
docs/RELEASE_CHECKLIST.md
docs/audits/FINAL_CERTIFICATION.md
docs/audits/FINAL_READINESS_REPORT.md
docs/release/PRODUCTION_READINESS.md
docs/release/RUNBOOK.md
docs/release/DEPLOYMENT_CHECKLIST.md
docs/release/SECURITY_HEADERS.md
docs/release/DATABASE_SAFETY.md
docs/release/OBSERVABILITY.md
docs/release/ERROR_REPORTING.md
Important Release Boundary

This release candidate is internally verified as a production-readiness candidate for the validated scope; it is not a legal, DATEV, or ELSTER certification and does not guarantee that all future product features are complete.

Future roadmap items remain outside this release certification unless separately tested and closed.

Potential future work:

Full ELSTER integration
E-Bilanz
DATEV XML deep export expansion
SaaS billing/licensing hardening
White-label tenant packaging
Advanced AI provider production rollout
Broader production observability and alerting
External storage/CDN production setup
End-to-end browser automation
Final Decision

SmartAccounting is ready as an internally verified Release Candidate after CERT-0 through CERT-11 for the validated scope.

No uncommitted runtime or source changes should be present at release handover.
