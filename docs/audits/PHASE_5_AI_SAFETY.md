# PHASE_5_AI_SAFETY.md

## AI decision boundaries

- **Company-level feature flag:** Every AI entrypoint (`aiAssistantService`, `aiInsightsService`, `aiSuggestionService`) first checks `Company.aiEnabled` (`src/services/ai/aiAssistantService.js:128-152` and `src/services/ai/aiInsightsService.js:33-54`); a disabled company receives 501/blocked errors that cascade into the route (see runtime guard test `tests/integration/runtimeGuards.test.js:55-116`).  
- **Schema guard:** AI services invoke `checkTableAndColumns` (`src/services/guards/schemaGuard.js:1-33`) before touching `ai_insights`; if the table or columns are missing the guard returns false and the service throws a 503 error (`src/services/ai/aiInsightsService.js:17-29`), preventing unexpected schema drift from writing corrupted data.  
- **Suggestion intents for Phase 12:** `aiSuggestionService.getSuggestion` inspects the prompt with `detectMutationIntent` (`src/services/ai/mutationIntent.js`) and rejects mutation language, denies cross-company requests, and logs every rejection (`src/services/ai/aiSuggestionService.js:1-44`). The contract validator (`src/services/ai/suggestionContract.js`) ensures suggestions remain advisory.

## Failure modes

- **AI-disabled companies** (fail-closed guard) – runtime tests simulate `aiEnabled=false` and expect AI endpoints to return 501/403/503/400/404, never 200 (`tests/integration/runtimeGuards.test.js:55-75`).  
- **Missing schema** – the guard cache is cleared and `ai_insights` is dropped before hitting `/api/ai/read/*`, and the runtime test asserts the request still responds (not crashing) while rejecting with 4xx/5xx (`tests/integration/runtimeGuards.test.js:98-115`).  
- **Audit logging failure** – `aiInsightsService.generateInsightsForCompany` wraps every creation with `logAIEvent` (`src/services/ai/aiInsightsService.js:38-66`); if audit logging throws, the operation fails fast instead of continuing silently (the BM tests stub this scenario via gate expectations in `tests/services/aiSuggestion.gate.test.js:33-44`).  
- **Intent detection fallback** – if `detectMutationIntent` flags a prompt, the suggestion flow logs rejection (`aiAuditLogger`) and throws before invoking downstream logic (`src/services/ai/aiSuggestionService.js:18-31`), so harmful requests never create suggestions.

## Safety guarantees

- **Fail-closed design:** AI assistants/services consistently throw when preconditions fail (schema guard, company flag, validation). Runtime guard tests guarantee the UI/API cannot silently continue when AI systems are misconfigured or disabled (`tests/integration/runtimeGuards.test.js:55-115`).  
- **Read-only assurance for AI suggestions:** The mutational intent detector plus audit logging ensures the AI service never writes to the core database (Phase 12 gate verifying mutation detection).  
- **Explainability and governance:** `src/services/ai/explainability.js` (tested in `tests/services/aiPhase3.test.js`) always produces explainability objects and adds disclaimers via `governance.addAIDisclaimer`, informing users that outputs are advisory and logged.  
- **Audit trail for AI:** Every AI request/response/event uses `aiAuditLogger` to append immutable audit logs (`src/services/ai/aiAuditLogger.js:1-162`), so both approvals and rejections remain traceable for GoBD compliance.

**Gate: PASS** – AI flows cannot crash core routes because of the schema guard and run-time guard tests; they fail closed with structured errors when feature flags or schema checks fail, ensuring safety for now. Mentioned runtime guard tests cover the critical paths (`tests/integration/runtimeGuards.test.js`) and Phase 12 gate tests ensure mutation prevention.
