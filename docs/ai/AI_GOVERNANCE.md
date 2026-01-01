# AI Governance

## Versioning

- policyVersion: increments when rules change.
- modelVersion: pinned per environment.
- promptVersion: pinned and logged.

## Rules

- Purpose limitation
- No silent mutation
- Human-in-the-loop for execution
- Tenant isolation enforced by server

## Logging

- requestId propagated end-to-end
- AI responses stored (optional) without PII
