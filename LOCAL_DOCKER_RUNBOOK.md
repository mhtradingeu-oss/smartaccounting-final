# Local Docker Validation Runbook

## 1. Start Database Only

```sh
docker compose down -v
docker compose up -d db
```

**Expected Output:**

- Only the `db` container is running (`docker compose ps` shows `db` as `Up`).
- No errors in `docker compose logs db`.

**If fails:**

- Check for port conflicts or missing Docker images.
- Run `docker compose logs db` for error details.

---

## 2. Run Migrations

```sh
docker compose run --rm backend npx sequelize-cli db:migrate
```

**Expected Output:**

- All migrations show `up` or `already up to date`.
- No errors about missing columns or type mismatches.

**If fails:**

- Check migration error message for details (e.g., type mismatch, missing table).
- Ensure the database is running and accessible.

---

## 3. Start Backend and Frontend

```sh
docker compose up -d --build
```

**Expected Output:**

- `backend`, `frontend`, and `db` containers are all `Up` (`docker compose ps`).
- No crash loops in `docker compose logs backend` or `frontend`.

**If fails:**

- Check logs for stack traces or port conflicts.
- Ensure environment variables are set correctly.

---

## 4. Seed Demo Data

```sh
docker compose run --rm backend npx sequelize-cli db:seed:all
```

**Expected Output:**

- Seeder logs show demo data created or already exists.
- No errors about UUID/integer mismatches or duplicate keys.

**If fails:**

- Check for schema mismatches (run migrations again if needed).
- Review seeder logs for details.

---

## 5. Run System and Feature Audits, Demo Verification, and Smoke Tests

```sh
# System audit
./scripts/system-audit.sh

# Feature audit
./scripts/feature-audit.sh

# Demo verification
node ./scripts/demo-verify.js

# Smoke tests (if present)
./scripts/smoke.sh
```

**Expected Output:**

- Each script prints `PASS` or `OK` for all checks.
- No `FAIL`, `ERROR`, or stack traces in output.

**If fails:**

- Read the error message for the failing check.
- For audit scripts: check logs and database state.
- For demo-verify: check seed data and migrations.
- For smoke: check service health and endpoints.

---

## General Troubleshooting

- Use `docker compose logs <service>` for details.
- Use `docker compose exec db psql ...` to inspect the database directly.
- If stuck, try `docker compose down -v` and repeat from step 1.

---

**This runbook ensures your local stack is fully validated and demo-ready.**
