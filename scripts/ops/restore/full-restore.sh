#!/usr/bin/env bash
set -euo pipefail

# =========================================
# SmartAccounting — Full Restore (Encrypted)
# =========================================

# -------- Arguments --------
if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <backup-file.sql.gz.enc>" >&2
  exit 1
fi

BACKUP_FILE="$1"

# -------- Environment --------
RESTORE_DATABASE_URL="${RESTORE_DATABASE_URL:-${DATABASE_URL:-}}"
BACKUP_PASSPHRASE="${BACKUP_PASSPHRASE:-}"
CONFIRM_RESTORE="${CONFIRM_RESTORE:-false}"

# -------- Helpers --------
fail() {
  echo "[RESTORE][ERROR] $1" >&2
  exit 1
}

log() {
  echo "[RESTORE][$(date -u +"%Y-%m-%d %H:%M:%S UTC")] $1"
}

require() {
  command -v "$1" >/dev/null 2>&1 || fail "Missing required command: $1"
}

# -------- Preconditions --------
[[ ! -f "$BACKUP_FILE" ]] && fail "Backup file not found: $BACKUP_FILE"
[[ -z "$RESTORE_DATABASE_URL" ]] && fail "RESTORE_DATABASE_URL or DATABASE_URL must be set"
[[ -z "$BACKUP_PASSPHRASE" ]] && fail "BACKUP_PASSPHRASE is required"

require psql
require gzip
require openssl

# -------- Safety barrier --------
log "Target database:"
log "  $RESTORE_DATABASE_URL"

if [[ "$CONFIRM_RESTORE" != "true" ]]; then
  fail "Refusing to restore without CONFIRM_RESTORE=true"
fi

# -------- Connectivity check --------
log "Checking database connectivity"
psql "$RESTORE_DATABASE_URL" -Atqc "SELECT 1;" >/dev/null \
  || fail "Unable to connect to target database"

# -------- Restore --------
log "Starting restore from $BACKUP_FILE"
log "Decrypt → Decompress → Restore (streaming)"

openssl enc -aes-256-cbc -d -salt \
  -pass pass:"$BACKUP_PASSPHRASE" \
  -in "$BACKUP_FILE" \
| gzip -dc \
| psql "$RESTORE_DATABASE_URL"

log "Restore completed successfully"
