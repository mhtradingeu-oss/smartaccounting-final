# PHASE 4 — Progressive Feature Activation (PH-04)

This checklist captures how we progressively turn on the “Coming Soon” experiences in the prescribed order while honoring our automation safety rules: no auto-apply, no silent writes, every action auditable, and every verification exercise runs against the guarded demo seed.

## Guardrails

- **No auto-apply:** Every workflow is human-in-the-loop. OCR previews never write data, AI assistant responses remain advisory (see `src/middleware/aiReadOnlyGuard.js` and `src/services/ai/automation/automationGuard.js`), and bank import is a two-step dry run/confirm process.
- **No silent writes:** Actions either happen behind explicit UI/CLI confirmations or stay read-only (`ReadOnlyBanner` used across the UI, `automationAuditLogger` records each automation event).
- **Fully auditable:** `AuditLogService` and AI audit loggers (`src/services/ai/aiAuditLogger.js`, `src/services/auditLogService.js`) capture every enabled feature evaluation. GoBD-compliant persistence lives in `src/services/ocrService.js` and `src/services/gobdComplianceService.js`.
- **Reversible or explainable:** Features can be toggled back off via environment flags for rollback, and every AI insight/suggestion includes explainability metadata and an immutable audit trail (`src/services/ai/explainability.js`, `src/services/ai/insightTypes.js`).

## Flag matrix (all flags must be documented before rolling any feature to production)

| Flag | Scope | Toggle | Where it appears |
| --- | --- | --- | --- |
| `OCR_PREVIEW_ENABLED` / `VITE_OCR_PREVIEW_ENABLED` | Controls `/api/ocr/preview` and `client/src/pages/OCRPreview.jsx` | `false` ⟷ `true` | Backend route (`src/routes/ocr.js`) and front-end feature guard (`client/src/lib/featureFlags.js`) |
| `AI_ASSISTANT_ENABLED` / `VITE_AI_ASSISTANT_ENABLED` | Enables `/api/ai/read` assistant endpoints and `/ai-assistant` page | `true` (default) ⟷ `false` to disable | `src/routes/aiReadOnly.js`, `client/src/pages/AIAssistant.jsx`, client `FEATURE_FLAGS` tie-in |
| `BANK_IMPORT_ENABLED` / `VITE_BANK_IMPORT_ENABLED` | Allows `/api/bank-statements/import/confirm` to finalize imports | `false` (safe) → `true` (production) | `src/routes/bankStatements.js`, Stripe-protected import UI plus client flag mirror |
| Demo guard (`DEMO_MODE=true` + `ALLOW_DEMO_SEED=true`) | Seeds data used by every verification step | flags stay on only for sandbox runs | `docs/DEMO_SEEDING.md`, `database/seeders/demo/20251226-demo-seed.js` |

## Step 1 — OCR preview → invoice/expense draft creation

1. Enable the preview route by setting `OCR_PREVIEW_ENABLED=true` on the backend and mirroring `VITE_OCR_PREVIEW_ENABLED=true` when running the client.
2. Upload a document via `/api/ocr/preview` (or the `/ocr-preview` page). The route is entirely read-only: it uses `ocrService.previewDocument`, never persists, and logs the attempt via `AuditLogService.appendEntry`.
3. Use the structured preview (warnings + explanations in `client/src/pages/OCRPreview.jsx`) to manually drive a draft invoice/expense via the existing creation forms (`client/src/pages/InvoiceCreate.jsx`, `client/src/pages/Expenses.jsx`) which default to `status: 'draft'`.
4. Validate the flow against seeded demo data so the UI surfaces real invoices/expenses for reference.

**Tests / verification**

- `USE_SQLITE=true NODE_ENV=development DEMO_MODE=true ALLOW_DEMO_SEED=true npm run db:seed:demo`
- `npm test tests/routes/ocrPreview.test.js`
- Manual verifications: upload a demo PDF, confirm preview fields filled, then copy fields into the invoice or expense create modal marked as `Draft`.

## Step 2 — AI Assistant → action suggestions (read-only)

