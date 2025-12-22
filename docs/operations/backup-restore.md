# Backup & Restore Strategy

## Overview
- Full logical backups run via `scripts/ops/backup/full-backup.sh`, producing AES-256 encrypted `sql.gz.enc` artifacts in `backups/full`.
- Incremental durability is provided by streaming WAL segments with `scripts/ops/backup/incremental-wal.sh`, which writes to `backups/wal`. A replication slot (default `smartaccounting_slot`) keeps the WAL archive continuous.
- All backups are immutable and encrypted at rest; the passphrase is never stored with the artifact and must be supplied via `BACKUP_PASSPHRASE` when running scripts.

## Scripts
| Task | Script | Notes |
| --- | --- | --- |
| Full encrypted dump | `scripts/ops/backup/full-backup.sh` | Requires `DATABASE_URL` and `BACKUP_PASSPHRASE`; output is gzipped then encrypted. |
| WAL shipping | `scripts/ops/backup/incremental-wal.sh` | Stream WAL segments to disk; optionally set `CREATE_WAL_SLOT=true` on the first run. |
| Full restore | `scripts/ops/restore/full-restore.sh` | Provide `<encrypted-backup-file>` and `BACKUP_PASSPHRASE`; streams directly into `psql`. |
| Point-in-time prep | `scripts/ops/restore/point-in-time.sh` | Extracts a base backup tarball and configures recovery metadata pointing at `backups/wal`. |
| Restore verification | `scripts/ops/verify/verify-restore.js` | Validates row counts and `AuditLog` hash chain after restore or recovery exercises.

## Restore procedures
1. **Full restore:** Stand up a clean Postgres instance, then run `scripts/ops/restore/full-restore.sh path/to/smartaccounting-full-*.sql.gz.enc`. Monitor the stream and confirm it exits without errors.
2. **Point-in-time:** Produce a base backup (e.g., `pg_basebackup -D /tmp/base -F tar`). Pass that tarball to `scripts/ops/restore/point-in-time.sh <tarball> <target-UTC-timestamp>`, then start Postgres against the extracted directory to let WAL replay up to the requested time.
3. **Verification:** After both restores, run `node scripts/ops/verify/verify-restore.js`. A non-zero exit code indicates hash chain or count mismatches and must block promotion.

## Encryption at rest
- The full backup script runs `openssl enc -aes-256-cbc -salt` so that backups at rest remain confidential.
- Rotate `BACKUP_PASSPHRASE` whenever staff leave or key material is compromised and re-encrypt historical copies if necessary.
- Keep encrypted pieces in a separate, access-controlled storage bucket (S3, secure NAS, etc.).

## Point-in-time recovery
- WAL streaming keeps the RPO low. When you need to jump to a specific moment, replay the WAL files with `restore_command = 'cp "$WAL_ARCHIVE_DIR/%f" "%p"'` and configure `recovery_target_time` (the template script sets it for you).
- Always check the `buildMetadata.commitHash` in `/api/system/version` after the recovery to ensure the backend that attaches to the restored database matches the approved release.

## Verification checklist
- [ ] Exported backups are encrypted (`scripts/ops/backup/full-backup.sh` succeeds).<br>
- [ ] WAL archive includes segments for the targeted window (`backups/wal`).<br>
- [ ] Restore completes to a staging database using `scripts/ops/restore/full-restore.sh` without errors.<br>
- [ ] Point-in-time exercises use `scripts/ops/restore/point-in-time.sh` and contain a `recovery.signal` file before promotion.<br>
- [ ] `node scripts/ops/verify/verify-restore.js` returns `0` and reports valid hash chains.<br>
- [ ] Audit use of backups in incident logs for traceability.

## Failure simulation (non-destructive)
1. Run `scripts/ops/backup/full-backup.sh` against a staging database and copy the artifact to a temporary folder.
2. Stand up a disposable Postgres container (e.g., `docker run -e POSTGRES_PASSWORD=pass -d postgres:15`), set `RESTORE_DATABASE_URL`, and run `scripts/ops/restore/full-restore.sh` to populate it.
3. Verify the hash chain with `node scripts/ops/verify/verify-restore.js` and confirm that `AuditLogService.validateChain()` is still `true`.
4. Tear down the disposable container—do not reroute production traffic during this rehearsal.
5. Document the simulation result in the incident log and refresh the RPO/RTO table in `docs/DR.md` if timings changed.
