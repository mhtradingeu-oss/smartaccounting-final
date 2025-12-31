# Release Checklist

## Command verification
1. `npm run lint --prefix client`
2. `npm run test --prefix client`
3. `npm run build --prefix client`

## Environment requirements
- **Server/runtime**: `NODE_ENV=production`, `DATABASE_URL`, `JWT_SECRET` (32+ chars), `PORT`, `FRONTEND_URL`.
- **Frontend**: `VITE_API_URL`, `VITE_APP_ENV`, and any optional feature flags that drive client-side features (`VITE_AI_ASSISTANT_ENABLED`, `VITE_BANK_IMPORT_ENABLED`, etc.).
- `client/src/lib/envGuards.js` now warns if required `VITE_*` values are missing in production or if any server secrets leak into `import.meta.env`.

## Rollback steps
1. If a release bundle fails smoke tests, redeploy the previous Docker image (`docker run smartaccounting:<previous>`) and rerun its health checks before unblocking users.
2. If database migrations introduced a regression, revert the problematic migration via `npx sequelize-cli db:migrate:undo` (or `npm run db:seed:undo` for seed data) and reapply a corrected migration.
3. Roll back any related frontend CDN or reverse-proxy routes to the last known-good artifact before retrying the release.
