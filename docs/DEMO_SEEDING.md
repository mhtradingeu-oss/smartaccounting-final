# Demo Data Seeding

This seeder now creates one deterministic demo company, four demo users (admin/accountant/auditor/viewer), multi-status invoices, multiple expenses, bank statements with matched and unmatched transactions, equivalent ledger transactions, AI insights + decisions, a VAT report stub, and GoBD audit logs. It is designed for demo sandboxes and local development only; production deployments are protected by strict guard rails.

## What the demo seed covers
- Role-specific users: `demo-admin@demo.com`, `demo-accountant@demo.com`, `demo-auditor@demo.com`, `demo-viewer@demo.com` (password configurable via `DEMO_PASSWORD`, default `Demo123!`).
- Invoice flows in `DRAFT`, `SENT`, and `PAID` states complete with line items.
- Expenses in draft/booked/archived states plus bank statements/reconciliations showing both matched and unmatched transactions.
- Ledger transactions that feed tax calculations, a VAT report placeholder, and audit logs trace every seeded action.
- AI insights with sample explainability and decision records so the AI dashboard is populated.

## Guard rails
- `database/seeders/demo/20251226-demo-seed.js` now throws unless both `DEMO_MODE=true` **and** `ALLOW_DEMO_SEED=true` are present in the environment, regardless of `NODE_ENV`.
- The seeder also requires the backend to have the schema that matches `src/models` (snake/camel case columns like `dueDate`, `createdByUserId`, and `fileName`).
- The `down` method uses the same guards, so reversal (`demo-reset`) is equally explicit.

## Local development (SQLite)
1. Ensure the SQLite file is reachable (defaults to `database/dev.sqlite`). You can reuse it across runs or delete it to start fresh – the seeder is idempotent.
2. Run migrations (this can target a throwaway DB if the existing file already has schema drift):
   ```bash
   NODE_ENV=development USE_SQLITE=true DATABASE_URL=sqlite::memory: npm run db:migrate
   ```
3. Seed the demo data:
   ```bash
   NODE_ENV=development USE_SQLITE=true DATABASE_URL=sqlite:database/dev.sqlite DEMO_MODE=true ALLOW_DEMO_SEED=true npm run db:seed:demo
   ```
4. When you need to wipe the demo rows locally, rerun the guarded undo:
   ```bash
   NODE_ENV=development USE_SQLITE=true DATABASE_URL=sqlite:database/dev.sqlite DEMO_MODE=true ALLOW_DEMO_SEED=true npm run db:seed:demo:reset
   ```

## Docker / production-style demo
Use the same flags inside the `backend` container. Example for a demo deployment (Postgres):
```bash
docker compose -f docker-compose.prod.yml run --rm backend \
  /bin/sh -c "DEMO_MODE=true ALLOW_DEMO_SEED=true npm run db:seed:demo"
```
Repeat with `npm run db:seed:demo:reset` when tearing the demo down. The guard rails keep the script from running unless both flags are set.

## Verification via API
After seeding, start the backend with the same environment so the demo users and tokens are valid (see `README.md` or `docs/AUTHENTICATION_E2E.md`). Then:

- Confirm the company records:
  ```bash
  curl http://localhost:5000/api/companies
  ```
- Check invoices:
  ```bash
  curl http://localhost:5000/api/invoices
  ```
- Inspect bank statements:
  ```bash
  curl http://localhost:5000/api/bank-statements
  ```

Each endpoint should return the seeded objects and demonstrate that the Authorization guard and `requireCompany` middleware are satisfied by the demo users. If you trigger the endpoints from the browser, the `AuthContext` will store the bearer token in `localStorage` and attach it automatically through `client/src/services/api.js`.

### Programmatic verification

For repeatable verification run:

```bash
USE_SQLITE=true NODE_ENV=development JWT_SECRET=demo-jwt-secret npm run demo:verify
```

The helper logs in as `demo-admin@demo.com`, reuses the returned JWT, and confirms `/api/companies`, `/api/invoices`, and `/api/bank-statements` all respond cleanly with seeded data.
