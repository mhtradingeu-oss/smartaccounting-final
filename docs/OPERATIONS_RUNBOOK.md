# SMARTACCOUNTING COMMANDS RUNBOOK

## 1️⃣ PROJECT OVERVIEW
- **What the app is:** SmartAccounting is a German-compliant accounting system built on Node/Express with Sequelize (see `package.json`) and a React/Vite frontend that surfaces AI-powered advisory insights while keeping every action auditable and read-only by default (see `docs/PHASE_4_PROGRESSIVE_FEATURE_ACTIVATION.md`).
- **Components:**
  - **Database:** PostgreSQL 15/16 (Docker images in `docker-compose.yml`, `.test`, `.prod`).
  - **Backend:** Express + Sequelize in `src/` with migration/seed tooling (`npx sequelize-cli db:migrate`, `scripts/seed-demo-prod.js`).
  - **Frontend:** React + Vite client in `client/` with dedicated Vite commands (`client/package.json`).
  - **AI:** `src/services/ai`, `src/routes/aiReadOnly.js`, and `src/middleware/aiRouteGuard.js` deliver read-only insights guarded by environment flags and per-company settings.
- **Supported environments:**
  - **DEV:** `docker-compose.yml` boots Postgres, backend, and frontend with mounted volumes; this is the only Compose file the team should use for local development (no `docker-compose.dev.yml` exists).
  - **TEST:** `docker-compose.test.yml` spins up an isolated Postgres + backend pair for compliance tests (`npm run test:postgres`).
  - **PROD:** `docker-compose.prod.yml` plus `.env.prod` drive production containers (backend on port 5050, frontend on 8080).

## 2️⃣ ENVIRONMENT SETUP
- **Required software:**
  - Docker with Compose CLI to run all compose stacks (`docker compose ...`).
  - Node.js ≥ 18 and npm ≥ 8 (per `package.json` `engines`) to execute npm scripts and seeders.
  - PostgreSQL CLI tools (`psql`, `pg_dump`, `pg_receivewal`, `pg_isready`) for backups, restores, and readiness scripts (`scripts/ops/backup`, `scripts/wait-for-postgres.js`).
- **Required ports:**
  - **DEV:** Host ports 5433 → Postgres, 5001 → backend API (`/health`, `/api`), 3000 → frontend Vite dev server.
  - **TEST:** No host ports; services talk over the Compose network. Use `docker compose -f docker-compose.test.yml exec backend` to reach the API.
  - **PROD:** 5050 → backend API, 8080 → static frontend; Postgres is internal and not port-mapped in `docker-compose.prod.yml`.
- **Required env files:**
  - Copy `.env.example` → `.env` for dev/local environments (contains Node, DB, JWT, demo credentials, AI flags, logging hints).
  - Copy `.env.prod.example` → `.env.prod` for production deployments and supply real secrets (JWT, email, Stripe, ELSTER).
  - Use `.env.test` as-is for CI/test runs (`npm run test:postgres` expects it).
  - Frontend templates: `client/.env.example` for dev overrides, `client/.env.local` for local overrides, `client/.env.production` for production builds.
- **Mandatory vs optional env variables (see `src/utils/validateEnv.js`):**
  - **Mandatory:** `NODE_ENV`, `PORT`, `DATABASE_URL`, `JWT_SECRET`, `FRONTEND_URL`.
  - **Optional but recommended:** `EMAIL_HOST`, `EMAIL_USER`, `EMAIL_PASS`, `STRIPE_SECRET_KEY`, `ELSTER_CERTIFICATE_PATH`, `REDIS_URL`, `CACHE_TTL` (warnings logged if missing).
  - **Observability hints:** `LOG_LEVEL`, `METRICS_ENABLED`, `REQUEST_LOGGING`, `LOG_SLOW_REQUEST_MS`, `LOG_SLOW_QUERY_MS` show up as warnings if unset; set them to tune telemetry.
  - **Other operable flags:** `AI_ASSISTANT_ENABLED` (backend read-only advisor), `AI_DECISION_ENABLED` (AI decision endpoint), `ALLOW_PROD_MIGRATION`, `DEMO_MODE`, `ALLOW_DEMO_SEED`, `ALLOW_DEMO_SEED_PROD`, `USE_SQLITE`, and `BANK_IMPORT_ENABLED`. 
  - **Frontend-only:** `VITE_API_URL`, `VITE_APP_ENV`, `VITE_AI_ASSISTANT_ENABLED` (mirrors backend `AI_ASSISTANT_ENABLED`).

