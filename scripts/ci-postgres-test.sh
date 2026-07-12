#!/usr/bin/env bash
set -euo pipefail

COMPOSE=(docker compose -p smartaccounting_test -f docker-compose.test.yml)

cleanup() {
  "${COMPOSE[@]}" down -v --remove-orphans || true
}
trap cleanup EXIT

echo "[ci-postgres-test] starting docker services"
"${COMPOSE[@]}" up -d --build db backend

echo "[ci-postgres-test] waiting for postgres"
for attempt in $(seq 1 30); do
  if "${COMPOSE[@]}" exec -T db pg_isready -U postgres -d smartaccounting_test >/dev/null 2>&1; then
    break
  fi

  if [[ "$attempt" -eq 30 ]]; then
    echo "[ci-postgres-test] postgres readiness failed"
    "${COMPOSE[@]}" logs --tail=240 db || true
    exit 1
  fi

  sleep 1
done

echo "[ci-postgres-test] allowing backend to settle"
sleep 5

echo "[ci-postgres-test] docker status"
"${COMPOSE[@]}" ps

BACKEND_STATUS="$("${COMPOSE[@]}" ps --format json backend 2>/dev/null | node -e "let data=''; process.stdin.on('data', c => data += c); process.stdin.on('end', () => { try { const rows = data.trim().split(/\n+/).filter(Boolean).map(JSON.parse); console.log(rows[0]?.State || rows[0]?.Status || ''); } catch { console.log(''); } });")"

echo "[ci-postgres-test] backend status: ${BACKEND_STATUS}"

if ! printf '%s' "$BACKEND_STATUS" | grep -Eiq 'running|up'; then
  echo "[ci-postgres-test] backend is not running; dumping logs"
  "${COMPOSE[@]}" logs --tail=240 backend || true
  exit 1
fi

echo "[ci-postgres-test] runtime identity preflight"
"${COMPOSE[@]}" exec -T backend sh -lc \
  "CI=true NODE_ENV=test USE_SQLITE=false node scripts/assert-test-database.js"

echo "[ci-postgres-test] running migrations and postgres compliance tests"
"${COMPOSE[@]}" exec -T backend sh -lc \
  "CI=true NODE_ENV=test USE_SQLITE=false npx sequelize-cli db:migrate && CI=true NODE_ENV=test USE_SQLITE=false npx jest --runInBand --ci tests/postgres/complianceConstraints.test.js"
