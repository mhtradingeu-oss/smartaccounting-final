# SECURITY_HEADERS.md

## 1. Header Inventory & Baseline

### Enforced in Production

| Header                           | Value / Example                               | Rationale / Notes                                                 |
| -------------------------------- | --------------------------------------------- | ----------------------------------------------------------------- |
| Strict-Transport-Security        | max-age=31536000; includeSubDomains; preload  | HSTS, only when HTTPS is terminated (prod, trust proxy)           |
| X-Content-Type-Options           | nosniff                                       | Prevents MIME sniffing attacks                                    |
| Referrer-Policy                  | strict-origin-when-cross-origin               | Limits referrer leakage                                           |
| Permissions-Policy               | geolocation=(), microphone=(), camera=(), ... | Disables dangerous browser features                               |
| X-Frame-Options                  | DENY                                          | Prevents clickjacking (not needed if CSP frame-ancestors is used) |
| Content-Security-Policy          | See below                                     | CSP, report-only by default, enforced via env toggle              |
| X-XSS-Protection                 | 1; mode=block                                 | Legacy XSS filter (for old browsers)                              |
| Set-Cookie                       | HttpOnly; Secure; SameSite=Strict             | Session/refresh cookies, only over HTTPS                          |
| Access-Control-Allow-Origin      | <ENV allowlist>                               | CORS, strict in prod, only configured origins allowed             |
| Access-Control-Allow-Credentials | true                                          | Only if needed for cookies/auth                                   |

### CSP Policy (Vite React SPA)

- default-src 'self';
- script-src 'self' (no unsafe-inline; use nonce if needed)
- style-src 'self' 'unsafe-inline' (Vite injects inline styles; review for nonce in future)
- img-src 'self' data: https:
- connect-src 'self' <API_URL> (allow API endpoint)
- font-src 'self'
- object-src 'none'
- frame-ancestors 'none'
- media-src 'self'
- base-uri 'self'
- form-action 'self'

#### CSP Report-Only

- If CSP_REPORT_ONLY=true, CSP is set in report-only mode for compatibility testing.
- Plan: monitor reports, then enforce once all issues are resolved.

### CORS

- In production, only origins in ENV allowlist (FRONTEND_URL) are allowed.
- Credentials allowed only if needed (cookies/auth).
- Preflight OPTIONS handled correctly.

### Cookies/Auth

- Session and refresh cookies: HttpOnly, Secure (prod), SameSite=Strict.
- JWTs are never stored in localStorage by backend.

### Proxy/HTTPS

- Express trust proxy is set in production or if TRUST_PROXY=true.
- HSTS is only enabled if HTTPS is actually terminated at the proxy.

## 2. How to Verify in Production

- Check headers on a live endpoint:
  ```sh
  curl -I https://yourdomain.com/api/health
  curl -I https://yourdomain.com/api/auth/login
  ```
- Confirm presence and values of all headers above.
- For CSP, check for Content-Security-Policy or Content-Security-Policy-Report-Only.
- For CORS, test with allowed and disallowed origins.
- For cookies, check Set-Cookie attributes (Secure, HttpOnly, SameSite).

## 3. Rationale

- Each header is chosen to mitigate a specific class of web vulnerability (see table above).
- CSP is deployed in report-only mode first to avoid breaking the app; plan to enforce after monitoring.
- CORS is strict in production to prevent cross-origin attacks.
- Cookies are secured to prevent XSS/CSRF.
- HSTS is only enabled when HTTPS is present to avoid lockout in dev/test.

## 4. Reverse Proxy / TLS Termination

- If running behind a reverse proxy (Nginx, cloud load balancer), ensure:
  - Proxy sets X-Forwarded-Proto and forwards HTTPS requests.
  - Express trust proxy is set (TRUST_PROXY=true or NODE_ENV=production).
  - HSTS is only enabled if HTTPS is actually used end-to-end.

## 5. UNKNOWNs & Verification Steps

- UNKNOWN: If any inline scripts/styles are required by Vite or third-party libs, review CSP reports and browser console for violations.
- To verify: Enable CSP_REPORT_ONLY=true in production, monitor browser console and server logs for CSP violations, and adjust policy as needed.

---

_This document is part of Phase 8: Production Readiness Audit (Step D)._
