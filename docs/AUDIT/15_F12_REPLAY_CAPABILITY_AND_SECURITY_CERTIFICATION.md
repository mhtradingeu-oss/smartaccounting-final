# F12 — Replay Capability and Security Certification

## Certification Metadata

Phase:
F12 Enterprise Replay Capability

Status:
CERTIFIED WITH EXPLICIT CAPABILITY BOUNDARY

Certification Date:
2026-07-14

Related Implementation Commit:
c0c1f62

Preceding Certifications:

- 13_F11_EXECUTION_EVENT_EVIDENCE_PIPELINE_CERTIFICATION.md
- 14_F11_3_ACCOUNTING_EVIDENCE_BOUNDARY_CERTIFICATION.md

## Purpose

This document certifies the current enterprise replay capability, its security
controls, its read-only operating boundary, and the capabilities that are not
implemented or certified.

## Certified Capability

SmartAccounting currently provides an enterprise historical evidence replay
and explanation capability.

The certified replay flow is:

Unified Timeline
→ normalized historical events
→ read-only observation
→ activity categorization
→ duplicate and data-quality analysis
→ replay health summary
→ human-readable explanation

The replay capability may:

- read company-scoped historical evidence
- inspect EventStore records
- inspect AuditLog records
- observe ledger-related rows
- observe approval state
- categorize historical activity
- detect potential duplicate event keys
- detect missing companyId or timestamp evidence
- summarize event sources and event types
- produce replay health and warning summaries
- generate a read-only explanation
- support human audit and operational review

## Read-Only Contract

The replay runtime is certified as read-only.

The response contract includes:

- mode: simulation
- readOnly: true
- writesPerformed: false
- safeToWrite: false
- canWrite: false

Replay steps observe existing evidence.

Replay does not:

- create records
- update records
- delete records
- post JournalEntries
- reverse JournalEntries
- execute approvals
- emit new accounting events
- perform payments
- submit ELSTER
- upload DATEV
- mutate financial state

## Security Certification

The replay and replay-explanation endpoints are protected by:

- global authentication
- global permission enforcement
- backend-derived company context
- client company-scope override rejection
- role enforcement
- safe internal-error redaction

Allowed roles:

- admin
- auditor

Denied roles:

- accountant
- viewer

The client may not select company scope through query parameters.

Company scope must be derived from authenticated backend context.

## Certified API Surfaces

The certified read-only surfaces are:

- GET /api/enterprise/replay
- GET /api/enterprise/replay/:entityId
- GET /api/enterprise/replay/explain
- GET /api/enterprise/replay/explain/:entityId

## Validation Evidence

Targeted replay security validation:

- Replay and explanation security: 20/20 passed

Regression validation:

- Replay Security: 20/20 passed
- Unified Timeline Security: 11/11 passed
- Observability Security: 7/7 passed
- Enterprise Graph Security: 7/7 passed
- AI Reasoning Security: 7/7 passed
- Execution EventStore Proof: 1/1 passed

Total regression evidence:

53/53 tests passed

Static validation:

- JavaScript syntax checks passed
- git diff --check passed
- no client-controlled replay company scope
- no sensitive replay service-error leakage
- no broad enterprise permission
- no debug or temporary runtime markers

## Capability Boundary

The current replay capability is historical evidence simulation and
explanation.

It is not certified as deterministic accounting state reconstruction.

Shared historical visibility does not make replay output an authoritative
replacement for the Accounting Core database state.

Replay output must not be used to claim that accounting state was rebuilt
deterministically from events.

## Capabilities Not Implemented or Certified

The following capabilities are not currently implemented or certified:

- aggregate rehydration
- reducer-based state reconstruction
- deterministic state rebuild
- expected-state versus replayed-state comparison
- replay state hashing
- snapshot materialization
- snapshot replay
- checkpoint or cursor resume
- projection offsets
- stream sequence enforcement
- optimistic concurrency control
- event upcasting
- event downcasting
- event schema evolution runtime
- legacy event migration during replay
- replay-triggered accounting writes
- replay-triggered operational recovery

## Event Versioning Decision

Event version metadata may exist in stored event records.

The presence of a version field does not certify:

- version compatibility
- schema migration
- upcasting
- downcasting
- reducer compatibility
- deterministic replay across versions

A future event-versioning phase must define these contracts before they are
used operationally.

## Snapshot Decision

No replay snapshot or checkpoint infrastructure is certified.

Other uses of the word snapshot in the repository, including document-intake
snapshots, accounting summaries, or runtime metrics snapshots, are not replay
snapshots.

## Compliance Decision

Replay may support:

- audit investigation
- operational explanation
- evidence review
- anomaly review
- historical activity analysis

Replay must not be represented as compliance-final reconstruction solely
because its health status is ready.

Final accounting, tax, DATEV, ELSTER, or legal conclusions remain subject to
the authoritative Accounting Core and qualified human review.

## Governance Rules

The following rules are mandatory:

- replay remains read-only
- replay must remain company-scoped
- replay may not accept client-controlled company scope
- replay may not perform financial mutation
- replay may not bypass Accounting Core authority
- replay output must identify itself as simulation or explanation
- deterministic replay claims require separate implementation and certification
- snapshot or version-migration features require separate architecture approval
- no replay write path may be added without governance, recovery, and idempotency design

## Final Certification Decision

SmartAccounting provides a secure, company-scoped, read-only historical
evidence replay and explanation capability.

This capability is suitable for audit support, observability, explanation,
and historical evidence review.

It is not a full event-sourcing runtime and is not deterministic accounting
state reconstruction.

F12 Replay Capability and Security is CERTIFIED within this explicit boundary.

F12 is CLOSED for the current read-only replay scope.