## 3️⃣ DATABASE COMMANDS
### Starting Postgres (Docker)
- **Command:** `docker compose -f docker-compose.yml up -d db`
  - **When to use it:** Launches the dev Postgres service before running migrations, seeds, or hitting the backend on localhost:5433.
  - **Warnings:** Defaults to `smart:smartpass` credentials; `/var/lib/postgresql/data` is persisted in `pgdata-dev` and will survive `down` unless you remove the volume.
- **Command:** `docker compose -f docker-compose.test.yml up -d db`
  - **When to use it:** Boots the dedicated test Postgres instance used by `npm run test:postgres` and migration scripts.
  - **Warnings:** The test DB user is `postgres:postgres`; data is stored in `pgdata_test`, so reuse the same compose file to avoid mismatched credentials.

### Running migrations
- **Command:** `npx sequelize-cli db:migrate`
  - **When to use it:** Apply outstanding Sequelize migrations against whichever `DATABASE_URL` you provide via env (dev/prod/test).
  - **Warnings:** Ensure `DATABASE_URL` points to the intended database (`postgres://...` or `sqlite:`); running on production writes schema changes permanently.

### Verifying schema
- **Command:** `npm run db:verify`
  - **When to use it:** Confirms required tables/columns exist before seeding (calls `scripts/check-migrations.js`).
  - **Warnings:** Exits non-zero if tables are missing or if `USE_SQLITE=true` but the dialect is not SQLite.

### Seeding demo data
- **Command:** `npm run db:seed:demo`
  - **When to use it:** Seed the demo-only fixtures (`database/seeders/demo/20251226-demo-seed.js`) for local explorations.
  - **Warnings:** Runs with the default `USE_SQLITE`/`DATABASE_URL`; rerunning will insert duplicates unless you undo first (`npm run db:seed:demo:reset`).
- **Command:** `DEMO_MODE=true ALLOW_DEMO_SEED=true npm run seed:demo:prod`
  - **When to use it:** Populates production-grade demo data while guarding against accidental writes (uses `scripts/seed-demo-prod.js`).
  - **Warnings:** Requires `NODE_ENV=production` only when `ALLOW_DEMO_SEED_PROD=true`; otherwise the script aborts; it also prints the demo login sheet (default password `Demo123!`).
- **Command:** `npm run db:seed:demo:reset`
  - **When to use it:** Undo the demo seeder if it already ran (`sequelize-cli db:seed:undo` for the demo seed).
  - **Warnings:** Does not touch other seeds; ensure the demo seed is the last one applied before running this.

### Resetting database safely
- **Command:** `docker compose -f docker-compose.yml down -v && docker compose -f docker-compose.yml up -d db`
  - **When to use it:** Destroy dev Postgres data (volumes) and restart the service from scratch.
  - **Warnings:** All data in `pgdata-dev` is lost; back up critical data first.
- **Command:** `docker compose -f docker-compose.test.yml down -v`
  - **When to use it:** Clear the test Postgres volume after CI/test runs so future runs start fresh.
  - **Warnings:** `npm run test:postgres` already calls this on exit; avoid double `down` while the tests are running.

### Inspecting data (psql)
- **Command:** `psql postgres://smart:smartpass@localhost:5433/smartaccounting`
  - **When to use it:** Query the dev Postgres instance directly for quick checks (`SELECT * FROM companies LIMIT 5;`).
  - **Warnings:** Credentials are the ones defined in `docker-compose.yml`; exposing them outside your secure network is a risk.

## 4️⃣ BACKEND COMMANDS
### Run backend only (local / Docker)
- **Command:** `npm run dev`
  - Spins up `nodemon index.js` for local hot-reload development using whatever `.env` you configured.
- **Command:** `docker compose -f docker-compose.yml up --build backend`
  - Rebuilds the backend image (`Dockerfile.backend`) and runs it inside Docker; use when you need a containerized dev environment without the frontend.

### Run backend with Postgres
- **Command:** `docker compose -f docker-compose.yml up --build db backend`
  - Boots both services (backend waits on Postgres health) and runs the dev command in the container (migrates/seeds first).
- **Command:** `docker compose -f docker-compose.test.yml up --build db backend`
  - Brings up the test stack before running `npm run migrate:postgres` or `npm run test:postgres` from the host.
- **NOTE:** The backend container listens on port `5000`. In DEV Compose (`docker-compose.yml`) the host port `5001` is forwarded to that container port, so always curl `http://localhost:5001/...` when hitting the API locally.

### Run backend with demo seed
- **Command:** `DEMO_MODE=true ALLOW_DEMO_SEED=true npm run seed:demo:prod && npm run dev`
  - Seed production-style demo data and then start the backend locally; the seat of guardrails is `scripts/seed-demo-prod.js`.

