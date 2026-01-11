# AI Security Notes

## Assistant Role Enforcement

The AI assistant endpoints are restricted to `admin` and `accountant` roles.
Viewer and auditor roles receive a 403 response with a structured error payload
and a `requestId` for audit traceability. This policy applies to both the text
assistant (`/api/ai/read/assistant`) and voice assistant (`/api/ai/voice/assistant`)
to prevent UI-only bypasses and to keep role enforcement consistent across entrypoints.

## Plan Gating & Audit Trails

All AI read endpoints are plan-gated (`aiRead`, `aiAssistant`, `aiInsights`) and
return `PLAN_RESTRICTED` (403) when a tenant lacks entitlement. All AI reads are
served through `aiReadGateway`, which records request metadata and audit events
for tenant-scoped review.

## Prompt Transport

Assistant prompts must be sent in the JSON request body over POST. Prompts are
rejected if they appear in URL query strings to avoid leaking PII via logs or
intermediaries. This keeps sensitive input out of URLs while preserving request
traceability with `requestId`.

## AI Suggestions Disabled

The `/api/ai/suggest` endpoint is disabled by default and returns `501
NOT_IMPLEMENTED` with error code `AI_SUGGEST_NOT_READY`. Suggestions remain
disabled until an explicit approval workflow, role checks, and audit logging are
implemented to prevent unreviewed mutations or compliance risks.
