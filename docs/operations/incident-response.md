# Incident Response Playbook

## Purpose
Describe detected incidents (data exfiltration, service outage, suspicious API calls) and take actions that preserve audit trails.

## Initial triage
1. Capture the alert context (logs, dashboards, Sentry link). Do not restart services before gathering evidence.
2. Identify impacted services: backend, database, AI guard rails, etc. Document the scope in the incident channel.
3. Set the severity and notify stakeholders (Release Engineer, Compliance Lead, Legal).

## Containment and recovery steps
- Toggle maintenance mode if necessary by stopping traffic at the load balancer or `docker compose stop backend` while keeping the database readable.
- Run `docker compose logs backend --since 1m` and `kubectl logs <pod> --tail=200` (if applicable) to capture actionable errors.
- If the database is affected, do **not** mutate it—work on a restored copy from the latest backup (`scripts/ops/restore/full-restore.sh`) and run verifications (`node scripts/ops/verify/verify-restore.js`).
- Rotate secrets (JWT, database credentials) immediately after containment and before any redeploy.
- Rebuild and redeploy the immutable Docker image using the release tag referenced in `docs/versioning-strategy.md`.

## Communication & documentation
- Update the incident log with timelines, responsible owners, commands executed, and backup/restore artifacts (timestamp + file path).
- Notify auditors about any data exposure or backup use, referencing `docs/DR.md` if the database was recovered.
- Close the incident only after all checks pass and `/api/system/version` reports the approved release metadata.

## Command cheat-sheet
```bash
# Inspect service health
docker ps
docker compose logs backend --tail 200
# Rebuild the immutable image
docker build --build-arg BUILD_COMMIT_SHA=$(git rev-parse --short HEAD) -t smartaccounting:prod .
# Restore data into a disposable database
BACKUP_PASSPHRASE=secret node scripts/ops/verify/verify-restore.js
# Fetch latest audit export for investigators
curl -H "Authorization: Bearer $TOKEN" -G "http://localhost:5000/api/exports/audit-logs" --data-urlencode "format=json" | jq .
```
