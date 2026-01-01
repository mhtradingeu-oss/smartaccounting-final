# AI Production Invariants (Non-Negotiable)

## Core Safety

1. AI is READ-ONLY by default.
2. AI must never mutate invoices/expenses/users/companies without explicit Human Approval.
3. All AI outputs must be scoped by companyId and enforced by RBAC.
4. AI must fail closed:
   - If AI is disabled (`aiEnabled=false`) → AI endpoints must return safe error.
   - If AI schema is missing → AI endpoints must return safe error.
5. No AI endpoint may write to DB unless:
   - intent is explicitly "mutation" AND
   - request includes an approval token AND
   - the approval is audited with a reason AND
   - the action is replayable and reversible.

## Observability & Auditability

6. Every AI response must include:
   - requestId
   - companyId
   - user role
   - modelVersion (or “mock”)
   - policyVersion
   - ruleId (when applicable)
7. All AI “suggestions” are advisory and must show:
   - explanation
   - confidence
   - data sources used
8. All AI actions must be logged to audit logs with:
   - action, resourceType, resourceId
   - oldValues/newValues (when mutation allowed)
   - reason (required)
   - immutable hash chain must remain intact.

## Privacy & Data Boundaries

9. Never send secrets or tokens to the client.
10. Never include PII in telemetry by default.
11. AI context must be minimal and purpose-limited.

## CI / Prod Gates

12. CI must run:

- backend tests (sqlite + postgres parity)
- frontend lint/test/build

13. TELEMETRY must be opt-in only and inert in CI by default.
