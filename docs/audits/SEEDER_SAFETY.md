# SEEDER SAFETY & VERIFICATION

## Flags & Controls

- **DEMO_MODE**: Must be `true` to allow demo seeding.
- **ALLOW_DEMO_SEED**: Must be `true` to allow demo seeding.
- **NODE_ENV**: Should be `production` for production seeding.
- **DEMO_PASSWORD**: Used for deterministic demo logins (never hardcoded for production).

## Hardened Seeder Flow

- Runs `scripts/verify-schema.js` before any seeding.
- Aborts if required tables/columns/enums are missing or incompatible.
- Prints clear error and exits non-zero on failure.
- Demo seeder is deterministic for demo users, but never exposes secrets in production.

## Failure Modes & Examples

- **Missing Table**: `[SCHEMA VERIFY] Missing required table: ai_insights`
- **Missing Column**: `[SCHEMA VERIFY] Missing column: companies.aiEnabled`
- **Enum Drift (Postgres)**: `[SCHEMA VERIFY] Enum type enum_ai_insights_entityType missing or incompatible`
- **Flags Not Set**: `[seed:demo:prod] aborted: DEMO_MODE=true and ALLOW_DEMO_SEED=true are required to run the demo seeder.`
- **Schema Not Ready**: `[seed:demo:prod] aborted: Schema is not ready for seeding.`

## Usage

**SQLite:**

```
DEMO_MODE=true ALLOW_DEMO_SEED=true npx node scripts/seed-demo-prod.js --env sqlite
```

**Postgres:**

```
DEMO_MODE=true ALLOW_DEMO_SEED=true npx node scripts/seed-demo-prod.js --env production
```

---

_All demo/prod seeders now require schema readiness and correct flags. No secrets are hardcoded for production. See scripts/verify-schema.js for checks._
