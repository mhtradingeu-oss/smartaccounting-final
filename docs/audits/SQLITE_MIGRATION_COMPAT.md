# SQLITE_MIGRATION_COMPAT.md

## Summary: SQLite Migration Compatibility Fixes (2025-12-30)

### Problem

- Migration `20251228000500-create-bank-statement-import-dry-runs.js` failed on SQLite with `SQLITE_ERROR: near "(": syntax error`.
- Root cause: Postgres-only features (UUID, JSON, foreign keys, defaultValue: Sequelize.fn('NOW')) are not supported in SQLite.
- `ai_insights` table was missing; some migrations assumed its existence.

### Fixes

- **20251228000500-create-bank-statement-import-dry-runs.js**: Now gates Postgres-only features. For SQLite:
  - Uses `STRING` for UUID primary key.
  - Skips foreign key constraints.
  - Stores JSON as TEXT.
  - Omits `defaultValue: Sequelize.fn('NOW')`.
- **20251230100000-create-ai-insights.js**: New migration ensures `ai_insights` table exists (idempotent, safe for both Postgres and SQLite).

### Policy

- No model changes were made to satisfy SQLite.
- All changes are migration-only and gated by dialect.

### Verification

- Run:
  - `DATABASE_URL= USE_SQLITE=true NODE_ENV=test npx sequelize-cli db:migrate --env test`
  - All migrations now complete successfully on SQLite.
