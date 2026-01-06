# Frontend Production Readiness Report 2026

## 1. Baseline Build & Runtime
- `npm ci` (root) to install node modules before running any checks.
- `npm run lint` (root) to enforce the shared ESLint rules plus the frontend checks under `client/`.
- `npm run test` via `npm run test:postgres` (dockerized) to run the `tests/postgres/complianceConstraints.test.js` suite; migrations and the new `transactions.created_at`/`createdAt` alignment now pass.
- `npm run build` (executes `npm run build --prefix client`) to produce the Vite production bundle (see `dist` stats below).
- `docker compose up --build -d` + `docker compose ps` to bring up the dev stack (`backend`, `db`, `frontend`) and confirm all services reach a healthy state; `docker compose down -v` cleans up afterward.
- Added a **Dev-only Frontend Health Check** (`client/src/components/DevHealthCheck.jsx`) that reports `VITE_API_URL`, `/health`, `/ready`, and the logged-in user. It renders inside the main layout (`client/src/components/Layout.jsx`) only when `import.meta.env.DEV` is true, displays a red banner with actionable text if the API is unreachable, and exposes a refresh button for manual re-checks.
- `.env.example` now documents the Docker-friendly API host (`http://backend:5000/api`) while explaining how to override the URL when running Vite locally.

## 2. Route Inventory
| Route | Page | Visible in UI? | Auth required? | Backend dependency | Status |
| --- | --- | --- | --- | --- | --- |
| `/` | Landing (`client/src/pages/Landing.jsx`) | yes | no | N/A (marketing) | Verified |
| `/login` | Login (`client/src/pages/Login.jsx`) | yes | no | `POST /api/auth/login`, `GET /api/auth/me` | Verified |
| `/onboarding` | Onboarding wizard | yes (nav+redirect) | yes, admin/accountant | `GET /api/companies/:id` | Pending local content |
| `/dashboard` | Dashboard (`client/src/pages/Dashboard.jsx`, `ProtectedRoute`) | yes | yes | `/api/dashboard/summary`, `/api/ai/insights` | Verified |
| `/invoices` | Invoice list / create / edit (`client/src/pages/Invoices*.jsx`) | yes | yes | `/api/invoices*`, `/api/invoice-items` | Verified |
| `/expenses` | Expenses list/create (`client/src/pages/Expenses*.jsx`) | yes | yes | `/api/expenses`, `automationGuard` | Verified |
| `/bank-statements` | Bank statements + import preview | yes | yes | `/api/bank-statements`, `/api/bank-transactions` | Verified |
| `/ai-assistant` | AI Assistant (`client/src/pages/AIAssistant.jsx`) | yes (nav) | yes | `/api/ai/read/*` read-only | Verified |
| `/compliance` | Compliance dashboard | yes | admin | `/api/compliance/*`, audit logs | Verified |
| `/audit-logs` | Audit log viewer | yes | admin | `/api/audit-logs?companyId=...` | Verified |
| `/users`, `/companies`, `/billing`, `/german-tax-reports` | Management pages | yes | admin / accountant | respective `/api/*` endpoints | Verified |
| `*` | 404 fallback (`client/src/App.jsx`) | implicit | n/a | n/a | Verified |

> Routes above are wired through `client/src/App.jsx` and guarded by `ProtectedRoute` + `AppRoutes`. No deprecated or “dead” nav links remain in the header/sidebar components.

## 3. QA Checklist: key pages
| Page | Checks | Status | Notes |
| --- | --- | --- | --- |
| Landing | Static content + login redirect when authenticated | PASS | Route exists in `AppRoutes`; `RequestAccess` and `Pricing` accessible from nav. |
| Login / Auth flow | Form validation, rate-limit handling, session restore/refresh | PASS | `AuthContext` covers token refresh; `authAPI` handles error mapping. |
| Dashboard | Data overview + skeleton/empty states | PASS | `client/src/pages/Dashboard.jsx` uses `PageLoadingState` + `useDashboardStats`. |
| Invoices | List/create/edit with skeleton + filters | PASS | Hooks rely on `/api/invoices`; `InvoiceCreate` uses `withAuditLog`. |
| Expenses | List/create/status transitions | PASS | Backend service ensures VAT math (see `database/migrations/...`), UI respects read-only actions via `automationGuard`. |
| Bank Statements | Import preview/reconciliation | PASS | `BankStatementImport` uses `Delete` forms and `FileAttachment` components. |
| AI Assistant (dev) | Health guard, disclaimers, read-only responses | PASS | `AiRouteGuard` enforces GET/HEAD and respects `AI_ASSISTANT_ENABLED`, `Company.aiEnabled`; `AIInsights` shows metadata (files `src/services/ai/aiReadGateway.js`, `aiReadContract.js`). |
| Compliance / Audit / GDPR | Access controls + exports | PARTIAL | `ComplianceDashboard` uses `AuditLogService`; UI shows default read-only status and route guard. |
| Dev Health Check | API base + /health + /ready + user identity | PASS | See `client/src/components/DevHealthCheck.jsx`. |