### Health checks
- **Command:** `curl -fsS http://localhost:5001/health`
  - Verifies the public health endpoint (per `src/app.js`).
- **Command:** `curl -fsS http://localhost:5001/ready`
  - Confirms readiness (checks DB + cache). For admin users use `curl -H 'Authorization: Bearer <TOKEN>' http://localhost:5001/api/system/info` and `http://localhost:5001/api/system/health-detailed`.

### Logs
- **Command:** `docker compose -f docker-compose.yml logs -f backend`
  - Tail container logs for the backend service.
- **Command:** `tail -F logs/combined.log`
  - Watch persisted logs generated by the app when running outside Docker.

### Restart / stop
- **Command:** `docker compose -f docker-compose.yml restart backend`
  - Gracefully restarts the backend container (use when env changes require a restart).
- **Command:** `docker compose -f docker-compose.yml stop backend`
  - Stops the backend without affecting other services.

### AI enable/disable
- **Command:** `AI_ASSISTANT_ENABLED=false npm run dev`
  - Starts the backend with the AI assistant globally disabled (the assistant endpoints immediately return 501 via `src/routes/aiReadOnly.js`).
- **Command:** `AI_ASSISTANT_ENABLED=true AI_DECISION_ENABLED=false npm run dev`
  - Keeps the assistant UI reachable but disables decision writing (`AI_DECISION_ENABLED` gate in `src/services/ai/decision/decisionService.js`).
- **Command:** `psql postgres://smart:smartpass@localhost:5433/smartaccounting -c "UPDATE companies SET aiEnabled=false WHERE id=1;"`
  - Disables AI for a single tenant; the guard in `src/middleware/aiRouteGuard.js` will now respond with 501 for that company.

### Rate-limit / guard behavior
- **Command:** `curl -G http://localhost:5001/api/ai/read/monthly-overview -H "Authorization: Bearer <TOKEN>" --data-urlencode "purpose=monthly_overview" --data-urlencode "policyVersion=10.0.0" --data-urlencode "month=2025-01"`
  - Demonstrates the `aiRouteGuard` requirement for `purpose` + `policyVersion` and logs the request via `aiAuditLogger`.
- **Command:** `for i in {1..32}; do curl -fsS -G http://localhost:5001/api/ai/read/monthly-overview -H "Authorization: Bearer <TOKEN>" --data-urlencode "purpose=monthly_overview" --data-urlencode "policyVersion=10.0.0" >/dev/null; done`
  - Sends 32 requests in a row to trigger the AI rate limiter (`MAX_REQUESTS=30` in `src/middleware/aiRateLimit.js`). Expect a 429 after the 30th request and `AI_RATE_LIMIT_EXCEEDED` entries in the log.

## 5️⃣ FRONTEND COMMANDS
### Run frontend only / Dev mode
- **Command:** `npm run dev --prefix client`
  - Starts Vite in dev mode with hot reload (`client/package.json` already passes `--host 0.0.0.0 --port 3000`).

### Build for production
- **Command:** `npm run build --prefix client`
  - Outputs the static bundle to `client/dist`.

### Preview build
- **Command:** `npm run preview --prefix client`
  - Serves the production build locally on port 3000.

### Environment variables used by Vite
- The frontend reads `client/.env.example` for `VITE_API_URL` (backend URL, default `http://backend:5000/api` for Docker), `VITE_APP_ENV`, and `VITE_AI_ASSISTANT_ENABLED`. `client/src/lib/featureFlags.js` mirrors `VITE_AI_ASSISTANT_ENABLED` to show/hide the `/ai-assistant` page.

### i18n verification
- **Command:** `npm run i18n:verify --prefix client`
  - Runs `client/scripts/check-i18n.js` to ensure every locale matches the English key set.

### UI tests (Vitest)
- **Command:** `npm run test --prefix client`
  - Headless Vitest run for fast frontend regression checks.
- **Command:** `npm run test:watch --prefix client`
  - Keeps Vitest running in watch mode during UI development.
- **Command:** `npm run test:ui --prefix client`
  - Launches the Vitest UI in the browser for exploratory test debugging.
- **Command:** `npm run test:coverage --prefix client`
  - Generates coverage reports for Vitest tests.

## 6️⃣ FULL STACK (E2E) COMMANDS
### Full DEV stack (Docker)
- **Command:** `docker compose up --build`
  - Uses the repository's `docker-compose.yml`, builds the backend image, and boots DB, backend, and frontend together. Do not add `-d` on the first run so migrations/seeding errors remain visible; append `-d` only after the stack starts successfully once.

