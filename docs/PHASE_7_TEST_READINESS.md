# Phase 7 – Test Readiness & Release Gate (Pre-Launch)

## 1. Test readiness

- **Critical flows** (auth/session, dashboard, invoices, expenses, bank statements, AI read-only surfaces, exports/observability) are wired end-to-end through the Vite frontend routes in `client/src/App.jsx` and the protected middleware chain (`client/src/components/ProtectedRoute.jsx`, `src/routes/*`, `src/middleware/authMiddleware.js`). Each page shows a loading state + empty/error UX before the backend settles so no flow requires manual DB hacks.
- **Recommended commands** before a release to prove parity and bundling:
  1. `npm run lint` (axon + frontend, per `package.json` scripts).
  2. `npm test` (Jest suites covering auth/compliance/ai guards).
  3. `npm run test:postgres` (dockerized migration + constraint validation for tables such as `ai_insights`/`audit_logs` referenced in `tests/postgres/complianceConstraints.test.js`).
  4. `npm run build --prefix client` (produces the Vite production bundle referenced in `FRONTEND_PRODUCTION_READINESS_REPORT_2026.md`).
  5. `npm run smoke:frontend` or `npm run smoke:backend` (if present) to repeat the `npm run build` + runtime verification with the server running (`src/app.js` health endpoints).

## 2. Demo mode & seed safety

- `scripts/seed-demo-prod.js` enforces `DEMO_MODE=true`, `ALLOW_DEMO_SEED=true`, and `ALLOW_DEMO_SEED_PROD=true` before seeding, resets `NODE_ENV` to `production`, runs `scripts/verify-schema.js`, and prints safe credentials (`demo-admin@demo.com`, `demo-accountant@demo.com`, `demo-auditor@demo.com`, `demo-viewer@demo.com`). The seeder (`database/seeders/demo/20251226-demo-seed.js`) generates invoices with PAID/SENT/DRAFT statuses, expenses with VAT/edge cases, and AI insights (VAT anomaly, duplicate suspicion), so manual DB tweaks are unnecessary.
- `docs/compliance/DEMO_SEED_VERIFICATION.md` documents the `curl`/SQL/AI question checks that prove every critical table (invoices, bank transactions, tax reports, audit logs, ai insights) holds realistic data before a demo or automated test starts.

## 3. Feature flags & disabled flows

- Navigation honors runtime flags in `client/src/navigation/sidebarNavigation.js`, and `client/src/lib/featureFlags.js` exposes helpers such as `isAIAssistantEnabled`/`isOCRPreviewEnabled`. Each gated UI (`client/src/pages/AIAssistant.jsx`, `OCRPreview.jsx`, `Billing.jsx`) wraps its content inside `client/src/components/FeatureGate.jsx`, giving clear fallback copy, disabled buttons, and a CTA/back-to-dashboard link when the backend rejects the feature.
- The German tax UI (`client/src/pages/GermanTaxReports.jsx`) polls `/api/german-tax/status` and handles `501` responses gracefully before any interaction occurs; the backend `src/routes/germanTax.js` immediately returns `501` via `disabledFeatureHandler('VAT/tax reporting')`, so the user sees a “not available yet” callout instead of a dead route.
- AI mutation endpoints (`src/routes/ai.js`) respond `501` and the `aiRouteGuard` middleware (`src/middleware/aiRouteGuard.js`) enforces GET/HEAD + company scopes. The read-only assistant/insights page rely on `aiReadOnly` routes plus the guard and rate limiter to prove “no fake success” in logged actions.

## 4. Error boundary & fallback safety

- The React tree is wrapped by `client/src/components/AppErrorBoundary.jsx` and each route by `client/src/components/RouteErrorBoundary.jsx`, so render failures surface calm error cards instead of blank screens.
- `client/src/services/api.js` centralizes error formatting (`formatApiError`) and forces human-friendly messages (401, 403, 429, 5xx, network) before any component renders success banners—`Billing.jsx`, `AIInsights.jsx`, and `AIAssistant.jsx` exemplify this by showing `EmptyState`, `Skeleton`, or retry controls tied to the latest `error`/`loading` state rather than a premature success toast.
- Backend errors run through `src/middleware/errorHandler.js`, which logs (with request ID + metadata) and replies with `status`, `message`, `code`, and optional `details` so the UI can show “Unable to load” instead of “Looks like everything succeeded.”

