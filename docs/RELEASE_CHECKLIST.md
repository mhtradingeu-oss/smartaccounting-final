# Production Release Checklist

## Goals
- One command release flow (`npm run deploy:prod`).
- Verified migrations and schema state before rollout.
- Environment validation, login, and demo seed behavior confirmed.
- Docker image built reproducibly and ready for deployment.

## Pre-flight
1. Ensure the following environment vars are set (see `configs`/`.env.prod`):
   - `NODE_ENV=production`, `DATABASE_URL`, `JWT_SECRET` (>=32 chars), `PORT`, `FRONTEND_URL`.
   - Optional guards: `STRIPE_SECRET_KEY`, `REQUEST_LOGGING`, `METRICS_ENABLED`, `DEMO_MODE`, `ALLOW_DEMO_SEED`.
2. Run `npm run lint` to catch JavaScript/TypeScript issues.
3. Run `npm test` to execute the Jest suites (includes auth + compliance tests).
4. Run `npm run smoke:frontend` to ensure the Vite build compiles cleanly.
5. Inspect logs/artifacts for warnings; rerun with `npm run lint` or `npm test` until clean.

## Release
1. Execute `npm run deploy:prod`. This runs:
   - `npm run migrate:prod` (validates env and runs Sequelize migrations).
   - `npm run smoke:frontend` (builds the frontend bundle).
   - `docker build --tag smartaccounting:prod .` (produces the container for release).
2. After the command completes, verify the Docker image locally via `docker images smartaccounting:prod` and run it with the production env to ensure startup logs show `Server running` and Swagger docs reachable.
3. Confirm browser login (see `docs/AUTHENTICATION_E2E.md`):
   - Visit `/login`, authenticate with a seeded admin account, and check `Authorization` header on `/api/companies`; ensure token persists in `localStorage` and guarded routes render via `ProtectedRoute`.
4. Optionally, when `DEMO_MODE=true` and `ALLOW_DEMO_SEED=true`, run `npm run seed:demo:prod` to refresh demo data safely; the script enforces the guard rails and runs the same seeder as `db:seed:demo` but in prod mode.

## Post-release verification
- Monitor logs/health endpoints (`/health`, `/ready`).
- Verify `/api/compliance/overview` and `/api/gdpr/export-user-data` obey authentication (they already require `authenticate`).
- Ensure rate-limit guidance (see `docs/AUTHENTICATION_E2E.md`) is documented for future releases.

## Rollback plan
1. If migrations introduce regressions, run `npm run db:seed:undo` or `npx sequelize-cli db:migrate:undo` for the last migration, then reapply corrected migration.
2. For demo data issues, run `npm run db:seed:demo:reset` (with `DEMO_MODE`+`ALLOW_DEMO_SEED`) before reseeding.
3. Redeploy previous Docker image tag (e.g., `smartaccounting:<previous>`) and restart the service.

## Notes
- `npm run migrate:prod` uses `src/utils/validateEnv.js` to ensure all required env vars are present and warns about optional diagnostics.
- The deployment command combined with Docker ensures the same steps run on CI or in production for consistent releases.
