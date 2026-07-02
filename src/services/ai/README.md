# AI Services

## Active components
- `aiReadGateway.js` orchestrates every `/api/ai` read request, enforces read-only contracts, attaches disclaimers, and now logs the `requestId`/`companyId` pair into the immutable audit trail.
- `aiAuditLogger.js` is the single audit bag for AI queries, responses, sessions, rate limits, and suggestions; it now persists `requestId`, `companyId`, and structured metadata for every entry.
- `governance.js`, `contextContract.js`, `mutationIntent.js`, `promptRegistry.js`, `explainability.js`, and `insightTypes.js` form the compliance toolbox that redacts PII, enforces purpose/policy, detects mutation intent, and surfaces explainability data.
- `aiDataService.js`, `aiAssistantService.js`, and `aiSuggestionService.js` contain the read-only AI handlers (summaries, assistant prompts, suggestions) and all bubble through `requiresHumanApproval`/`rateLimit` guards before returning advisory-only responses.
- `aiInsightsService.js` covers insight generation, listing, exporting, and user decision recording (with explainable metadata) while checking company flags and schema integrity.
- `automation/` contains the guarded automation pipeline (`automationGuard.js`, `automationEngine.js`, `automationAuditLogger.js`) plus the detectors/recommendation builder; all run in GET-only mode, log via `aiAuditLogger`, and require human approval for every proposed action.

## Disabled or experimental components

## Future components (not production)
- Any additional automation detectors added under `automation/detectors/` should remain toggled off until their explainability metadata and audit logging are validated end-to-end.


## UI-9.12 CFO single-brain architecture

The active CFO intelligence path is now:

routes -> aiReadGateway -> cfoEngine

Archived legacy CFO and decision artifacts were moved outside active runtime under .architecture-archive. The active AI services no longer import CFO router, CFO controller, CFO connector bridge, or decision service files.

The eventBus remains active for the normal AI read gateway flow and is not part of a legacy CFO routing chain.
