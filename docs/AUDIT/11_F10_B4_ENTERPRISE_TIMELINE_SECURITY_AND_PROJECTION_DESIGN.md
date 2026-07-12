# F10-B4 — Enterprise Timeline Security and Projection Patch Design

## 1. Phase Identity

- Phase: F10-B4
- Type: Decision and design freeze
- Runtime modification: None
- Migration: None
- New table: None
- New event graph: None
- Frontend modification: None

## 2. Established Truth

The canonical timeline read-model candidate is:

```text
src/services/enterprise/unified-read-model
```

Its current evidence sources are:

- EventStore
- AuditLog
- Journal and ledger-related models
- AIApprovalQueueItem

The supporting replay capability is:

```text
src/services/enterprise/event-replay
```

The following runtime-mounted route families were confirmed:

```text
/api/enterprise/timeline
/api/enterprise/observability
/api/enterprise/graph
/api/enterprise/audit-timeline
```

## 3. Confirmed Security Gaps

The enterprise timeline, graph, observability, and legacy audit-timeline route
modules do not currently prove all of the following controls:

- Authentication
- Backend-derived company authority
- Role or permission enforcement
- Rejection of client-supplied company scope

Several routes read:

```text
req.query.companyId
```

This is not an acceptable source of tenant authority.

## 4. Confirmed Persistence Risk

The legacy graph path uses:

```text
TimelineGraphEngine
TimelinePersistence
timeline-store.json
```

`TimelinePersistence.getEvents()` calls an initialization function that can
create the JSON store using `writeFileSync()`.

Therefore, the current graph GET path is not semantically read-only.

## 5. Canonical Ownership Decision

The canonical read owner is frozen as:

```text
enterprise/unified-read-model
```

The canonical persisted evidence remains:

```text
AuditLog
AIApprovalQueueItem
Journal and ledger records
EventStore when present and registered
```

No new timeline table or event graph is approved.

## 6. Capability Classification

| Capability | Classification | Decision |
| --- | --- | --- |
| Enterprise unified read model | Canonical read owner | Preserve and secure |
| AuditLog | Canonical immutable evidence | Preserve |
| AIApprovalQueueItem | Canonical approval/execution state | Preserve |
| Enterprise event replay | Supporting read-only analysis | Preserve |
| Finance event consumer | Legacy and volatile | Do not extend |
| Legacy audit-timeline routes | Non-canonical | Contain and protect |
| TimelinePersistence | Unsafe file-based persistence | Do not use as authority |
| TimelineGraphEngine | Non-canonical derived graph | Contain or disable |
| Enterprise observability | Operational supporting surface | Secure separately |

## 7. Backend Authority Contract

All tenant-scoped enterprise routes must use:

```text
authenticate
requireCompany
req.companyId
```

Client-supplied company scope in query, body, or route parameters must not
override backend context.

The preferred contract is to reject a client-supplied `companyId` with:

```text
HTTP 400
COMPANY_SCOPE_CLIENT_OVERRIDE_FORBIDDEN
```

## 8. Proposed Read Role Policy

The proposed unified timeline read policy is:

```text
admin
accountant
auditor
viewer
```

This policy remains subject to verification against existing permission
vocabulary before implementation.

Observability and graph routes must receive a separate privileged policy and
must not automatically inherit the unified timeline role policy.

## 9. Audit Projection Decision

`AuditLogService.exportLogs()` must be evaluated for a narrow read projection
correction:

- Filter directly through `AuditLog.companyId`.
- Include persisted `companyId`.
- Include persisted `requestId`.
- Include persisted `metadata`.
- Preserve hash and immutable evidence fields.
- Do not change append behavior.
- Do not change chain validation.
- Do not migrate data.

## 10. Route Error Contract

Enterprise routes should delegate internal errors to the canonical application
error handler.

Raw internal error messages must not be returned directly to the client when
they may expose implementation or database details.

## 11. Patch Decomposition

### F10-B4B — Unified Timeline Route Security

- Add authentication.
- Add company authority.
- Add verified read-role policy.
- Reject client company override.
- Use `req.companyId`.
- Preserve response compatibility.
- Add targeted tests.

### F10-B4C — Audit Projection Correction

- Filter directly by `AuditLog.companyId`.
- Return `companyId`, `requestId`, and `metadata`.
- Preserve immutable hash-chain behavior.
- Add targeted tests.

### F10-B4D — Legacy Timeline and Graph Containment

- Do not extend in-memory timeline.
- Prevent graph GET requests from creating files.
- Prefer containment or canonical disabled response.
- Do not rewrite graph capability.
- Add no-file-mutation tests.

### F10-B4E — Observability Security

- Add authentication.
- Add backend company scope where tenant-scoped.
- Add verified privileged role policy.
- Remove query company authority.
- Preserve read-only behavior.

## 12. Explicit Non-Scope

F10-B4 does not approve:

- A new timeline table
- A new event graph
- Event sourcing redesign
- New execution event emission
- Safe Draft Execution changes
- Approval state-machine changes
- AuditLog write-contract changes
- Hash-chain changes
- Frontend timeline implementation
- Legacy route deletion without compatibility proof
- File persistence migration
- Production accounting behavior changes

## 13. Acceptance Criteria

The eventual implementation must prove:

- Unauthenticated access is denied.
- Company scope comes only from backend authority.
- Client company override is rejected.
- Cross-company records are never returned.
- Role policy is enforced.
- Timeline GET requests perform no writes.
- Graph requests cannot create `timeline-store.json`.
- Audit projection includes required persisted correlation fields.
- Existing approval and safe execution behavior remains unchanged.
- No new persistence is added.
- Repository remains clean and synchronized after certification.

## 14. Final Design Verdict

```text
CANONICAL_READ_OWNER=enterprise/unified-read-model
NEW_TIMELINE_TABLE=REJECTED
NEW_EVENT_GRAPH=REJECTED
BACKEND_COMPANY_AUTHORITY=REQUIRED
LEGACY_FILE_PERSISTENCE=NON_CANONICAL
IMPLEMENTATION_MUST_BE_SPLIT_INTO_NARROW_PATCHES
PRODUCTION_BEHAVIOR_CHANGED=NO
```
