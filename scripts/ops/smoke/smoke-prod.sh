#!/usr/bin/env bash
set -euo pipefail

SMOKE_BASE_URL="${1:-http://localhost:3000}"
SMOKE_TIMEOUT="${SMOKE_TIMEOUT:-5}"
TMPFILE="$(mktemp -t smoke.XXXXXX)"

trap 'rm -f "${TMPFILE}"' EXIT

ENDPOINTS=(
  "/health"
  "/api/health"
  "/api/auth/health"
)

echo "Running smoke checks against ${SMOKE_BASE_URL}"

for endpoint in "${ENDPOINTS[@]}"; do
  url="${SMOKE_BASE_URL%/}${endpoint}"
  echo "Checking ${url}"
  http_code="$(curl --silent --show-error --max-time "${SMOKE_TIMEOUT}" --write-out '%{http_code}' --output "${TMPFILE}" "${url}")"
  curl_exit=$?

  if [[ "${curl_exit}" -ne 0 ]]; then
    echo "Failed to reach ${url} (curl exit code ${curl_exit})" >&2
    cat "${TMPFILE}" >&2
    exit 1
  fi

  if [[ "${http_code}" -lt 200 ]] || [[ "${http_code}" -ge 400 ]]; then
    echo "Unexpected response from ${url}: HTTP ${http_code}" >&2
    cat "${TMPFILE}" >&2
    exit 1
  fi
done

echo "Smoke checks passed for ${SMOKE_BASE_URL}"
