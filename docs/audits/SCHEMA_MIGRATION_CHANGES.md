# 2025-12-30: ai_insights Table Guarantee

- Added migration `20251230100000-create-ai-insights.js` to ensure `ai_insights` table exists before any additive column migrations.
- Migration is idempotent and safe for both Postgres and SQLite.
- This guarantees that all subsequent migrations (e.g., adding columns) will not fail due to missing table.

### Verification

- Run:
  - `DATABASE_URL= USE_SQLITE=true NODE_ENV=test npx sequelize-cli db:migrate --env test`
  - Confirm `ai_insights` table exists in SQLite and Postgres after migrations.

# SCHEMA MIGRATION CHANGES

## 20251229100000-add-missing-aiinsight-columns.js

- Adds missing columns to `ai_insights` for model alignment:
  - `legalContext` (TEXT, not null, default '')
  - `evidence` (JSONB, not null, default {})
  - `ruleId` (STRING, not null, default '')
  - `modelVersion` (STRING, not null, default '')
  - `featureFlag` (STRING, not null, default '')
  - `disclaimer` (STRING, not null, default '')
- Idempotent: checks for column existence before adding.

## 20251229101000-align-taxreport-id-type.js

- Prepares for aligning `tax_reports.id` to UUID (expand/contract, non-destructive):
  - Adds `id_new` UUID column if not present (Postgres only).
  - Manual intervention required to swap PK and update FKs.
  - No action for SQLite.

## 20251229102000-align-activetoken-revokedtoken-id.js

- Adds `id` column to `active_tokens` and `revoked_tokens` if missing (INTEGER, auto-increment, PK).
- Idempotent: checks for column existence before adding.
- No destructive changes.

## UUID Strategy (Postgres vs SQLite)

### Context

Production migrations previously used `uuid_generate_v4()` (Postgres) or `Sequelize.UUIDV4` (Sequelize default), which fails if the `uuid-ossp` extension is not enabled. This is not production-safe.

### New Strategy

- **Postgres**: All UUID columns now use `gen_random_uuid()` from the `pgcrypto` extension. Each migration ensures `pgcrypto` is enabled with `CREATE EXTENSION IF NOT EXISTS pgcrypto;` before using `gen_random_uuid()`.
- **SQLite**: All UUID columns use `TEXT` type, with UUIDs generated in the application layer. No DB-level default is set for SQLite.

### Migration Safety

- All changes are idempotent and backward-safe.
- For existing tables, expand/contract pattern is used: add new UUID column, backfill with `gen_random_uuid()`, then swap columns.
- No destructive rollbacks are performed.

### Verification

- Postgres: Check extensions with `\dx`, table schema with `\d <table>`, and insert test rows to verify UUID generation.
- SQLite: Run all migrations and ensure no errors related to UUID or JSONB types.

### References

- See affected migrations in `database/migrations/`.
- All changes are production-safe and require no manual DB intervention.

---

## Before/After Schema Notes

### Before

- `ai_insights` missing several columns required by model.
- `tax_reports.id` type mismatch (INTEGER vs UUID).
- `active_tokens` and `revoked_tokens` may lack `id` PK column.

### After

- `ai_insights` has all required columns for model alignment.
- `tax_reports.id` can be migrated to UUID (manual step for safety).
- `active_tokens` and `revoked_tokens` have `id` PK column for model/DB alignment.

---

## Migration Commands

**SQLite:**

```
npx sequelize-cli db:migrate --env sqlite
```

**Postgres:**

```
npx sequelize-cli db:migrate --env production
```

---

_All migrations are additive and idempotent. No destructive changes are performed automatically. For PK type changes, follow expand/contract and update FKs manually as documented._
