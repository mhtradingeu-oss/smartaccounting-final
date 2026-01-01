# DATABASE_SAFETY.md

## Migration Rules

- All migrations must be idempotent and reversible.
- Never edit or delete applied migration files.
- Test migrations in staging before production.

## How to Run Production Migrations

- Set `ALLOW_PROD_MIGRATION=true` in the environment.
- Run: `ALLOW_PROD_MIGRATION=true NODE_ENV=production npx sequelize-cli db:migrate`
- Never run migrations in production without this flag.

## How to Rollback

- To undo the last migration: `ALLOW_PROD_MIGRATION=true NODE_ENV=production npx sequelize-cli db:migrate:undo`
- For full rollback: repeat the command or use `db:migrate:undo:all`.
- Always verify DB state after rollback.

## Forbidden Commands

- Never run migrations in production without `ALLOW_PROD_MIGRATION=true`.
- Never run destructive commands (e.g., `db:drop`) in production.
- Do not edit migration history manually.
