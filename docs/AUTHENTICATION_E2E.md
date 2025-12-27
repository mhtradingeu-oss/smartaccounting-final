# Authentication E2E Guide

## Response contract
- Backend `POST /api/auth/login` returns `{ success: true, user, token }` (via `src/routes/auth.js`); the token is also set as an HTTP-only cookie for compatibility with the refresh endpoint.
- Frontend `client/src/context/AuthContext.jsx` consumes that payload through `authAPI.login` (which forwards `response.data`), stores the `token` in `localStorage`, and keeps `user` in context for guards.
- Axios requests from `client/src/services/api.js` read `localStorage.token` and inject `Authorization: Bearer …` on every outbound request via the request interceptor, while the response interceptor dispatches the global force-logout event on a 401.

## Browser login scenario
1. Start the API server (`npm start` from the repo root) and the client (`cd client && npm run dev -- --host 0.0.0.0 --port 3000`).
2. Navigate to `http://localhost:3000/login`, enter valid credentials (e.g., seeded `demo-admin@demo.com` / `demopass1` or `test@example.com` / `testpass123` for smoke flows).
3. Observe that the token is saved (`localStorage.getItem('token')`) and the user is redirected to a protected route; ProtectedRoute waits for `status === 'authenticated'` before rendering to avoid flicker.
4. Open browser devtools network tab, confirm outgoing requests to `/api/*` include `Authorization: Bearer <token>` and that `/api/companies` returns the expected payload.
5. Browser logout clears the token and attackers can trigger `AUTH_FORCE_LOGOUT_EVENT` via the API response interceptor (any 401 response dispatches the event and redirects to `/login`).

## cURL reproduction
```bash
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo-admin@demo.com","password":"demopass1"}'
```
- Copy the `token` from the JSON response and query companies:
```bash
curl http://localhost:5001/api/companies \
  -H "Authorization: Bearer <token>"
```
- `/api/companies` validates the same token used by the browser because the backend re-reads the user record in `authenticate` and requires `req.user.companyId`.

## Rate-limit guidance for local dev
- The login rate limiter now honors `AUTH_RATE_LIMIT_WINDOW_MS` and `AUTH_RATE_LIMIT_MAX` (fallback to legacy `LOGIN_RATE_LIMIT_*` for compatibility) and defaults to `15 minutes / 20 attempts` while running in `NODE_ENV !== 'production'`.
- Production uses `5 minutes / 5 attempts` out of the box but you can customize the window and cap via the environment variables above.
- When `AUTH_RATE_LIMIT_DISABLED=true`, the limiter is skipped so local dev testing or automated smoke tests cannot be accidentally throttled.
- For faster recovery, enable the temporary reset route by setting `AUTH_RATE_LIMIT_RESET_ENABLED=true`. An admin-authenticated client can then `POST /api/auth/rate-limit/reset` (body `{ "ip": "<address>" }` is optional; it defaults to the caller's IP) to clear the memory store for that client IP.
- The rate-limited middleware still returns `{ success: false, message: 'Too many login attempts…' }`, so the frontend surfaces a `rateLimit` flag from `AuthContext.login`. You may also log into the server shell and `export AUTH_RATE_LIMIT_DISABLED=true` when debugging a locked account to unblock yourself instantly.

## Auth smoke test
- Added `tests/routes/auth.smoke.test.js` to assert that login returns `{ success, user, token }` and that the returned token can access a protected `/api/companies` endpoint.
- Run `npm test -- tests/routes/auth.smoke.test.js` (Jest already initializes the database via `tests/setup.js` and seeds `global.testUser`).

## Client build/run validation
- Build the client bundle with `cd client && npm run build` to ensure Vite succeeds.
- Run the client locally with `npm run dev` (or use `npm run preview` after building); the browser login steps above assume you hit `http://localhost:3000`.
