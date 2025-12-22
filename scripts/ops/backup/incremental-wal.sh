#!/usr/bin/env bash
set -euo pipefail

WAL_ARCHIVE_DIR=${WAL_ARCHIVE_DIR:-./backups/wal}
REPLICATION_URL=${REPLICATION_DATABASE_URL:-${DATABASE_URL:-}}
WAL_SLOT_NAME=${WAL_SLOT_NAME:-smartaccounting_slot}
CREATE_SLOT=${CREATE_WAL_SLOT:-false}

if [[ -z "$REPLICATION_URL" ]]; then
  echo "REPLICATION_DATABASE_URL or DATABASE_URL must be set" >&2
  exit 1
fi

if ! command -v pg_receivewal >/dev/null 2>&1; then
  echo "pg_receivewal command is required" >&2
  exit 1
fi

mkdir -p "$WAL_ARCHIVE_DIR"
CMD=(pg_receivewal --dbname "$REPLICATION_URL" --slot "$WAL_SLOT_NAME" --directory "$WAL_ARCHIVE_DIR" --status-interval 30 --verbose)
if [[ "$CREATE_SLOT" == "true" ]]; then
  CMD+=(--create-slot)
fi

echo "Starting WAL shipping to $WAL_ARCHIVE_DIR (slot: $WAL_SLOT_NAME)"
"${CMD[@]}"
