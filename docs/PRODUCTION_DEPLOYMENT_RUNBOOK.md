# Production Deployment Runbook

This runbook is the single source of truth for preparing SmartAccounting for production and safe demos. Follow each step to keep schema, runtime, and environment expectations aligned with the rule that `USE_SQLITE=true` **must never** be paired with `DATABASE_URL`.

## 1. Required Environment Variables

### Shared (all environments)
- `NODE_ENV` — `production` in deployed services, `test` during verification.
- `PORT` — network port (default: `3000`).
- `JWT_SECRET` — strong random value (see section 2).
- `DEMO_MODE`, `ALLOW_DEMO_SEED` — both must be `false` in production; only set to `true` when running guarded demo seeds.
- `DB_POOL_*`, `EMAIL_*`, `STRIPE_*`, etc. — see env.example for the rest.

### SQLite (local/dev/test harness)
- `USE_SQLITE=true` enables local migration/test harnesses.
- **Do not set `DATABASE_URL`.** The config will target `sqlite::memory:` when `NODE_ENV=test`, `sqlite:database/dev.sqlite` otherwise.
- Optionally set `SQLITE_STORAGE_PATH` when you need a file-backed database.

### Postgres (production or Postgres CI)
- `USE_SQLITE` must be unset or explicitly `false`.
- `DATABASE_URL` — required and must point to a Postgres-compatible URI (e.g., `postgres://postgres:postgres@localhost:5433/smartaccounting_test`).
- `DB_SSL=true` if connecting to TLS-enabled clusters.

## 2. Generating a Secure JWT_SECRET

```sh
openssl rand -base64 64
```

Copy the output into `JWT_SECRET` in your secrets manager or deployment environment variables before starting the service. Never check the secret into source control.

## 3. Running Migrations

### SQLite (dev/test)

```sh
USE_SQLITE=true DATABASE_URL= NODE_ENV=test npx sequelize-cli db:migrate
```

This command respects the `USE_SQLITE` guard and leaves `DATABASE_URL` unset to avoid the rule violation.

### Postgres (production or Postgres test harness)

1. Start the database with Docker (uses `docker-compose.test.yml` for CI/local, `docker-compose.prod.yml` for production).
2. Wait for readiness before running Sequelize:

   ```sh
   node scripts/wait-for-postgres.js docker-compose.test.yml db
   ```

3. Run migrations against Postgres:

   ```sh
   NODE_ENV=test DATABASE_URL=postgres://postgres:postgres@localhost:5433/smartaccounting_test USE_SQLITE=false npx sequelize-cli db:migrate
   ```

   In production containers run the same `npx` command with the production `DATABASE_URL`.

    If the `20251229101000-align-taxreport-id-type.js` migration partially applied (e.g., `id_new` already exists but was not yet promoted), simply rerun the same Sequelize/migrate command (`node scripts/migrate-prod.js` in production containers or `npx sequelize-cli db:migrate` in local/test) and it will drop the existing PK, rename `id` → `id_old`, rename `id_new` → `id`, and rebuild the UUID primary key without any manual SQL. Rerunning the migration is safe and idempotent, so no additional manual step is required after the first attempt.

## 4. Seeding Demo Data Safely

The seeder enforces schema readiness and environment flags. If either `DEMO_MODE` or `ALLOW_DEMO_SEED` is missing, it aborts with a clear log.

### SQLite (local demo)

```sh
USE_SQLITE=true DEMO_MODE=true ALLOW_DEMO_SEED=true node scripts/seed-demo-prod.js
```

### Postgres (test harness)

```sh
docker-compose -f docker-compose.test.yml up -d db
node scripts/wait-for-postgres.js docker-compose.test.yml db
DEMO_MODE=true ALLOW_DEMO_SEED=true NODE_ENV=test DATABASE_URL=postgres://postgres:postgres@localhost:5433/smartaccounting_test USE_SQLITE=false node scripts/seed-demo-prod.js
docker-compose -f docker-compose.test.yml down
```

### Postgres (production)

```sh
docker exec -it smartaccounting-backend sh -lc \
"DEMO_MODE=true ALLOW_DEMO_SEED=true NODE_ENV=production USE_SQLITE=false node scripts/seed-demo-prod.js"
```

The seeder prints the deterministic password (`Demo123!` by default) only when `DEMO_MODE=true`, so you always know how to log in.

## 5. Running Tests

- SQLite: `npm run test:sqlite` (or `USE_SQLITE=true DATABASE_URL= npx jest <tests>`). This script explicitly clears `DATABASE_URL`.
- Postgres: `npm run test:postgres` starts `docker-compose.test.yml`, waits for `pg_isready` using `scripts/wait-for-postgres.js`, applies migrations, then runs `npx jest tests/integration/runtimeGuards.test.js`.

Documented tests:

```sh
# verify sqlite harness
npm run test:sqlite

# verify postgres harness (docker)
npm run test:postgres
```

The readiness script avoids the `ECONNRESET` race by polling `pg_isready` inside the Postgres container before running migrations or tests.

## 6. Starting the Application

### Local / Node

```sh
USE_SQLITE=true DATABASE_URL= NODE_ENV=development node index.js
```

### Docker (production)

```sh
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d
```

Maps:

- Backend logs: `docker-compose -f docker-compose.prod.yml logs -f backend`
- Backend shell: `docker exec -it smartaccounting-backend sh`

## 7. Health Checks

```sh
curl -f http://localhost:3000/api/health
curl -f http://localhost:3000/api/ready
```

Both endpoints return `200` and JSON. The readiness endpoint also verifies the primary database connection.

## 8. Rollback Steps

1. Roll back to the previous Docker image or tag (update `docker-compose.prod.yml` if needed).
2. Re-run the production stack:
   ```sh
   docker-compose -f docker-compose.prod.yml up -d
   ```
3. If schema changes caused issues, restore the Postgres data directory from your latest backup (`backups/` or your storage snapshot).
4. Tail logs while rolling back:
   ```sh
   docker-compose -f docker-compose.prod.yml logs -f backend
   ```

Return the system to a known-good state before re-running migrations and deployments.

## 9. Additional Notes

- Runtime guards log clearly when optional features (AI, OCR) cannot run because the schema is incomplete. Those guards keep the parent routes closed with `503` rather than crashing.
- Audit logging is fail-closed: `withAuditLog` reverts the parent operation if `AuditLog.create` fails, preventing committed actions without their audit trail.
- Any new optional surface must respect the `USE_SQLITE` / `DATABASE_URL` rule.