### Full TEST stack
- **Command:** `docker compose -f docker-compose.test.yml up --build`
  - Spins up the isolated Postgres/test backend pair used by `npm run test:postgres`. This stack intentionally runs *no frontend*; all tests execute inside the backend container against Postgres.

### Full PROD stack
- **Command:** `docker compose -f docker-compose.prod.yml up --build`
  - Builds production backend and frontend images (backend uses `.env.prod`) and exposes ports 5050 for API + 8080 for UI.

### Expected URLs after startup
- DEV UI: `http://localhost:3000`; DEV API: `http://localhost:5001/api`; DEV health: `http://localhost:5001/health`.
- PROD UI: `http://localhost:8080`; PROD API: `http://localhost:5050/api`; Swagger docs: `http://localhost:5050/api/docs` (per `src/app.js`).
- TEST API: available over Compose network only (no host ports).

### Expected health endpoints
- `/health` (public, checks database + cache). Example: `curl -fsS http://localhost:5001/health`.
- `/ready` (readiness probe). Example: `curl -fsS http://localhost:5001/ready`.
- `/metrics` (Prometheus-style metrics string).
- `/api/system/health-detailed` requires admin auth (`Authorization: Bearer <TOKEN>`).

## 7️⃣ TESTING COMMANDS
### Backend tests
- **Command:** `npm run test:sqlite`
  - Runs the Jest suite against the SQLite dev DB; use for fast local validation of `tests/**/*.test.js`.
  - **When to run:** Local dev, pre-PR checks for node-only changes.
- **Command:** `npm run test:postgres`
  - Spins up the test Postgres + backend (`docker compose -f docker-compose.test.yml`), migrates, and runs `tests/postgres/complianceConstraints.test.js`.
  - **When to run:** Run before tagging releases or after schema changes to confirm Postgres compliance.
- **Command:** `CI=true npm run test:postgres` *(also `npm run test:ci`)*
  - Mirrors CI usage (sets `CI` to true so Jest skips in-memory DB setup hooks).
  - **When to run:** Use in CI pipelines / pre-release smoke runs.

### Postgres compliance tests
- Postgres compliance is bundled into `npm run test:postgres`. No additional commands are required; the script explicitly runs `npx sequelize-cli db:migrate` and `npx jest tests/postgres/complianceConstraints.test.js` inside the Docker-backed backend.

### AI non-mutation tests
- **Command:** `npx jest tests/noMutation.test.js`
  - Targets the `noMutation` suite that asserts every AI automation attempt stays read-only.
  - **When to run:** Run whenever you change AI automation heuristics or prompt detectors.

### Frontend tests
- **Command:** `npm run test --prefix client` (see Section 5). Run after UI changes, before deploying the frontend.

## 8️⃣ DEMO & SEED MANAGEMENT
### Demo seed (safe)
- **Command:** `npm run db:seed:demo`
  - Seeds the application with demo data for invoices, bank statements, and AI insights using SQLite/Postgres depending on `DATABASE_URL`. `db:seed:demo` is optimized for DEV/local exploration.
- **Command:** `DEMO_MODE=true ALLOW_DEMO_SEED=true npm run seed:demo:prod`
  - Guarded production-grade seeding; script checks `DEMO_MODE`, `ALLOW_DEMO_SEED`, and `ALLOW_DEMO_SEED_PROD` (when `NODE_ENV=production`) before running.
  - `seed:demo:prod` produces the rigorously guarded demo dataset used in staging/sandbox environments.

### Demo verification
- **Command:** `npm run demo:verify`
  - Executes `scripts/demo-verify.js`, which makes mock HTTP calls through the Express app to `/api/companies`, `/api/invoices`, `/api/bank-statements`, and asserts seeded data exists.
- **Command:** `node scripts/dev-smoke.js`
  - Hits `/health`, `/api/auth/login`, `/api/companies`, `/api/invoices`, and `/api/ai/insights` to surface runtime issues.
- **Command:** `bash scripts/verify-core-api.sh`
  - Logs in as `demo-accountant@demo.com` and validates core API endpoints for companies, invoices, expenses, and bank statements.
- **Command:** `bash scripts/verify-production.sh`
  - Production-oriented verification: health, ready, login, and authenticated endpoints including `/api/ai/insights`.

### Demo users & passwords
- `scripts/seed-demo-prod.js` prints the login sheet after seeding. Default credentials:
  - `admin@demo.de`, `accountant@demo.de`, `auditor@demo.de`, `viewer@demo.de` with password `Demo123!` unless `DEMO_PASSWORD` is overridden.

