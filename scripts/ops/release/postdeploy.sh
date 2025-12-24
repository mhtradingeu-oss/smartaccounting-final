#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 https://app.example" >&2
  exit 1
fi

BASE_URL="${1%/}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SMOKE_SCRIPT="${SCRIPT_DIR}/../smoke/smoke-prod.sh"

echo "Running smoke checks via ${SMOKE_SCRIPT} against ${BASE_URL}"
"${SMOKE_SCRIPT}" "${BASE_URL}"

TMPFILE="$(mktemp -t postdeploy.XXXXXX)"
trap 'rm -f "${TMPFILE}"' EXIT

check_path() {
  local PATH_SUFFIX="$1"
  local LABEL="$2"
  local URL="${BASE_URL}${PATH_SUFFIX}"
  echo "Checking ${LABEL} (${URL})"
  HTTP_CODE="$(curl --silent --show-error --max-time 10 --write-out '%{http_code}' --output "${TMPFILE}" "${URL}")"
  if [[ "${HTTP_CODE}" -lt 200 || "${HTTP_CODE}" -ge 400 ]]; then
    echo "${LABEL} responded with HTTP ${HTTP_CODE}" >&2
    cat "${TMPFILE}" >&2
    exit 1
  fi
  echo "${LABEL} OK"
}

check_path "/health" "/health"
check_path "/ready" "/ready"
check_path "/api/system/version" "/api/system/version"

echo "Validating version metadata payload"
node - <<'NODE' "${TMPFILE}"
const fs = require('fs');
const path = process.argv[1];
const content = fs.readFileSync(path, 'utf8');
const payload = JSON.parse(content);
const metadata = payload.metadata || payload;
const required = ['version', 'gitSha', 'buildDate', 'environment'];
required.forEach((field) => {
  if (!metadata[field]) {
    throw new Error(`Missing ${field} in metadata payload`);
  }
});
console.log('Version metadata validated:', metadata.version, metadata.gitSha);
NODE

echo "Post-deploy verification complete"