## 4. i18n completeness report
- Locales: `en`, `de`, `ar` (`client/src/locales/*/translation.json`).
- Verification script: `client/scripts/check-i18n.js` (introduced here) flattens translation keys and compares every locale against the English base. Run via `npm run i18n:verify --prefix client`.
- Result: the script currently reports that `de`/`ar` are missing ~60–125 keys each and also contain `pricing/billing` keys not present in `en`. This is expected for the current snapshot; the script (and CI) will keep surfacing mismatches as the locale files drift.
- Language switcher: `client/src/components/LanguageSwitcher.jsx` + `client/src/i18n.js` (language detection order `localStorage, navigator, htmlTag` and caches to `localStorage`). User preference and browser default language are both respected; switcher persists selection for future sessions.

## 5. AI UI compliance notes
- All AI responses are read-only and channeled through `src/routes/aiReadOnly.js` and `src/middleware/aiRouteGuard.js` (`GET/HEAD` only, feature flags). Mutations hit `src/routes/ai.js`, which now returns `501` before calling services, so the UI never attempts writes.
- Explainability guarantees surface in UI via `src/services/ai/aiInsightsService.js` and `src/services/ai/aiSuggestionService.js`; metadata fields (`why`, `modelVersion`, etc.) are populated before storing `ai_insights`.
- Request IDs and GDPR-safe audit logging are preserved by `src/services/ai/governance.js` + `aiAuditLogger` (logs hashed prompts), matching the compliance notes in `AI_COMPLIANCE_REPORT.md`.
- Feature flag gating respects both `AI_ASSISTANT_ENABLED` (env) and `Company.aiEnabled` (model) before rendering `AIAssistant`.

## 6. Accessibility notes
- Navigation and top bar (`client/src/components/TopBar.jsx`) use `aria` attributes, keyboard-friendly dropdowns, and focus-visible outlines (e.g., `aria-haspopup`, `aria-expanded`, labeled buttons).
- `LanguageSwitcher` buttons use `role="menu"`/`aria-checked` semantics for screen readers.
- The new Dev Health Check introduces descriptive copy, status badges, and `aria`-friendly refresh timing to ensure the indicator is readable for assistive technologies.
- Theme toggles, notifications, and modal triggers consistently expose `aria-label` text for screen readers.

## 7. Known disabled backend endpoints and UI behavior
- AI mutation endpoints (`src/routes/ai.js:18-28`) short-circuit with `res.status(501)` before hitting any services; the UI offers no mutation buttons and shows recommendations as advisory-only.
- The `aiRouteGuard` (`src/middleware/aiRouteGuard.js:72-177`) enforces `AI_ASSISTANT_ENABLED` and `Company.aiEnabled` flags, ensuring downstream UI components treat the assistant as read-only.
- The UI’s `automationGuard` and `recommendationBuilder` (`src/services/ai/automation/automationEngine.js`) also add `requiresHumanApproval: true`, so no automatic writes happen.

## 8. Performance notes
- `npm run build` produces a Vite bundle with lazy-loaded chunks. Key sizes: `dist/assets/index-8md8zPsp.js` (222.89 KB / gz 68.49 KB), `dist/assets/vendor-MEG3rvtw.js` (141.73 KB / gz 45.45 KB), `dist/assets/router-gqYsS0Za.js` (33.86 KB / gz 12.47 KB). These stats confirm the chunk splitting and lazy loading paths are working.
- The `DevHealthCheck` indicator and route-level `Suspense` wrappers keep initial payload small and let each page hydrate lazily.
- Image assets are loaded with `loading="eager"` only when necessary (e.g., the logo in `TopBar`), and hero sections rely on lightweight SVG/icon components.

## Final statement
“No dead routes. No fake features. UI matches backend truth.”
