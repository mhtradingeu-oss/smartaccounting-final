# PHASE 8: UX & DX Audit

## 1. UX pain points

- **Onboarding clarity:** `client/src/pages/OnboardingWizard.jsx` orchestrates a multi-step wizard, but several steps still render “Coming soon” cards (`client/src/components/PlaceholderCard.jsx`). Users who complete the profile step see no follow-up guidance—even the CTA defaults to `Next` without context—so first-time adopters are unsure whether they finished onboarding or need to wait.  
- **Mobile responsiveness:** Data-dense dashboards (`client/src/pages/Dashboard.jsx`, `Analytics.jsx`) rely on grid layouts with fixed column counts, so they overflow on screens narrower than ~900px. The `client/src/components/CardGrid.jsx` lacks responsive breakpoints, leaving controls partially hidden on tablets.  
- **Actionable error feedback:** `client/src/services/api.js` centralizes error formatting via `formatApiError`, which falls back to “An error occurred. Please try again.” This safe fallback obscures cause and prevents differentiating retryable vs permanent failures; surfaces only status codes (401, 403, 429, 5xx) but no backend `code`/`details` fields (see `formatApiError` lines 37-74).  
- **Delayed long-running feedback:** Import-heavy flows such as bank statements (`client/src/pages/BankStatementImport.jsx`) and AI context loading (`client/src/services/aiAssistantAPI.js`) show a spinner but no progress timeline or estimated completion, leaving users uncertain if the operation hung.

## 2. API consistency & flows

- **Shared envelope:** `client/src/services/api.js` sets `baseURL`, consistent `Content-Type`, and interceptors that log dev requests, attach JWT, and reroute 401s via `emitForceLogout`. All service modules (`invoicesAPI.js`, `expensesAPI.js`, `aiInsightsAPI.js`) import this central API so they inherit consistent retryable/unauthorized handling, which means API/UI contracts remain aligned (for example, `client/src/pages/InvoiceCreate.jsx` expects `{ invoice }` in the response).  
- **Route parity:** `docs/ROUTE_INVENTORY.md` + `docs/UI_API_MISMATCH_REPORT.md` document missing UX surfaces for backend routes flagged in `client/src/services`. For example, `/api/ai/insights/decisions` exists but the UI only displays decisions through the exports page (`client/src/pages/AIInsights.jsx`) instead of a dedicated review panel.  
- **Error message channel:** `formatApiError` uses HTTP status to categorize errors and provide default messages (lines 28-65) but never surfaces backend `code`/`details` beyond the generic fallback; this makes it impossible to show contextual prompts (e.g., “Invoice already reconciled”). Passing through safe backend text (optionally sanitized) would improve clarity.

## 3. Product polish checklist

- [x] Design system components (Button, Input, Card, Toast, Modal) live under `client/src/components/ui` and share spacing/tokens.  
- [x] Role-aware guards via `client/src/context/AuthProvider.jsx` plus `requireRole` wrapper ensure `Admin`, `Accountant`, `Verifier` flows differ only in available actions.  
- [x] i18n/RTL via `client/src/i18n.js` (react-i18next) so Arabic translations load once.  
- [x] Empty states and banners exist (see `client/src/components/EmptyState.jsx` and `ReadOnlyBanner.jsx`) and are reused across dashboards.  
- [x] Central API formatting (`formatApiError`) keeps backend contracts aligned.  
- [ ] Mobile optimization for dashboards & AI pages; introduce responsive breakpoints in `CardGrid.jsx`.  
- [ ] Clearly flag “Coming soon” cards with timeline and alternative actions (sample: `Analytics.jsx` currently hides the action).  
- [ ] Improve error specificity by surfacing backend `message`/`code` (`formatApiError` should pass `data?.details` to UI).  
- [ ] Expand `docs/UI_API_MISMATCH_REPORT.md` to capture all backend endpoints lacking UI coverage so PMs can prioritize.  
- [ ] Add code samples and quickstart snippets to support developer onboarding (`client/README.md` would be ideal).  
- [ ] Provide modular guides for AI/compliance flows (currently only references in `docs/14_AI_ACCOUNTING_INTELLIGENCE_MASTER.md`).

## 4. DX improvements

- **Onboarding docs:** Thanks to root `README.md`, `PROJECT_STRUCTURE.txt`, and `docs/TECH_STACK.md`, backend onboarding is solid, but the frontend lacks its own quickstart. A small `client/README.md` explaining `pnpm`/`npm` scripts, linters, test commands, and how to run Vite’s preview server would speed ramp-up.  
- **API usage clarity:** Services rely on `client/src/services/api.js` with consistent interceptors, but more swagger or sample GraphQL (if added) documentation would help developers verify payloads (augment `docs/audits/UI_API_MISMATCH_REPORT.md`).  
- **Error debugging:** `formatApiError` logs in dev but relies on `console.error` (lines 41, 71). Encouraging devs to call `logError` with contextual metadata (request ID, endpoint) when they catch an error would make it easier to trace mismatches between UI fields and backend validation.  
- **Developer tooling:** Hooks, contexts, and component directories already exist (`client/src/hooks`, `client/src/context`), but consider adding a `client/src/test/README.md` to explain how to run Playwright/React Testing Library suites (the tests directory is currently quiet).  
- **Accessibility:** The design system uses `aria` props and focus states, but there is no documented axe/CI check; adding mention in docs and gating critical pages (login, onboarding) with accessibility tests would reassure designers.

## 5. Gate: UX/DX adoption

- **PASS** – No UX/DX blockers prevent adoption. The UI flows function, APIs are consistent, and onboarding docs exist. Addressing the listed polish and DX improvements (responsive dashboards, clearer errors, documented quickstart) will improve developer velocity and user confidence, but they are not adoption blockers today.
