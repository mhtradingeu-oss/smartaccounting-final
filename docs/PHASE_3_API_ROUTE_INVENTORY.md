# Phase 3 API Route Inventory

This inventory documents the critical API routes listed in the Phase 3 brief and explains how each route already satisfies the required guardrails for input validation, response shape, timeout safety, and error handling.

## Global safeguards

- **Timeout enforcement** – `src/middleware/apiTimeout.js` installs `createApiTimeoutMiddleware` on every `/api` path (see `src/app.js`). It sets a 500 ms hard limit (customizable via `API_REQUEST_TIMEOUT_MS`), injects an `X-API-Timeout` header, and returns a `504 REQUEST_TIMEOUT` payload if the guardrail is triggered. There is a dedicated override for the dashboard namespace so `/api/dashboard/stats` gets an 800 ms budget (`API_REQUEST_TIMEOUT_MS`, `DASHBOARD_REQUEST_TIMEOUT_MS`).
- **Observability & slow-response logging** – the existing `response-time` middleware (threshold 1000 ms) captures duration, adds `X-Response-Time`, and records slow requests so any unexpected latency is visible in logs/monitoring.
- **Error handling** – every route is wrapped in `try/catch` and `next(error)`, feeding into `src/middleware/errorHandler.js`, which ensures the client always receives a JSON `{ status:'error', message, requestId }` envelope, complete with operational codes + telemetry hooks when needed.
- **Smoke verification** – `scripts/dev-smoke.js` drives `/health` + `/api/auth/login` + `/api/companies` + `/api/invoices` + `/api/ai/insights` to prove the core happy paths return successfully, which helps confirm no endpoint is silently hanging.

## Route-specific inventory

### `/api/auth/*` (`src/routes/auth.js`)
- **Input validation** – `login`/`register` are gated by `sanitizeInput`, `preventNoSqlInjection`, and rate limiters (`loginLimiter`, `registerLimiter`). `refresh`/`logout`/`me` rely on `authenticate`/`requireRole` plus JWT validation helpers.
- **Response shape** – success responses include `{ success: true, user?, token?, refreshToken?, message? }`; failures are normalized via `errorHandler` but the route also returns human-readable error messages (e.g., `Missing refresh token`, `Not authenticated`).
- **Timeout safety** – the shared timeout middleware enforces 500 ms for `/api/auth/*` requests.
- **Error handling** – all async handlers wrap logic in `try/catch` and call `next(error)` so every failure flows to the centralized error handler; refresh failures are already translated into 401 payloads before rethrowing anything sensitive.

### `/api/companies` (`src/routes/companies.js`)
- **Input validation** – `GET /api/companies` derives filters from `req.user` while `PUT /api/companies/:companyId` runs `validateRequest` with express-validator rules (`companyId` must be an integer; metadata fields are length-restricted). Updates also trim/clean values before persisting.
- **Response shape** – `GET` replies with `{ companies: [] }` or the company list; `PUT` replies with `{ message, company }` and 400/403/404 errors carry `{ error, message }`.
- **Timeout safety** – the new timeout guard expires after 500 ms, and the audit log append runs within that budget because the work is limited to one SQL row + audit write.
- **Error handling** – missing companies yield 404, permission violations 403, and the general error handler catches any unexpected database errors.

### `/api/dashboard/stats` (`src/routes/dashboard.js`)
- **Input validation** – `authenticate` + `requireCompany` ensure the request carries a valid tenant context. No body validation is needed because the route reads `req.companyId` and the service surfs invoices.
- **Response shape** – returns `{ success: true, ...stats }` where `analyticsService.getInvoiceStats` shapes the payload. Errors bubble to the shared handler which responds with `{ status:'error', message, requestId }`.
- **Timeout safety** – `/api/dashboard/stats` inherits the dashboard-specific override, so `createApiTimeoutMiddleware` gives it 800 ms to fetch aggregated data while still ensuring it cannot hang indefinitely.
- **Error handling** – `try/catch` + `next(error)` keep this route aligned with the global error contract.

