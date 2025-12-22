# Disaster Recovery (DR)

## RPO / RTO assumptions
- **Recovery Point Objective (RPO):** 15 minutes. WAL shipping (see `scripts/ops/backup/incremental-wal.sh`) captures all transactions between full backups.
- **Recovery Time Objective (RTO):** 30 minutes after a full-encrypted backup is available. Restore scripts stream the dump, replay WAL, and then run the verification checklist.
- Full backups run nightly (or on-demand) via `scripts/ops/backup/full-backup.sh`; incremental WAL collectors keep data that lands after the last dump.

## Scenario playbooks
### Database loss
1. Provision a new Postgres instance and set `RESTORE_DATABASE_URL` to point at it.
2. Copy the latest encrypted file (`backups/full/…sql.gz.enc`).
3. Run `scripts/ops/restore/full-restore.sh <backup-file>` to stream it into the empty cluster.
4. Replay WALs, using `scripts/ops/restore/point-in-time.sh` if restoring to a specific timestamp.
5. Run `node scripts/ops/verify/verify-restore.js` to confirm counts and audit hash chain.
6. Redirect the backend to the recovered database once tests pass.

### Audit log corruption
1. Run `AuditLogService.validateChain()` (via `node scripts/ops/verify/verify-restore.js`) to confirm tampering.
2. If corruption is confirmed, identify the last known good backup and restore only the `audit_logs` table from it using the same restore script but adding `pg_restore --table=audit_logs` if you have a logical dump.
3. Re-attach users/companies after the audit log is reconstituted and re-run the hash check.
4. Record remediation steps in the incident log before marking issue resolved.

### App server compromise
1. Take the server offline (`docker compose down` / `systemctl stop smartaccounting`) and rotate all secrets issuing new JWT and database credentials.
2. Build a new image via `docker build --build-arg BUILD_COMMIT_SHA=$(git rev-parse --short HEAD) …` and redeploy using the immutability digest noted in `docs/docker-immutability.md`.
3. Validate the `GET /api/system/version` endpoint (new metadata) to confirm that the redeployed binary is from the clean image that matches the expected digest.
4. Re-enable traffic once audit checks and secrets rotation complete.

### Immutable log recovery
1. Use the latest encrypted backup and WAL archive to reconstruct the `audit_logs` table in an isolated environment.
2. Run `node scripts/ops/verify/verify-restore.js` to ensure `AuditLogService.validateChain()` returns `true` before importing any data.
3. If a broken log segment exists, do not edit it; instead, replay only the unaffected tail and start a new append-only sequence with a new `hash` (document the split for auditors).

## What we can / cannot recover
| Item | Recoverable? | Notes |
| --- | --- | --- |
| Postgres database snapshot | ✅ | Latest full dump plus WAL archive can rebuild all schema and rows. |
| Point-in-time transactions | ✅ | WAL folders preserved by incremental script allow replay to a timestamp (see `point-in-time.sh`). |
| Audit hash chain | ✅ | Hash chain validated by `scripts/ops/verify/verify-restore.js`; corrupted segments require replaying from the last known good log.
| Application server state | ✅ | Rebuild from the tagged Docker image and redeploy; config secrets come from vault.
| Encrypted backups | ✅ | Stored with AES-256 via `full-backup.sh`; rotate the passphrase and limit access to backups.
| Real-time CPU/memory state | ❌ | Not recorded; restart from scratch.
| Data written after the last WAL file | ❌ | Can only recover up to the latest WAL shipped; any unarchived transaction is lost.

## Failover verification checklist
- [ ] Latest full backup file exists in `backups/full` and was encrypted with the current passphrase.
- [ ] WAL archive directory (`backups/wal`) contains segments that cover the time between backups.
- [ ] `scripts/ops/restore/full-restore.sh` runs cleanly and restores data to a temporary database.
- [ ] `scripts/ops/verify/verify-restore.js` reports valid audit hashes and expected row counts.
- [ ] New database credentials and JWT secrets are rotated immediately after validation.
- [ ] Incident response log references the backup/restore job IDs for audit.
