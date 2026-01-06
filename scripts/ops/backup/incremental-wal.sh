#!/usr/bin/env bash
set -euo pipefail

# =========================================
# SmartAccounting — WAL Archiving (pg_receivewal)
# =========================================

# -------- Configuration --------
WAL_ARCHIVE_DIR="${WAL_ARCHIVE_DIR:-./backups/wal}"
REPLICATION_URL="${REPLICATION_DATABASE_URL:-${DATABASE_URL:-}}"
WAL_SLOT_NAME="${WAL_SLOT_NAME:-smartaccounting_slot}"
CREATE_SLOT="${CREATE_WAL_SLOT:-false}"
STATUS_INTERVAL="${WAL_STATUS_INTERVAL:-30}"
PID_FILE="${WAL_ARCHIVE_DIR}/pg_receivewal.pid"
LOG_FILE="${WAL_ARCHIVE_DIR}/pg_receivewal.log"

# -------- Helpers --------
fail() {
  echo "[WAL][ERROR] $1" >&2
  exit 1
}

require() {
  command -v "$1" >/dev/null 2>&1 || fail "Missing required command: $1"
}

log() {
  echo "[WAL][$(date -u +"%Y-%m-%d %H:%M:%S UTC")] $1" | tee -a "$LOG_FILE"
}

# -------- Preconditions --------
[[ -z "$REPLICATION_URL" ]] && fail "REPLICATION_DATABASE_URL or DATABASE_URL must be set"

require pg_receivewal
require psql
require date

mkdir -p "$WAL_ARCHIVE_DIR"
touch "$LOG_FILE"

# -------- Prevent double-run --------
if [[ -f "$PID_FILE" ]] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
  fail "pg_receivewal already running (PID $(cat "$PID_FILE"))"
fi

echo $$ > "$PID_FILE"

cleanup() {
  log "Stopping WAL receiver"
  rm -f "$PID_FILE"
}
trap cleanup EXIT INT TERM

# -------- Environment validation --------
log "Checking replication readiness"

psql "$REPLICATION_URL" -Atqc "SHOW wal_level;" | grep -qE 'replica|logical' \
  || fail "wal_level must be replica or logical"

psql "$REPLICATION_URL" -Atqc "SHOW max_replication_slots;" | grep -q '[1-9]' \
  || fail "max_replication_slots must be >= 1"

# -------- Slot handling --------
if [[ "$CREATE_SLOT" == "true" ]]; then
  log "Ensuring replication slot exists: $WAL_SLOT_NAME"
  psql "$REPLICATION_URL" -Atqc \
    "SELECT 1 FROM pg_replication_slots WHERE slot_name='${WAL_SLOT_NAME}'" \
    | grep -q 1 || \
    psql "$REPLICATION_URL" -c \
    "SELECT pg_create_physical_replication_slot('${WAL_SLOT_NAME}');"
fi

# -------- Start WAL receiver --------
log "Starting WAL archiving"
log "Slot: $WAL_SLOT_NAME"
log "Directory: $WAL_ARCHIVE_DIR"

exec pg_receivewal \
  --dbname "$REPLICATION_URL" \
  --slot "$WAL_SLOT_NAME" \
  --directory "$WAL_ARCHIVE_DIR" \
  --status-interval "$STATUS_INTERVAL" \
  --verbose \
  >> "$LOG_FILE" 2>&1
