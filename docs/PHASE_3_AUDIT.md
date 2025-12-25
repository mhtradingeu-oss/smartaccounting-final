# PHASE 3 SECURITY & COMPLIANCE AUDIT

## JWT Issuance & Verification

- **Issuance:** `/src/services/authService.js` (uses `jsonwebtoken` to sign JWTs)
- **Verification:** `/src/middleware/authMiddleware.js` (verifies JWT on every protected request)
- **Evidence:**
  - `/src/routes/auth.js` (login/register endpoints)
  - `/src/services/authService.js` (login/register functions)

## JWT Revocation (Blacklist)

- **Revocation:** `/src/services/revokedTokenService.js` (stores revoked tokens in DB)
- **Check:** `/src/middleware/authMiddleware.js` (checks revoked tokens on every request)
- **Evidence:**
  - `/src/routes/auth.js` (logout endpoint)
  - `/src/services/revokedTokenService.js` (findOrCreate, findOne)

## Tenant Isolation Middleware

- **File:** `/src/middleware/authMiddleware.js` (enforces company/tenant isolation)
- **Evidence:**
  - `/src/routes/users.js`, `/src/routes/companies.js` (requireCompany middleware)

## Security Middleware

- **CORS:** `/src/middleware/cors.js` (enabled in `/src/app.js`)
- **Headers:** `/src/middleware/security.js` (helmet, CSP, etc. in `/src/app.js`)
- **Rate Limiting:** `/src/middleware/rateLimiter.js` (enabled in `/src/app.js`)
- **Evidence:**
  - `/src/app.js` (middleware order, usage)

## Audit Logging

- **File:** `/src/services/auditLogService.js` (append-only, hash-chained logs)
- **Evidence:**
  - `/src/routes/users.js`, `/src/routes/companies.js`, `/src/routes/compliance.js` (calls to AuditLogService)

## Secrets & Environment Handling

- **.env.example:** `/client/.env.example` (example secrets, not hardcoded)
- **.gitignore:** `/client/.gitignore` (ignores .env, secrets)
- **Evidence:**
  - `/client/.env.example` (template)
  - `/client/.gitignore` (excludes .env)

---

All controls above are implemented and enforced in code. See referenced files for details.
