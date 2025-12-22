# GoBD Audit Log Design (Phase 3)

## Purpose
Implements a tamper-proof, append-only, hash-chained audit log for all accounting events, as required by German GoBD.

## Key Features
- **Append-only**: No update or delete allowed.
- **Hash-chain**: Each entry includes a hash of its own data and the previous entry's hash.
- **Write-only**: Failure to log = operation rejected.
- **Covers**: Invoice/Expense create, update, status change.
- **Export**: `/api/compliance/gobd/export` (JSON/CSV)
- **Auditable**: Hash chain can be validated for integrity.

## Data Model
- `action`: Event type (e.g., invoice_create)
- `resourceType`: Entity type (Invoice, Expense)
- `resourceId`: Entity ID
- `userId`: User performing the action
- `oldValues`/`newValues`: Before/after state
- `timestamp`: Event time
- `hash`: SHA-256 of all fields + previousHash
- `previousHash`: Hash of previous entry
- `immutable`: Always true

## Hash Chain Logic
- On each log, previous hash is fetched and included in the new entry's hash.
- Any tampering breaks the chain and is detectable.

## Integration
- All accounting event routes use a wrapper to ensure audit log is written or operation is rejected.
- No changes to business logic or validation.

## Export
- Endpoint: `/api/compliance/gobd/export`
- Query: `?format=json|csv&from=YYYY-MM-DD&to=YYYY-MM-DD`

## Tests
- Unit tests cover: append, tampering detection, export.
- Negative tests: tampering breaks chain, missing log = operation fails.

## Compliance
- Fully auditable, GoBD-compliant, and does not weaken any existing business logic or tests.

---
Prepared: 2025-12-15
By: GitHub Copilot (GPT-4.1)
