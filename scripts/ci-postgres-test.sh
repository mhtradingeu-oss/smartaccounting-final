#!/usr/bin/env bash
set -u

COMPOSE_FILE="docker-compose.test.yml"

cleanup() {
  docker compose -f "$COMPOSE_FILE" down -v || true
}
trap cleanup EXIT

echo "[ci-postgres-test] starting docker services"
docker compose -f "$COMPOSE_FILE" up -d --build db backend

echo "[ci-postgres-test] waiting for postgres"
node scripts/wait-for-postgres.js "$COMPOSE_FILE" db

echo "[ci-postgres-test] allowing backend to settle"
sleep 5

echo "[ci-postgres-test] docker status"
docker compose -f "$COMPOSE_FILE" ps

BACKEND_STATUS="$(docker compose -f "$COMPOSE_FILE" ps --format json backend 2>/dev/null | node -e "let data=''; process.stdin.on('data', c => data += c); process.stdin.on('end', () => { try { const rows = data.trim().split(/\n+/).filter(Boolean).map(JSON.parse); console.log(rows[0]?.State || rows[0]?.Status || ''); } catch { console.log(''); } });")"

echo "[ci-postgres-test] backend status: ${BACKEND_STATUS}"

if ! printf '%s' "$BACKEND_STATUS" | grep -Eiq 'running|up'; then
  echo "[ci-postgres-test] backend is not running; dumping logs"
  docker compose -f "$COMPOSE_FILE" logs --tail=240 backend || true
  exit 1
fi

echo "[ci-postgres-test] running migrations and postgres compliance tests"
docker compose -f "$COMPOSE_FILE" exec -T backend sh -lc \
  "CI=true NODE_ENV=test USE_SQLITE=false npx sequelize-cli db:migrate && CI=true NODE_ENV=test USE_SQLITE=false npx jest --runInBand --ci tests/postgres/complianceConstraints.test.js"
