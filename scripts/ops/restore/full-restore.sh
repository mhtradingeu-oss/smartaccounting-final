#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <encrypted-backup-file>" >&2
  exit 1
fi

BACKUP_FILE=$1
RESTORE_DATABASE_URL=${RESTORE_DATABASE_URL:-${DATABASE_URL:-}}
BACKUP_PASSPHRASE=${BACKUP_PASSPHRASE:-}

if [[ ! -f "$BACKUP_FILE" ]]; then
  echo "Backup file not found: $BACKUP_FILE" >&2
  exit 1
fi

if [[ -z "$RESTORE_DATABASE_URL" ]]; then
  echo "RESTORE_DATABASE_URL or DATABASE_URL must be set" >&2
  exit 1
fi

if [[ -z "$BACKUP_PASSPHRASE" ]]; then
  echo "BACKUP_PASSPHRASE is required to decrypt" >&2
  exit 1
fi

echo "Restoring backup $BACKUP_FILE";
gzip -dc "$BACKUP_FILE" \|
  openssl enc -aes-256-cbc -d -salt -pass pass:"${BACKUP_PASSPHRASE}" \|
  psql "$RESTORE_DATABASE_URL"

echo "Restore stream completed"
