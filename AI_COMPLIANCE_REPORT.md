# AI Compliance Report 2026

## Scope
- Review covers all AI endpoints under `/api/ai` plus supporting services (`aiReadGateway`, assistant, automation, and insight generator) as well as schema/middleware/feature flags that enforce read-only, explainability, GDPR, and shutdown controls.
- Excludes marketing materials and documentation outside audited code paths.

## What AI does / does NOT do
- **Does:** Provide read-only summaries (`/api/ai/read/invoice-summary`, `/monthly-overview`, `/reconciliation-summary`), conversational assistance (`/api/ai/read/assistant*`), and explainable insight exports (`/api/ai/insights`, `/exports/insights.{json,csv}`) via guarded handlers (`src/routes/aiReadOnly.js:55-422`, `src/routes/ai.js:57-94`).
- **Does NOT:** Never mutate `expenses`, `invoices`, `transactions`, or `tax_reports`—AI writes only to `ai_insights` and `ai_insight_decisions` (models `src/models/AIInsight.js:22-62`, `src/models/AIInsightDecision.js:1-55`), and mutation endpoints return 501 before touching services (`src/routes/ai.js:18-28`). Automation / suggestion paths are advisory-only (`automationGuard` and `recommendationBuilder` enforce read-only and `requiresHumanApproval: true`).
- All AI responses are read-only; `aiRouteGuard` rejects non-GET/HEAD requests and enforces feature flags (`src/middleware/aiRouteGuard.js:72-177`).

## Explainability guarantees
- Every insight record stores `why`, `legalContext`, `confidenceScore`, `modelVersion`, `evidence`, and `disclaimer` and writes them on creation (`src/services/ai/aiInsightsService.js:36-80`) even though migration `20260107000000-align-ai-insights-schema.js:31-117` relaxed nullability; schema `20251230100000-create-ai-insights.js:13-123` originally required them. 
- Automation detectors and insights carry explainability metadata via `insightTypes` and `explainability` helpers (`src/services/ai/insightTypes.js:4-145`, `src/services/ai/explainability.js:1-25`).
- Responses include disclaimers and contract metadata (`src/services/ai/aiReadGateway.js:211-235`, `src/ai/aiReadContract.js:22-41`), so every client sees the policy/version/model and knows the output is advisory.

## GDPR safeguards
- Prompts are redacted before logging (`src/services/ai/governance.js:18-47`) and only hashes of sanitized prompts are stored in `audit_logs` via `aiAuditLogger` (`src/services/ai/aiAuditLogger.js:7-189`).
- Context data is sanitized to minimal invoice/expense/bank/inight fields (`src/services/ai/contextContract.js:17-68`), no PII beyond IDs/status/currency/dates.
- Audit logs hold `userId`, `companyId`, `requestId`, and `timestamp` for each AI interaction; the schema enforces immutability (`src/models/AuditLog.js:1-90`) and the service now writes the request ID into `audit_logs.requestId`, so every trace is both human- and DB-verifiable.

## Shutdown controls
- Global disable via `AI_ASSISTANT_ENABLED` / client `VITE_AI_ASSISTANT_ENABLED` (defaults `true` in `.env.example:7-9` and `docker-compose.yml:50-98`) causes `/assistant`/`/session` routes to respond 501 before any logic runs (`src/routes/aiReadOnly.js:21-364`).
- Tenant disable via `Company.aiEnabled` (model `src/models/Company.js:74-127`) is checked by the route guard and assistant service (`src/middleware/aiRouteGuard.js:106-123`, `src/services/ai/aiAssistantService.js:129-144`); disabled companies always receive 501 responses.
- Mutation endpoints are hard-coded to 501 (`src/routes/ai.js:18-28`), so disabling insights generation or decisions already blocks writes.

## Evidence checklist (auditor verifiable)
1. `ai_insights` schema fields (why, confidenceScore, legalContext, evidence, modelVersion, disclaimer) present: `database/migrations/20251230100000-create-ai-insights.js:13-123`.
2. Insight creation populates explainability metadata: `src/services/ai/aiInsightsService.js:36-80`.
3. Read-only enforcement via route guard and middleware: `src/routes/aiReadOnly.js:55-422`, `src/middleware/aiRouteGuard.js:72-177`.
4. Mutation paths return 501 and never invoke downstream services: `src/routes/ai.js:18-94`.
5. Context sanitization and PII redaction: `src/services/ai/contextContract.js:17-68`, `src/services/ai/governance.js:18-47`.
6. Audit logging records hashed prompts with user/company/time: `src/services/ai/aiAuditLogger.js:29-189`, `src/models/AuditLog.js:1-90`.
7. Shutdown configurable via env flags and company flag: `.env.example:7-9`, `docker-compose.yml:50-98`, `src/models/Company.js:74-127`.
8. Database integrity constraints ensure accounting tables remain consistent even if mutated elsewhere: `database/migrations/20260108001000-add-financial-integrity-checks.js:1-38`.

## Remaining risks & mitigation plan
- **Risk:** Migration `20260107000000-align-ai-insights-schema.js:31-117` made key explainability columns nullable; if future writers were added they could omit data. **Mitigation:** enforce via code reviews/tests that every insight class sets the required fields (current `aiInsightsService` and automation detectors do so); consider re-applying NOT NULL constraints once all flows guarantee values.
- **Risk:** Audit logs without a company association would block the new `companyId`/`requestId` migration. **Mitigation:** the migration backfills from the user FK and fails loudly if any rows still lack `companyId`, forcing a manual correction before downstream services go live.

**Final assessment:** The repository enforces advisory-only AI behavior, explainability metadata capture, GDPR redaction before logging, tenant/global shutdowns, and disabled mutation routes. These controls support a conservative compliance posture, but this document does not claim regulatory certification or substitute for legal review.