1. Ensure `AI_ASSISTANT_ENABLED=true` (default) and `VITE_AI_ASSISTANT_ENABLED=true` so the `/ai-assistant` page renders, the assistant session endpoints are reachable, and the sidebar item is no longer flagged as “Coming soon.”
2. The assistant calls `aiAssistantService.answerIntent`, uses `aiAutomation` detectors, and logs every request/response via `src/services/ai/aiAuditLogger.js`. `aiReadOnlyGuard` + `detectMutationIntent` intentionally block any mutating prompts.
3. Action suggestions are produced through `src/services/ai/automation/automationEngine.js`, which also enforces explainability (`explanation`, `confidence`, `evidence`, `requiresHumanApproval`) before logging with `automationAuditLogger`.
4. Viewers receive capped feeds (`tests/routes/aiInsights.test.js` confirms `viewerLimited`) while admin/accountant roles can survey the full advisory deck.

**Tests / verification**

- Demo seed (above) ensures the assistant has invoices, expenses, and bank transactions to reference.
- `npm test tests/routes/aiInsights.test.js tests/services/aiPhase3.test.js tests/explainability.test.js tests/services/aiSuggestion.gate.test.js`
- Exercise `/api/ai/read/invoice-summary`, `/api/ai/read/monthly-overview`, and `/api/ai/read/reconciliation-summary` after seeding; confirm each response contains explainable data and audit records (see `/logs` or `logs/app.log`), and that POST `/api/ai/insights/:id/decisions` returns `501`.

## Step 3 — Bank import → production enablement

1. Flip `BANK_IMPORT_ENABLED=true` (along with `VITE_BANK_IMPORT_ENABLED=true` if you stub the UI) so the confirm endpoint in `src/routes/bankStatements.js` unblocks and statements can be saved.
2. The import flow is intentionally manual: clients first hit `/api/bank-statements/import?dryRun=true` to receive a token, then POST `/confirm` only when ready. Audit events describe each dry run/confirm action (`bankImportEvent` logs + `AuditLogService` entries).
3. Seeding adds demo bank statements with matched/unmatched transactions so you can run the dry run/confirm cycle against real data.

**Tests / verification**

- `npm test tests/routes/bankStatements.test.js`
- Dry-run + confirm the demo bank statement import via API (use `X-Mock-Bank-Statement-Path` in tests or upload CSV) and confirm `BankStatement` records appear only after you confirm.
- Rollback is as simple as setting `BANK_IMPORT_ENABLED=false` and rerunning `npm run db:seed:demo:reset` if you need a clean slate.

## Step 4 — AI financial explanations (VAT / cash flow)

1. With Steps 1-3 seeded, the AI explanation stack already runs in read-only mode. VAT and cash-flow detectors live in `src/services/ai/insightTypes.js` and `src/services/ai/automation/detectors/cashFlowRiskDetector.js`.
2. Every explainable insight includes `why`, `dataPoints`, `ruleOrModel`, `confidence`, and `legalContext` (per `src/services/ai/explainability.js`), so auditors can see exactly how the VAT/cash-flow signals were derived.
3. These detectors feed both `/api/ai/insights` and the assistant intents, so enabling the AI assistant (Step 2) simultaneously unlocks explainable VAT/cash-flow narratives.

**Tests / verification**

- `npm test tests/routes/aiInsights.test.js tests/services/aiPhase3.test.js tests/explainability.test.js`
- Inspect `/api/ai/insights` responses after seeding to confirm VAT/cash-flow entries surface with `confidence` + `evidence`.
- Use `scripts/demo-verify.js` (`npm run demo:verify`) to programmatically confirm `/api/companies`, `/api/invoices`, and `/api/bank-statements` respond cleanly with the seeded VAT/cash-flow data.

## Demo seed + audit validation

- Every verification run begins with `USE_SQLITE=true NODE_ENV=development DEMO_MODE=true ALLOW_DEMO_SEED=true npm run db:seed:demo`. The demo seed also writes a login sheet; pick `demo-accountant@demo.com` (password `Demo123!` by default) to exercise invoices, expenses, bank statements, and AI insights.
- Run `scripts/demo-verify.js` after each feature toggle to confirm `/api/companies`, `/api/invoices`, `/api/bank-statements`, and AI endpoints are healthy.
- Confirm audit writes by tailing `logs/app.log` or reading the GoBD audit record feed (`/api/exports/audit-logs` if hooked) to ensure no silent mutations occurred.

## Exit criteria

- [x] OCR preview can produce structured fields and those fields inform new invoice/expense drafts.
- [x] AI Assistant surfaces action suggestions that are read-only yet explainable (VAT, cash flow) and are logged.
- [x] Bank statement import works end-to-end only when `BANK_IMPORT_ENABLED=true`, with dry run → confirm steps and audit records.
- [x] All environment flags listed above are documented for every deployment, and toggles can be reversed.
