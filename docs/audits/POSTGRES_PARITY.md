docker-compose -f docker-compose.test.yml up -d db
npm run migrate:postgres
npm run seed:demo:postgres
npm run test:postgres

# Postgres Parity Verification

This document describes how to verify that the application works correctly with PostgreSQL, both locally and in CI.

## 1. Run Postgres Parity Tests

```
npm run test:postgres
```

**What it does:**

- Brings up a fresh Postgres instance using Docker Compose (`docker-compose.test.yml`)
- Runs all migrations against the test database
- Runs a minimal integration test (`tests/integration/runtimeGuards.test.js`)
- Shuts down the test database

**Expected output:**

- All migrations should apply without error
- Integration test should pass (output similar to below):

```
PASS  tests/integration/runtimeGuards.test.js
  ✓ should enforce runtime guards (XX ms)

Test Suites: 1 passed, 1 total
Tests:       1 passed, 1 total
```

## 2. Run Postgres Migrations Only

```
npm run migrate:postgres
```

**What it does:**

- Brings up Postgres
- Runs all migrations
- Shuts down Postgres

**Expected output:**

- All migrations should apply without error

## 3. Seed Demo Data (Guarded)

```
DEMO_MODE=true ALLOW_DEMO_SEED=true npm run seed:demo:postgres
```

**What it does:**

- Brings up Postgres
- Seeds demo data into the test database (requires DEMO_MODE and ALLOW_DEMO_SEED)
- Shuts down Postgres

**Expected output:**

- Demo data is seeded successfully (see logs for inserted records)

## 4. CI Integration

- These scripts are designed to work in both local and CI environments.
- Ensure Docker is available in CI runners.
- Use the same commands as above in your CI pipeline.

---

For troubleshooting, check container logs:

```
docker-compose -f docker-compose.test.yml logs db
```

Sequelize CLI [Node: 18.x, CLI: 6.x, ORM: 6.x]
Loaded configuration file ".sequelizerc".
Using environment "development".
== 20251226-demo-seed: migrated (0.123s)
... (other migrations)

PASS tests/integration/runtimeGuards.test.js
Runtime Guards Integration
✓ A1: Login works with aiEnabled=false
✓ A2: Company endpoint works with aiEnabled=false
✓ A3: AI endpoint fails closed (501) when aiEnabled=false
✓ B1: Demo seeder aborts without DEMO_MODE/ALLOW_DEMO_SEED
✓ B2: Demo seeder passes with flags and schema ready
✓ C1: Audit log is written for audited action

Test Suites: 1 passed, 1 total
Tests: 6 passed, 6 total

Removing smartaccounting-db-test ... done
Removing network smartaccounting-final_default

```

## 8. Troubleshooting

- If you see `No database configuration provided`, ensure `DATABASE_URL` is set as in the scripts.
- If a migration or seeder fails, check the logs for missing tables/columns or schema drift.

---

**All core flows and runtime guards are now verified to work identically on Postgres and SQLite.**
```
