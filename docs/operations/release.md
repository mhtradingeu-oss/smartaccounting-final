# Release Runbook

This document captures the Phase 9 release engineering controls for SmartAccounting and aligns the runbook with `docker-compose.prod.yml`, `scripts/docker-entrypoint.sh`, and the smoke tooling under `scripts/ops`.

## Preflight checklist (env, DB, TLS, backups)
- **Environment:** Load `.env.prod` (or equivalent secrets vault) and confirm `NODE_ENV=production`, `DATABASE_URL`, `JWT_SECRET`, `FRONTEND_URL`, `CLIENT_URL`, `CORS_ORIGIN`, `BACKUP_PASSPHRASE`, and `ALLOW_PROD_MIGRATIONS` are populated. The canonical SemVer version lives in the `VERSION` file and appears in `/api/system/version`.
- **Database:** Run `scripts/ops/release/preflight.sh` to validate the same production env variables, exercise `sequelize.authenticate()`, and ensure the backup directories (`BACKUP_DIR`, `WAL_ARCHIVE_DIR`) are writable. If the script fails, stop and resolve the database or credential issue before proceeding.
- **TLS:** Verify the Traefik endpoint (see `traefik/traefik.yml` and `docs/operations/tls.md`) by curling the planned hostname: `curl -I https://<your-host>/api/health`. The response should carry a trusted certificate chain and a 200 OK status.
- **Backups:** Confirm the latest logical backup exists (e.g., `scripts/ops/backup/full-backup.sh`) and the WAL shipping path (`WAL_ARCHIVE_DIR`) is healthy. The preflight script guards the local backup targets.

## Deploy steps (compose up, migrate, smoke, verify)
1. **Build/pin artifacts:** Build backend and frontend images using the `VERSION` SemVer (`docker build -t smartaccounting/backend:$(cat VERSION) .` and similarly for `client`). Push or save the tagged artifacts so production can pull the immutable tag. When promoting from a dev candidate, retag the previously tested digest (see `docs/docker-immutability.md`).
2. **Launch compose:** `ALLOW_PROD_MIGRATIONS=true` must be set before `docker compose -f docker-compose.prod.yml up --build -d` so `scripts/docker-entrypoint.sh` can run migrations safely. The entrypoint aborts migrations unless you explicitly opt in, which prevents accidental destructive schema changes.
3. **Smoke tests:** Immediately after the stack is up, run `scripts/ops/release/postdeploy.sh https://<your-host>` (it calls `scripts/ops/smoke/smoke-prod.sh` internally) and publishes the curated build metadata endpoint plus `/health` and `/ready` checks.
4. **Metrics & auth:** If metrics are enabled, hit `/metrics` with the basic auth credentials (`METRICS_BASIC_AUTH_USER` / `METRICS_BASIC_AUTH_PASS`) and verify Grafana/Prometheus can scrape. Exercise `/api/auth/health` to confirm auth subsystems report healthy status (the smoke script already covers this endpoint).

## Post-deploy verification (health, metrics internal, auth health)
- Confirm `/api/system/version` returns the new version, the git SHA of the built image, the build timestamp, and the configured environment. The release scripts and docs rely on this endpoint for audits.
- Re-run `scripts/ops/release/postdeploy.sh` if you refresh or roll forward the stack; it will ensure `/health`, `/ready`, and `/api/system/version` all resolve.
- Validate the metrics ingestion (if enabled) using the credentials from `.env.prod`; repeated failures mean the metrics credentials are missing or the endpoint is blocked.

## Rollback plan (code + DB)
- **Code:** Roll back to the previous Docker image by `docker compose -f docker-compose.prod.yml pull smartaccounting/backend:<previous-tag>` (or retag the cached image), update `VERSION` if necessary, and restart the stack. Ensure `ALLOW_PROD_MIGRATIONS` is still set before the Compose restart to re-run any pending migrations safely.
- **Database:** If a migration introduced a breaking change, run `docker compose exec backend npm run db:rollback` (or `npx sequelize-cli db:migrate:undo` inside the container) before restarting the old image. Always restore the last backup (`scripts/ops/backup/full-backup.sh` or WAL archives) before rolling back migrations to keep data consistent.
- **Contingency:** If the `ALLOW_PROD_MIGRATIONS` guard blocks migrations unexpectedly, set it to `false` to prevent future schema churn until the release that intentionally rolls forward again.

## Promotion strategy (dev -> prod)
1. Build and test the backend/frontend images in the dev cluster (`docker build -t smartaccounting/backend:dev-$(git rev-parse --short HEAD) .`).
2. After CI signs off, tag the same image with the SemVer from `VERSION` (`docker tag smartaccounting/backend:dev-<short> smartaccounting/backend:$(cat VERSION)`), push it to the registry, and update `docker-compose.prod.yml` (if you switch from `build:` to `image:`) or use `docker compose pull` on the production host.
3. Document the digest associated with the release in the release ticket and keep a backup of the `VERSION` entry so auditors can reconcile the binary (see `docs/docker-immutability.md`).

## References
- `docker-compose.prod.yml` (pins `postgres:16` and `traefik:2.11`, so only the backend/frontend artifacts change per release).
- `scripts/docker-entrypoint.sh` (runs `npm run db:migrate` with the `ALLOW_PROD_MIGRATIONS` guard in production).
- `scripts/ops/release/preflight.sh` and `scripts/ops/release/postdeploy.sh` (release gate automation).
- `scripts/ops/smoke/smoke-prod.sh` (health & auth smoke checks).
