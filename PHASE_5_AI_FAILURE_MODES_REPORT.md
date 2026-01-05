# PHASE_5 AI Failure Modes Report

## 1. AI unavailable scenarios
- Global service flag: `AIAssistant` uses `isAIAssistantEnabled()` to bulk-skip the layout, falls back to `FeatureGate`/`EmptyState` messaging instead of crashing, and the card copies remain calm (`client/src/pages/AIAssistant.jsx:191`, `client/src/components/FeatureGate.jsx:20`).  
- Tenant flag: `aiRouteGuard` checks `Company.aiEnabled` before reaching any downstream logic, returns `501` with “AI is disabled for this company,” and the earlier `handleRejection` call records `AI_QUERY_REJECTED` in `audit_logs` (`src/middleware/aiRouteGuard.js:107`, `src/services/ai/aiAuditLogger.js:178`). `aiInsightsService` and the assistant service re-check the same flag before generating data, so JavaScript/UI pages never see partial state (`src/services/ai/aiInsightsService.js:36`, `src/services/ai/aiInsightsService.js:112`).
- Context visibility: the assistant cards explicitly render `AI Enabled: No/Yes` so tenants know why AI was paused (`client/src/pages/AIAssistant.jsx:233`), and no retry loops appear because the caller either reloads or leaves the page rather than auto-retrying broken endpoints.

## 2. Low-confidence & ambiguous outputs
- Every insight card in the assistant shows `Confidence: …%` plus severity pills, so low-confidence results are visually obvious and not dressed up with strong language (`client/src/pages/AIAssistant.jsx:323`, `client/src/components/AISuggestionCard.jsx:13`).  
- Shared copy reinforces caution: “AI insights” are “Explainable + auditable,” and the chat view reminds users that “Every answer is grounded and audit logged,” avoiding certainty and obligations (`client/src/pages/AIAssistant.jsx:377`, `client/src/pages/AIAssistant.jsx:443`).

## 3. Wrong/misleading suggestion handling
- All AI outputs are marked as “advisory” (ReadOnlyBanner + session card) and there is no “Accept” button—only optional `Explain transaction`/`Why flagged?` helpers—so users can safely ignore AI if it’s misleading (`client/src/pages/AIAssistant.jsx:201`, `client/src/pages/AIAssistant.jsx:335`).  
- The suggestions list doubles down on advisory copy (“Suggestion / Recommendation only,” “No actions are taken automatically”) and visible confidence/severity to avoid visual dominance or implied automation (`client/src/pages/AIInsights.jsx:98`, `client/src/components/AISuggestionCard.jsx:14`, `client/src/pages/AIInsights.jsx:109`).

## 4. Failure transparency
- Friendly fallback: `formatApiError` surfaces non-technical messages like “Unable to reach the assistant,” so users never see stack traces, and error states render `EmptyState` components with retry buttons (`client/src/services/api.js:46`, `client/src/pages/AIAssistant.jsx:160`, `client/src/pages/AIInsights.jsx:49`).  
- Audit logging always fires before a refusal: `handleRejection` logs to `audit_logs` inside `aiRouteGuard`, so the UI can explain “AI is disabled” while the context is preserved for reviewers (`src/middleware/aiRouteGuard.js:15`, `src/services/ai/aiAuditLogger.js:29`).

## 5. Audit & evidence
- Every AI request/response gets `logRequested`/`logResponded`, and rejected or rate-limited calls use `logRejected`/`logRateLimited`, so `audit_logs` contain `userId`, `companyId`, `requestId`, `timestamp`, and hashed prompt info for each interaction (`src/services/ai/aiAuditLogger.js:29`, `src/models/AuditLog.js:1`).  
- Insights exports are available in both JSON and CSV formats, which include severity, confidence, related entity, decisions, and timestamps, so auditors can reproduce any failure or recommendation (`src/services/ai/aiInsightsService.js:135`).  
- Audit log schema enforces immutability, company context, and request IDs, satisfying the “exportable for auditors” requirement (`src/models/AuditLog.js:1`).

## UI copy references
- “AI Assistant replies are advisory only.” (`client/src/pages/AIAssistant.jsx:201`)  
- “Suggestion / Recommendation only” (`client/src/components/AISuggestionCard.jsx:14`)  
- “Limited insights are shown because your role is read-only…” (`client/src/pages/AIInsights.jsx:85`)  
- “All suggestions are AI-generated recommendations. No actions are taken automatically.” (`client/src/pages/AIInsights.jsx:109`)  
- “AI Assistant unavailable” title and “Enable AI_ASSISTANT_ENABLED to open the conversational advisor.” CTA text (`client/src/components/FeatureGate.jsx:26`, `client/src/pages/AIAssistant.jsx:195`)

## Remaining AI trust risks
- The UI still surfaces a single human-readable summary per insight, so conflicting signals must be resolved by human reviewers; there is no automated signal-merging of contradictory predictions beyond showing confidence/severity (`client/src/pages/AIAssistant.jsx:323`, `client/src/components/AISuggestionCard.jsx:16`).  
- Low-confidence happens per insight, but there is no system-wide “uncertainty dashboard,” so teams should keep monitoring audit logs and support channels if AI is repeatedly misleading.

## Testing
- Not run (not requested).
