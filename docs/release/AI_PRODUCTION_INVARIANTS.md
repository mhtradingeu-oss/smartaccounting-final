# AI_PRODUCTION_INVARIANTS (SmartAccounting)

This document defines **non-negotiable production invariants** to ensure the AI system can **never break accounting integrity, tenant isolation, or compliance**.

## 1) Core Invariants (Must Always Hold)

### I1 — AI is Advisory by Default (Read-only)

- AI endpoints must not mutate invoices/expenses/users directly.
- All AI outputs are suggestions only.
- Any mutation path requires explicit, separate non-AI routes and role-based authorization.

**Enforced by**

- AI gates + mutation intent detection
- No-mutation tests

### I2 — Tenant Isolation (Company Scoping)

- Every read/write must be scoped to the authenticated user’s company.
- Cross-company access must be denied even for valid IDs.

**Enforced by**

- Company scoping in services/routes
- Integration tests for cross-company denial

### I3 — Auditability & Immutability (GoBD mindset)

- Any audited action must write an audit log entry.
- Critical records must be immutable after approval/finalization.
- Audit logs must be tamper-evident (hash chain / immutable rules).

**Enforced by**

- AuditLog service
- Immutability rules + tests

### I4 — Fail Closed (Safety Defaults)

- If AI is disabled (`aiEnabled=false`) → AI endpoints must fail closed safely.
- If AI schema is missing → fail safely without corrupting data.

**Enforced by**

- runtime guards / schema guards
- runtime guard tests

### I5 — Governance & Explainability

- AI suggestions must include explainability fields (reasoning summary, confidence).
- AI must attach disclaimers and purpose limitation.

**Enforced by**

- explainability tests
- governance rules

### I6 — Human-in-the-loop for Any Future Automation

- Any future “actionable AI” must require:
  - explicit user confirmation
  - role checks
  - a reason field
  - an audit entry
  - rollback capability

**Enforced by**

- automation guard (reject mutation intent)
- audit reason requirements

---

## 2) Telemetry Invariants (Production Safe)

### T1 — Telemetry is Opt-in

- Telemetry must never run unless `TELEMETRY_ENABLED=true`.

### T2 — No PII in Telemetry

- Only safe metadata: requestId, route, method, statusCode, timestamp.

### T3 — CI Must Be Telemetry-Free

- CI jobs must not set TELEMETRY_ENABLED or any DSN/endpoint secrets.
- No outbound telemetry network calls in CI.

---

## 3) Release Gates (Must Pass)

### Backend

- `npm test` (sqlite)
- `npm run test:postgres` (parity)
- production smoke suite

### Frontend

- `npm run lint --prefix client`
- `npm run test --prefix client`
- `npm run build --prefix client`

### Security

- headers/cors documented and verified
- env guards validated (client/server)
- migration safety guard enabled

---

## 4) Evidence (Test Suites)

- noMutation suite
- aiSuggestionGate suite
- runtimeGuards suite
- security suite
- fullWorkflow suite

---

## 5) Change Control

Any changes affecting invariants must:

- update this document
- add/extend tests proving invariants still hold
- pass CI gates
