#!/bin/sh
# Run migrations and smoke test with guaranteed same SQLite file and environment
set -e
rm -f .data/test.sqlite
export SQLITE_STORAGE=.data/test.sqlite
export NODE_ENV=test
export USE_SQLITE=true
npx sequelize-cli db:migrate --env test
node tests/user.create.smoke.js
