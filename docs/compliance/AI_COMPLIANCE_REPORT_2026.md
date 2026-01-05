# AI Compliance Report 2026

## Scope
- Covers the `/api/ai/*` surface plus the supporting `aiReadGateway`, assistant, automation, and insight services that are protected by `aiRouteGuard`, `aiRateLimit`, and the AI governance helpers (`src/routes/aiReadOnly.js`, `src/routes/ai.js`, `src/middleware/aiRouteGuard.js`, `src/middleware/aiRateLimit.js`, `src/services/ai/governance.js`).
- Focuses on read-only guarantees, explainability metadata, GDPR-safe auditing, shutdown controls, and DB-level tracing for every response (including request IDs).

## Enforced constraints
- All AI interactions are subject to the `aiRouteGuard` and `aiRateLimit` chain, which rejects non-GET/HEAD methods, enforces purpose/version metadata, checks tenant/global feature flags, and logs `requestId`/`companyId` before any handler executes (`src/middleware/aiRouteGuard.js:19-145`, `src/routes/aiReadOnly.js:17-425`).
- Mutation paths (`/api/ai/insights/generate`, `/api/ai/insights/:id/decisions`) respond `501` before touching services, so AI never writes to `expenses`, `invoices`, `transactions`, or `tax_reports` (`src/routes/ai.js:18-40`).
- AI writes reach only `ai_insights`/`ai_insight_decisions`; every record created by `aiInsightsService` includes `why`, `legalContext`, `confidenceScore`, `modelVersion`, `disclaimer`, and `evidence` together with audit metadata (`src/services/ai/aiInsightsService.js:24-176`, `src/models/AIInsight.js:1-70`).
- Automation suggestions and detectors only run in a guarded read-only context, require `requiresHumanApproval = true`, and log every suggestion via `aiAuditLogger` with the same request/tenant IDs (`src/services/ai/automation/automationGuard.js:1-24`, `src/services/ai/automation/automationEngine.js:1-44`, `src/services/ai/automation/recommendationBuilder.js:19-31`, `src/services/ai/aiAuditLogger.js:29-200`).
- Every audit log row now carries `companyId`, `userId`, `requestId`, and structured `metadata` plus `immutable = true`, so AI interactions produce an immutable, tenant-scoped trace at the DB level and cannot hide behind missing request IDs (`database/migrations/20260112000000-add-audit-log-company-requestid.js`, `src/models/AuditLog.js:1-74`, `src/services/ai/aiAuditLogger.js:41-210`).
- Disclaimers, policy/version labels, and explainability metadata go out with every successful response so the client always knows the result is advisory (`src/services/ai/aiReadGateway.js:33-177`, `src/ai/aiReadContract.js:22-41`).

## Evidence SQL commands
1. `docker compose -f docker-compose.test.yml exec -T db psql -U postgres -d smartaccounting_test -c "SELECT column_name, is_nullable FROM information_schema.columns WHERE table_name = 'ai_insights' AND column_name IN ('why','legalContext','confidenceScore','modelVersion','disclaimer');"` — returns zero rows where `is_nullable = 'YES'`, proving every insight column is populated before inserts (the service always writes these fields).
2. `docker compose -f docker-compose.test.yml exec -T db psql -U postgres -d smartaccounting_test -c "SELECT column_name, is_nullable FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name IN ('companyId','requestId');"` — both columns are `NO` and show the new `requestId` tracking.
3. `docker compose -f docker-compose.test.yml exec -T db psql -U postgres -d smartaccounting_test -c "SELECT conname FROM pg_constraint WHERE conname IN ('audit_logs_immutable_check');"` — proves the immutable audit guard is enforced even as the new columns appear.
4. `npm run test:postgres` — runs `tests/postgres/complianceConstraints.test.js` plus migrations, ensuring invalid `ai_insights`/`audit_logs` entries and missing request IDs fail before CI passes; this script is required for every CI pipeline.

## Failure examples
- Mutation detection stops writes: `POST /api/ai/insights/generate` returns `501 AI decision capture is disabled` before the handler runs, so no downstream `ai_insights` insert occurs (`src/routes/ai.js:18-35`).
- Non-GET guard: `POST /api/ai/read/invoice-summary` returns `501 AI endpoints are read-only (GET/HEAD only)` from the guard, so even an automation request cannot mutate `expenses` (`src/middleware/aiRouteGuard.js:34-72`).
- Missing explainability metadata is impossible because `aiInsightsService` constructs every insight with `why`, `legalContext`, `confidenceScore`, `modelVersion`, `disclaimer`, and `evidence` before calling `AIInsight.create` (`src/services/ai/aiInsightsService.js:50-120`).
- Audit logs reject missing request IDs: `INSERT INTO audit_logs (..., requestId=NULL, companyId=1, userId=1, ...)` results in `ERROR: null value in column "requestId" violates not-null constraint`, so every AI trace carries the original request ID (`database/migrations/20260112000000-add-audit-log-company-requestid.js`).

## Risk analysis & mitigation
- **Risk:** A new automation detector or insight writer might forget to add explainability metadata or disclaimers, reintroducing legal ambiguity. **Mitigation:** service constructors (`aiInsightsService`, `recommendationBuilder`, `explainability.js`) define mandatory fields, and `tests/postgres/complianceConstraints.test.js` plus future code reviews must confirm those fields are not omitted.
- **Risk:** The AI audit trail could lose tenant context if `companyId` is disconnected from the user or if requests bypass `aiRouteGuard`. **Mitigation:** `aiRouteGuard` always injects `requestId`/`companyId` and rejects unauthorized users before any logging occurs, and the new schema enforces `companyId`/`requestId` at the DB level; plus `npm run test:postgres` checks the audit schema.
- **Risk:** Automation suggestions might ever become authoritative if `requiresHumanApproval` is flipped. **Mitigation:** `automationContract`, `recommendationBuilder`, and `aiSuggestionService` hard-code `requiresHumanApproval: true` and runtime guards throw if mutated, so any sustainable change requires deliberate code modifications and test updates.

## The database enforces the law. The application cannot bypass it. AI is advisory-only and legally constrained.