### Guards that prevent production misuse
- `scripts/seed-demo-prod.js` aborts unless `DEMO_MODE=true` and `ALLOW_DEMO_SEED=true` (and `ALLOW_DEMO_SEED_PROD=true` when `NODE_ENV=production`). The script also resets `NODE_ENV` to `production` internally before seeding, so you must explicitly provide the override flags.

## 9️⃣ MAINTENANCE & OPERATIONS
### View logs
- **Command:** `tail -F logs/combined.log`
  - Follow backend log output when running outside Compose.
- **Command:** `docker compose -f docker-compose.prod.yml logs -f backend`
  - Stream logs from the production backend container.

### Clear caches
- **Command:** *NOT IMPLEMENTED (cache is in-memory/Redis with no CLI script).*
  - There is no repo-provided command to flush caches; you can only restart the backend to clear in-memory cache or flush Redis manually if you manage that service.

### Rebuild containers
- **Command:** `docker compose -f docker-compose.yml build backend frontend`
  - Rebuilds dev containers after dependency changes (ensures `node_modules` are reinstalled inside the container).
- **Command:** `docker compose -f docker-compose.prod.yml build backend frontend`
  - Rebuilds production backend and frontend images; the backend build pulls dependencies via `Dockerfile.backend`.
- **Command:** `npm run deploy:prod`
  - Runs production migrations, builds the frontend, and executes `docker build --tag smartaccounting:prod .` (per `package.json`).

### Remove volumes (SAFE only)
- **Command:** `docker compose -f docker-compose.test.yml down -v`
  - Removes the test volume after compliance runs.
- **Command:** `docker compose -f docker-compose.yml down -v`
  - Drops the dev Postgres volume; only run when you intend to rebuild from scratch.

### Backup database
- **Command:** `BACKUP_DIR=./backups/full DATABASE_URL=<your-db-url> BACKUP_PASSPHRASE=<passphrase> bash scripts/ops/backup/full-backup.sh`
  - Creates an AES-256-encrypted `pg_dump` of the configured `DATABASE_URL` (defaults to `./backups/full`).
  - **Warnings:** `BACKUP_PASSPHRASE` is mandatory; losing it means backups cannot be decrypted.
- **Command:** `WAL_ARCHIVE_DIR=./backups/wal REPLICATION_DATABASE_URL=<your-replication-url> bash scripts/ops/backup/incremental-wal.sh`
  - Streams WAL files via `pg_receivewal` into `backups/wal` for point-in-time recovery.

### Restore database
- **Command:** `RESTORE_DATABASE_URL=<target-db> BACKUP_PASSPHRASE=<passphrase> bash scripts/ops/restore/full-restore.sh ./backups/full/smartaccounting-full-<timestamp>.sql.gz.enc`
  - Restores a full backup into the target database.
  - **Warnings:** The script expects a gzip + OpenSSL AES-256 encrypted backup; `BACKUP_PASSPHRASE` must match the backup.
- **Command:** `WAL_ARCHIVE_DIR=./backups/wal RESTORE_DIR=./backups/pitr-restore bash scripts/ops/restore/point-in-time.sh ./backups/base/base-backup.tar.gz 2026-01-15T12:00:00Z`
  - Prepares a point-in-time recovery directory; start Postgres against `$RESTORE_DIR` afterwards to replay WAL.
- **Command:** `node scripts/ops/verify/verify-restore.js`
  - Validates the restored data by counting rows and ensuring the audit hash chain is intact.

## 🔟 DO / DO NOT SECTION
- **DO:** Run `npm run db:migrate` and `npm run db:verify` before seeding to ensure migrations applied and schema matches (`scripts/check-migrations.js` and `sequelize-cli`).
- **DO:** Execute `npm run test:postgres` (or `npm run test:ci`) before creating release tags so Postgres compliance constraints are validated.
- **DO:** Seed demo data with `DEMO_MODE=true ALLOW_DEMO_SEED=true npm run seed:demo:prod` and follow up with `npm run demo:verify` or `scripts/dev-smoke.js` to confirm all AI endpoints work.
- **DO NOT:** Run the demo seeder in production without `ALLOW_DEMO_SEED_PROD=true`; the guard in `scripts/seed-demo-prod.js` will abort, and bypassing it risks accidental production writes.
- **DO NOT:** Use `docker compose -f docker-compose.prod.yml down -v` unless you have explicit permission, because the prod Postgres volume is the canonical datastore.
- **DO NOT:** Delete `logs/combined.log` while logs are being tailed; instead rotate by moving files and restarting the backend.
