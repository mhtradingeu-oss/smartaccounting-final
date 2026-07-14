# F11-3 — Accounting Evidence Boundary Certification

## Certification Metadata

Phase:
F11-3 Accounting Evidence Completion

Status:
CERTIFIED BY ARCHITECTURE TRUTH SCAN

Certification Date:
2026-07-14

Preceding Certification:
13_F11_EXECUTION_EVENT_EVIDENCE_PIPELINE_CERTIFICATION.md

## Purpose

This document certifies the authority and evidence boundary between:

- AI-assisted reviewed-document execution
- human-controlled accounting posting
- final JournalEntry authority
- audit and event projections

## Certified Architecture Decision

The SmartAccounting AI execution domain and the Accounting Core posting
domain are intentionally separate.

AI execution may:

- analyze accounting evidence
- explain findings
- propose an action
- prepare an approved draft
- create an Expense or Invoice draft after explicit approval
- persist execution evidence
- emit execution.started and execution.completed events

AI execution does not:

- create a final posted JournalEntry
- post directly to the accounting ledger
- reverse a posted JournalEntry
- submit ELSTER
- upload DATEV directly
- perform payments or transfers
- become the final accounting authority

## AI Evidence Domain

The certified AI evidence chain is:

Document
→ AI Review
→ Approval Queue
→ Safe Draft Execution
→ Expense or Invoice Draft
→ Event Gateway
→ EventStore
→ Unified Timeline
→ Enterprise Graph

The AI evidence domain preserves, where applicable:

- companyId
- userId
- approvalId
- documentId
- decisionFingerprint
- draftId
- correlationId
- execution event type
- event timestamp

## Accounting Authority Domain

The certified Accounting Core chain is:

Expense or Invoice
→ Posting Preview
→ Human Review
→ Final Posting
→ JournalEntry
→ JournalEntryLine
→ AuditLog
→ Unified Timeline

The Accounting Core preserves, where applicable:

- companyId
- sourceType
- sourceId
- createdBy
- postedBy
- postedAt
- posting metadata
- reversalOfId
- originalSourceType
- originalSourceId

## Authority Boundary

A draft created through AI-assisted execution is not a posted accounting
record.

AI approval authorizes only the controlled draft-creation action described
by the approved tool contract.

Final posting requires the independent Accounting Core workflow and human
accounting authority.

The final JournalEntry must not be represented as an automatic or direct
financial mutation performed by AI.

## Evidence Projection Decision

Unified Timeline may project both evidence domains into one company-scoped
read model.

Enterprise Graph may display events and records from both domains.

Shared visibility does not mean that AI approval directly authorized final
accounting posting.

Projection must not collapse the authority boundary between:

- AI-assisted draft preparation
- human-controlled final posting

## Reversal Evidence

Posted JournalEntries are not edited in place.

Correction is performed through compensating reversal entries.

The certified reversal evidence includes:

- reversalOfId
- reversal JournalEntry
- originalSourceType
- originalSourceId
- reversedAt
- reversedBy
- journal_entry_reversed audit evidence

## Deferred Correlation Contract

A single correlation chain covering:

Document
→ AI Approval
→ Draft
→ Human Posting
→ JournalEntry
→ Reversal
→ Export

is intentionally deferred.

This is not classified as a defect.

A future controlled accounting-posting integration phase must first define:

- the authoritative origin record
- the effect of human edits after AI draft creation
- whether AI approval remains relevant after human modification
- correlation propagation rules
- posting-preview and final-posting boundaries
- audit wording that does not overstate AI authority
- recovery and idempotency behavior

No correlation patch may be introduced before that contract is approved.

## Security and Governance Decision

The following controls remain mandatory:

- backend-derived company scope
- human approval for draft execution
- role-controlled accounting posting
- immutable audit evidence
- no direct AI final posting
- no irreversible AI financial mutation
- company isolation across all evidence sources

## Final Certification Decision

The AI evidence chain is complete for controlled draft creation.

The Accounting Core evidence chain is complete for preview, final posting,
and reversal.

The separation between these two domains is intentional and certified.

F11-3 requires no production runtime patch.

F11-3 Accounting Evidence Boundary is CLOSED.