### `/api/invoices` (`src/routes/invoices.js`)
- **Input validation** – router-level guards enforce authentication, tenant scope, and roles (`admin`, `accountant`, `auditor`, `viewer`). There is no request-body schema, but `invoiceService` is the single source of truth and is invoked via `withAuditLog` for mutations.
- **Response shape** – all responses follow `{ success: true, invoices/invoice, message? }`, while not-found cases return `{ success: false, message }` with 404; errors are caught by the global handler.
- **Timeout safety** – the shared 500 ms middleware wraps the entire router so list, detail, create, update, and status-change calls have a strict upper bound before the timeout middleware emits a 504.
- **Error handling** – `try/catch` around every handler and audit-specific helpers ensure every exception is forwarded to `errorHandler`.

### `/api/expenses` (`src/routes/expenses.js`)
- **Input validation** – mutation routes run `expenseSchema.validate` from `src/validators/expenseValidator.js`, which checks vendor name, amounts, currency, status, attachments, etc. The GET routes inherit role guards similar to invoices.
- **Response shape** – GET routes return `{ success: true, expenses/expense }`. POST returns `{ success: true, expense }`; validation failures are converted to 400 errors before reaching the service.
- **Timeout safety** – the timeout middleware caps responses at 500 ms and records a `504` if the service runs past the limit.
- **Error handling** – the Joi validation errors are enriched (status 400) and routed through `next(error)` alongside service-layer errors so the shared handler maintains a consistent envelope.

### `/api/bank-statements` (the `/api/bank` inventory entry) (`src/routes/bankStatements.js`)
- **Input validation** – file imports require `format` to be one of `CSV/MT940/CAMT053`, the upload middleware enforces MIME/size limits, and `ensureBankImportEnabled` gatekeeps the feature flag. Confirmation and reconciliation endpoints verify tokens, `companyId`, and transactional context.
- **Response shape** – successes always include `{ success: true, data?, message? }` and dry runs add granular summaries (matches, warnings). Validation failures return `{ success: false, message }` with appropriate HTTP codes; server issues trigger 500 with a generic message from the handler.
- **Timeout safety** – even heavy operations (import, reconciliation, categorization) are wrapped by the 500 ms timeout guard, guaranteeing that an HTTP client receives either a success payload or a `504` within the SLA.
- **Error handling** – each route has its own `try/catch` block returning structured JSON on failure, with audit logging wrapped around imports and reconciliations. Transactions rolling back are surfaced as 500 or the embedded error’s status.

### `/api/ai/*` (`src/routes/ai.js`, `src/routes/aiReadOnly.js`, `src/routes/ai/governance.js`)
- **Input validation** – a combination of `authenticate`, `requireCompany`, `aiRouteGuard`, and `rateLimit` ensures only GET requests with `purpose`, `policyVersion`, valid company context, and non-mutating prompt intent can run. Mutation endpoints are explicitly disabled via `respondMutationDisabled`.
- **Response shape** – read routes return contextual data along with a `requestId` (e.g., `{ summary, requestId }`, `{ overview, requestId }`). `/ai/governance` always returns `{ requestId, disclaimer, policyVersion }`. AI insights exports / assistant endpoints mirror the AI gateway payloads but still include `requestId`.
- **Timeout safety** – the 500 ms timeout middleware precedes all AI routers, so the gateway proxy cannot hang longer than 500 ms without returning the standardized `504` envelope. Long-running AI I/O is also guarded by service-level timeouts inside the gateway helpers.
- **Error handling** – every AI route either handles expected rejection cases (mutation detection, disabled feature flags) or passes errors through `next(err)` so the shared error handler delivers the consistent JSON contract.

## Summary

With the new `createApiTimeoutMiddleware` plus the existing per-route guards and centralized error handler, every critical Phase 3 route now documents its validation, response, and timeout behavior. The inventory above can be used to audit the chain from request to response and to add more observability if any new routes are added.
