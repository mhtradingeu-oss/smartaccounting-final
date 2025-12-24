# Security Runbook

## Threat Model Summary
1. **Unauthorized access & token theft** – session hijack is mitigated by rotating refresh tokens, enforcing a 30-day absolute session window, revoking tokens on logout, and revoking compromised JTIs via the active token table. All authenticated routes require `authenticate` + `requireCompany`, and cross-tenant references are blocked centrally in `src/middleware/requireCompany.js`.
2. **Client-side compromise** – CSP is strict in production (`self` + HTTPS sources only) and inline styles/scripts are disabled, while security headers (HSTS, Referrer, Frame/Content-Type, Permissions-Policy) are mirrored in `src/middleware/security.js`.
3. **Malicious origin abuse** – CORS is least-privilege (`FRONTEND_URL`, `CLIENT_URL`, `CORS_ORIGIN`, dev localhost defaults) and only necessary methods/headers are allowed inside `src/middleware/cors.js`.
4. **Audit log corruption** – GoBD-grade audit logging is append-only, hash-chained, and now captures correlation IDs (`requestId` per request) in `src/services/auditLogService.js`.

## Token Rotation & Incident Response
- Refresh tokens rotate on every `/auth/refresh` call; the previous refresh JTI is revoked in `routes/auth.js` and the new token inherits the session start timestamp so the `MAX_SESSION_LIFETIME` window is enforced (`src/utils/tokenConfig.js`).
- Access & refresh cookies are bound to their configured max ages (`getJwtExpiresMs`, `getRefreshTokenMaxAgeMs`) and are removed/invalidated in `/auth/logout`, which revokes all active JTIs for the user/device pair.
- Incident playbook: (1) Rotate `JWT_SECRET` + dependent secrets, (2) bump `JWT_SECRET_VERSION` (if introduced) or increment TTL, (3) trigger `logout` for all sessions via administrative tooling or database churn, and (4) review audit logs (`AuditLogService.exportLogs`) for verified correlation IDs tied to the compromised `requestId`.

## Secret Rotation Steps
1. Update `.env.prod` (or orchestrator secrets) with new values for `JWT_SECRET`, database credentials, Stripe/ELSTER keys, etc. Placeholders remain in `.env.prod.example`.
2. Restart the application so `src/utils/validateEnv.js` re-validates all critical values (JWT length, valid URLs, production-only flags such as `CLIENT_URL`/`CORS_ORIGIN`).
3. Reissue refresh tokens by forcing service-level logout (e.g., delete rows from `active_tokens`) to reject previous secrets.
4. Update dependent clients/infra with the new secrets; confirm rotation success by hitting `/auth/refresh` (should fail for revoked JTIs) and verifying new entries in the audit log with correlation IDs matching application logs.

## Compliance Checklist (GDPR / GoBD)
1. **Audit logging coverage** – bank statement import/reconciliation/categorization (`src/routes/bankStatements.js`) and tax report generation/export (`src/routes/taxReports.js`) all record events with actions like `BANK_STATEMENT_IMPORTED` and `TAX_REPORT_EXPORTED`.
2. **Correlated context** – every audit entry inherits the request's `requestId` for tracing, stored in `correlationId`, and is hashed against the previous log entry in `src/services/auditLogService.js`.
3. **GDPR export/anonymization** – both endpoints are rate-limited by `gdprLimiter` (`src/middleware/rateLimiter.js`) and logged via `AuditLogService`, capturing the actor, IP, user agent, and the documented reason.
4. **Data retention hooks** – anonymization updates `users` to pseudonymous values while keeping financial records intact, and audit logs remain append-only for GoBD compliance (`database/migrations/20240101000000-create-core-schema.js` + new migration adding `correlationId`).
5. **Environment & secrets safety** – `validateEnvironment()` enforces production readiness and ensures no secrets are loaded from files, meeting P0-4 requirements.

## Data Retention & Deletion Hooks
- GDPR requests use `src/services/gdprService.js`. Exports return structured user/company/invoice/expense/audit log data without leaking unrelated PII, and anonymization is auditable; any new hooks should reuse `AuditLogService.appendEntry`.
- Audit logs and `active_tokens` are cleared during integration tests via `tests/utils/testHelpers.js`, but production retention should be configured per compliance policy (current stub is append-only with hash validation in `AuditLogService.validateChain()`).
