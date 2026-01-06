#!/usr/bin/env bash
set -euo pipefail

# =========================================
# SmartAccounting — Full Encrypted Backup
# =========================================

# -------- Configuration --------
BACKUP_DIR="${BACKUP_DIR:-./backups/full}"
DATABASE_URL="${DATABASE_URL:-}"
BACKUP_PASSPHRASE="${BACKUP_PASSPHRASE:-}"
OPENSSL_CIPHER="aes-256-cbc"

# -------- Helpers --------
fail() {
  echo "[BACKUP][ERROR] $1" >&2
  exit 1
}

require() {
  command -v "$1" >/dev/null 2>&1 || fail "Missing required command: $1"
}

# -------- Preconditions --------
[[ -z "$DATABASE_URL" ]] && fail "DATABASE_URL is required"
[[ -z "$BACKUP_PASSPHRASE" ]] && fail "BACKUP_PASSPHRASE is required"

require pg_dump
require gzip
require openssl
require sha256sum
require date

mkdir -p "$BACKUP_DIR"

# -------- Metadata --------
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
HOSTNAME="$(hostname)"
BACKUP_NAME="smartaccounting-full-${TIMESTAMP}"
BACKUP_FILE="${BACKUP_DIR}/${BACKUP_NAME}.sql.gz.enc"
META_FILE="${BACKUP_DIR}/${BACKUP_NAME}.meta.json"

echo "[BACKUP] Starting full backup"
echo "[BACKUP] Target file: $BACKUP_FILE"

# -------- Backup Pipeline --------
pg_dump "$DATABASE_URL" \
  --format=plain \
  --no-owner \
  --no-privileges \
  --single-transaction \
  | gzip -9 \
  | openssl enc -"${OPENSSL_CIPHER}" -salt -pbkdf2 -iter 100000 \
      -pass pass:"${BACKUP_PASSPHRASE}" \
  > "$BACKUP_FILE"

# -------- Validation --------
[[ ! -s "$BACKUP_FILE" ]] && fail "Backup file is empty or missing"

CHECKSUM="$(sha256sum "$BACKUP_FILE" | awk '{print $1}')"
FILE_SIZE="$(stat -c%s "$BACKUP_FILE" 2>/dev/null || stat -f%z "$BACKUP_FILE")"

# -------- Metadata --------
cat > "$META_FILE" <<EOF
{
  "backup": "${BACKUP_NAME}",
  "created_at_utc": "${TIMESTAMP}",
  "host": "${HOSTNAME}",
  "cipher": "${OPENSSL_CIPHER}",
  "checksum_sha256": "${CHECKSUM}",
  "file_size_bytes": ${FILE_SIZE},
  "database_url_redacted": "$(echo "$DATABASE_URL" | sed 's#//.*@#//***@#')",
  "type": "full-logical-backup"
}
EOF

echo "[BACKUP] Backup completed successfully"
echo "[BACKUP] Size: ${FILE_SIZE} bytes"
echo "[BACKUP] SHA256: ${CHECKSUM}"
echo "[BACKUP] Metadata: $META_FILE"
