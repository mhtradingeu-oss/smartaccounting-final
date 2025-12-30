# PHASE_4_SECURITY.md

## Threat model

- **External attackers** seek to steal or forge JWTs, exploit weak RBAC, or force registration endpoints to run in production (see `src/services/authService.js:1-172`).  
- **Malicious insiders** or compromised users could attempt privilege escalation by calling high-priv routes; `src/middleware/authMiddleware.js:1-60` enforces hierarchical RBAC (viewer→auditor→accountant→admin).  
- **Infrastructure faults** (DB downtime, missing columns) could suppress audit logs; `src/services/auditLogService.js:1-120` relies on an append-only hash chain, and every sensitive operation uses `withAuditLog` (`src/services/withAuditLog.js:1-20`), so failures roll back the request (fail-closed).  
- **Token replay** is feasible if revoked tokens remain in DB or refresh secrets are compromised; `src/services/revokedTokenService.js:1-31` and `src/services/authService.js:1-180` handle revocation and TTLs.

## Attack vectors

- **JWT theft** – tokens grant `req.user` and `req.companyId` access; there is no refresh token rotation beyond revoking via `activeTokenService`/`revokedTokenService`, so key compromise grants ongoing access until expiry (30m default).  
- **Brute-force login** – the `/api/auth/login` endpoint is limited to 5 attempts per 5 minutes via `authRateLimiter` in `src/middleware/security.js:70-110`, mitigating credential stuffing.  
- **RBAC bypass** – controllers call `requireRole` (`src/middleware/authMiddleware.js:30-61`), but routes still import service helpers and share the same user object, so any bug that bypasses middleware (e.g., forgotten `requireRole` on new endpoint) could elevate privileges.  
- **Audit log disablement** – `withAuditLog` re-throws if `AuditLogService.appendEntry` fails, so attackers cannot bypass logging; however, missing schema elements (e.g., `audit_logs.immutable` column not present) manifest as high-severity denial-of-service (fails every audited operation).  
- **Registration gating** – `authService.register` forbids production but the guard is based on `NODE_ENV`; a misconfigured env could re-enable registration, so configuration drift is an attack vector.

## Mitigations

- **JWT/HMAC secrets** must be set via env vars (`src/utils/jwtConfig.js:1-32`); build fails without them, preventing default credentials. Refresh tokens optionally reuse `JWT_SECRET` if `JWT_REFRESH_SECRET` missing, reducing key sprawl while still requiring a secret.  
- **Revocation & session management** store JWT IDs in `active_tokens` and `revoked_tokens` tables (`src/services/activeTokenService.js:1-27`, `src/services/revokedTokenService.js:1-30`), so logout/revocation is possible before expiration.  
- **Rate limiting & input hardening** in `src/middleware/security.js:1-240` wrap the API; the stack uses Helmet, body sanitizers, `mongoSanitize`, `xss-clean`, `hpp`, size limits, and per-route rate/speed limiters (auth, uploads, general API).  
- **Fail-closed audit log** ensures GoBD compliance; `withAuditLog` waits for `appendEntry` and rolls back on failure (`src/services/withAuditLog.js:1-19`), enforcing accountability even if the database temporarily rejects writes.  
- **RBAC hierarchy** ensures admins always satisfy lower tiers (`src/middleware/authMiddleware.js:30-60`), simplifying permission checks while still allowing denials when `req.user` missing.

## Residual risks

- **Schema mismatch prevents audit logging** – `AuditLogService.appendEntry` writes an `immutable` column (`src/services/auditLogService.js:1-120`), but `database/migrations/20251225000400-create-audit-logs.js` never creates it. Every audited operation therefore fails (`withAuditLog` reverts), effectively DoSing core workflows. This critical gap must be fixed before the security posture can be deemed high/critical safe.  
- **JWT secrets & refresh overlap** – the refresh secret defaults to `JWT_SECRET` when `JWT_REFRESH_SECRET` missing (`src/utils/jwtConfig.js:1-32`), so a single leaked key compromises both flows. Encourage dedicated secrets per runtime.  
- **Registration guard reliance on NODE_ENV** – if `NODE_ENV` is accidentally non-production (e.g., unset or `development`) in a prod-like deployment, the service will allow open registration, creating account takeover risk. Consider an explicit flag (e.g., `REGISTRATION_ENABLED=false`).  
- **RBAC coverage gaps** – routes must remember to apply `requireRole`; the current audit does not validate every route, so human error could still expose admin-only actions. Document which controllers need protection and add route-level tests.  
- **Demo seed & secret scanning** – all scripts require `DEMO_MODE=true` + `ALLOW_DEMO_SEED=true` (`scripts/seed-demo-prod.js`), so seeded data cannot be inserted accidentally. No secrets are checked into the repo; the `Dockerfile` installs build tools but no credentials. Still, ensure `.env.*` containing secrets remain out of VCS (already enforced by not tracking `.env` files).

**Gate: FAIL** – Until the missing `audit_logs.immutable` column is added (the schema mismatch currently breaks every operation that goes through `withAuditLog`, per `docs/audits/PHASE_2_DATABASE.md:9`), there is a critical DoS/vulnerability: attack-induced schema errors would prevent logging, which is unacceptable for GoBD compliance. That must be fixed before the security gate can pass.
