#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "$ROOT_DIR"

REQUIRED_ENV=(NODE_ENV DATABASE_URL JWT_SECRET FRONTEND_URL CLIENT_URL CORS_ORIGIN BACKUP_PASSPHRASE ALLOW_PROD_MIGRATIONS)
MISSING_ENV=()
for VAR in "${REQUIRED_ENV[@]}"; do
  if [[ -z "${!VAR:-}" ]]; then
    MISSING_ENV+=("$VAR")
  fi
done

if [[ ${#MISSING_ENV[@]} -gt 0 ]]; then
  echo "Missing required environment variables: ${MISSING_ENV[*]}" >&2
  exit 1
fi

if [[ "${NODE_ENV}" != "production" ]]; then
  echo "NODE_ENV must be set to production for the preflight" >&2
  exit 1
fi

if [[ "${ALLOW_PROD_MIGRATIONS}" != "true" ]]; then
  echo "ALLOW_PROD_MIGRATIONS must be true to run migrations in production" >&2
  exit 1
fi

BACKUP_DIR="${BACKUP_DIR:-./backups/full}"
WAL_ARCHIVE_DIR="${WAL_ARCHIVE_DIR:-./backups/wal}"

check_directory() {
  local DIR="$1"
  mkdir -p "$DIR"
  if [[ ! -w "$DIR" ]]; then
    echo "Directory $DIR is not writable" >&2
    exit 1
  fi
}

check_directory "$BACKUP_DIR"
check_directory "$WAL_ARCHIVE_DIR"

echo "Production preflight environment variables and backup paths are valid"

echo "Validating database connectivity..."
node - <<'NODE'
const { sequelize } = require('./src/models');
(async () => {
  try {
    await sequelize.authenticate();
    console.log('Database authenticated');
    process.exit(0);
  } catch (error) {
    console.error('Database connectivity failed:', error.message);
    process.exit(1);
  }
})();
NODE

echo "Preflight checks passed"