## 5. Logging & observability readiness

- Structured logging flows through `src/lib/logger/index.js`, including request context (`requestLogger`), severity channels (`logger.audit`, `.security`, `.performance`), redaction, and JSON streams that can be tailed in `logs/combined.log` + `logs/error.log`.
- `src/middleware/security.js` (rate limits, request scrubbing, slow-request warnings), `src/middleware/metrics.js`, and the frontend `client/src/lib/logger.js` all feed telemetry-safe events into `src/routes/logs.js` / `src/routes/telemetry.js`.
- Health (`GET /health`) and readiness (`GET /ready`) probes in `src/app.js` verify DB/cache/queue connectivity and expose version/timestamp, while `/metrics` surfaces Prometheus-style gauges so automation can alert before CI finishes.
- Observability discipline is documented in `docs/Observability.md`, which also lists environment guards (`LOG_LEVEL`, `METRICS_ENABLED`, `REQUEST_LOGGING`, `LOG_SLOW_REQUEST_MS`) that can be toggled per deployment.

## 6. Release gate summary

### Production-ready features

- **Core flows** – Auth/login/RBAC, Dashboard (`client/src/pages/Dashboard.jsx`), Invoices (`/invoices*`), Expenses (`/expenses`), Bank statements/imports (`/bank-statements*`), AI insights/read-only assistant (`/ai-insights`, `/ai-assistant`), Audit logs (`/audit-logs`) and GDPR requests (`/gdpr-actions`). These routes are wired through the protected layout and have error/loading states documented in the readiness report.
- **Observability and logging** – `/health`, `/ready`, `/metrics`, `src/lib/logger`, and frontend → backend log shipping via `client/src/lib/logger.js`.
- **Demo controls** – Dev-only health check and feature-callouts make it safe to point auditors/investors to these flows without exposing experimental write paths.

### Demo-only surfaces (not part of go/no-go)

- **Compliance overview** – `client/src/pages/ComplianceDashboard.jsx` + `ComplianceSnapshot.jsx` show aspirational copy but no live data; the route is hidden by the ELSTER feature flag until the backend compliance services ship.
- **German tax reporting UI** – stays in “coming soon” mode (`client/src/pages/GermanTaxReports.jsx`) while the backend always responds `501` via `src/routes/germanTax.js`.
- **AI automation / mutation endpoints** – `POST /api/ai/insights/generate` and `/api/ai/insights/:id/decisions` return `501` (see `src/routes/ai.js`), so the automation surfaces remain informational.

### Intentionally disabled features

- **Stripe billing** – every backend route is routed through `src/routes/stripe.js` and `disabledFeatureHandler('Stripe billing')`, while `client/src/pages/Billing.jsx` shows the FeatureGate text.
- **ELSTER compliance exports & German tax** – `FEATURE_FLAGS.ELSTER_COMPLIANCE.enabled` defaults to `false`, the navigation hides the link, and the API replies `501`.
- **OCR preview** – gated via `isOCRPreviewEnabled()` plus FeatureGate; no backend writes occur, making it safe but optional.

## 7. Go / No-go checklist

- [x] All critical flows (auth, dashboard, invoices, expenses, invoices, bank statements, AI read-only) run through `ROUTE_DEFINITIONS` and have working data/error states.
- [x] Demo seed script (`scripts/seed-demo-prod.js`) and `docs/compliance/DEMO_SEED_VERIFICATION.md` prove no DB hacks are needed.
- [x] Disabled routes are either hidden or clearly marked (`FeatureGate`, German tax status callout, 501 responses).
- [x] Error boundaries and `formatApiError` prevent “fake success” messaging, and backend error handler sanitizes responses before hitting the client.
- [x] Observability (health/ready/metrics), contextual logger, telemetry, and request IDs are in place so auditors/investors can trace anything.
- [x] QA/playback commands (`npm run lint`, `npm test`, `npm run test:postgres`, `npm run build --prefix client`) have been run and produce clean reports.

## 8. Final release readiness statement
“This application is safe to deploy, audit, and demonstrate.”
