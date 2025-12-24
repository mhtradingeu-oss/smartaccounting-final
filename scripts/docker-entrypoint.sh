#!/usr/bin/env bash
set -euo pipefail

ENVIRONMENT="${NODE_ENV:-development}"
if [[ "${ENVIRONMENT}" == "production" ]] && [[ "${ALLOW_PROD_MIGRATIONS:-false}" != "true" ]]; then
  echo "ALLOW_PROD_MIGRATIONS must be true to execute production migrations" >&2
  exit 1
fi

echo "Starting SmartAccounting backend: running database migrations..."
npm run db:migrate

echo "Migrations completed, launching application."
exec node index.js
