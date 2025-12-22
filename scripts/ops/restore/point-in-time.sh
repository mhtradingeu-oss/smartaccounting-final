#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 2 ]]; then
  echo "Usage: $0 <base-backup-tarball> <target-timestamp (UTC)>" >&2
  exit 1
fi

BASE_BACKUP=$1
TARGET_TIME=$2
WAL_ARCHIVE_DIR=${WAL_ARCHIVE_DIR:-./backups/wal}
RESTORE_DIR=${RESTORE_DIR:-./backups/pitr-restore}

if [[ ! -f "$BASE_BACKUP" ]]; then
  echo "Base backup archive is required: $BASE_BACKUP" >&2
  exit 1
fi

mkdir -p "$RESTORE_DIR"
rm -rf "$RESTORE_DIR"/*

echo "Extracting base backup into $RESTORE_DIR"
tar -xzf "$BASE_BACKUP" -C "$RESTORE_DIR"

echo "Preparing point-in-time recovery metadata"
cat <<CONF > "$RESTORE_DIR/postgresql.auto.conf"
restore_command = 'cp "$WAL_ARCHIVE_DIR/%f" "%p"'
recovery_target_time = '$TARGET_TIME'
recovery_target_action = 'promote'
CONF

touch "$RESTORE_DIR/recovery.signal"

echo "Recovery prepared. Start postgres pointing at $RESTORE_DIR to replay WAL up to $TARGET_TIME"
