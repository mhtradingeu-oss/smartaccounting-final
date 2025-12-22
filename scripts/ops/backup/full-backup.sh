#!/usr/bin/env bash
set -euo pipefail

# Full logical backup using pg_dump, gzip compression, and AES-256 encryption.
BACKUP_DIR=${BACKUP_DIR:-./backups/full}
DATABASE_URL=${DATABASE_URL:-}
BACKUP_PASSPHRASE=${BACKUP_PASSPHRASE:-}

if [[ -z "$DATABASE_URL" ]]; then
  echo "DATABASE_URL is required" >&2
  exit 1
fi

if [[ -z "$BACKUP_PASSPHRASE" ]]; then
  echo "BACKUP_PASSPHRASE is required for encryption" >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR"
TIMESTAMP=$(date -u +%Y%m%dT%H%M%SZ)
BACKUP_FILE="$BACKUP_DIR/smartaccounting-full-${TIMESTAMP}.sql.gz.enc"

echo "Starting full backup to $BACKUP_FILE"
pg_dump "$DATABASE_URL" --format=plain --no-owner --no-privileges \
  | gzip \
  | openssl enc -aes-256-cbc -salt -pass pass:"${BACKUP_PASSPHRASE}" \
  > "$BACKUP_FILE"

echo "Backup completed: $BACKUP_FILE"
