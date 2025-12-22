# Emergency Shutdown & Maintenance Mode

## When to trigger
- Critical compliance incident (audit log corruption, data breach).
- P0 downtime where continuing to accept data would break GoBD traceability.

## Process
1. Notify stakeholders and escalate to the Release Engineer on call.
2. Put the system into maintenance mode by stopping traffic at the load balancer and setting `MAINTENANCE=true` in the environment (or by starting the backend with a guard flag).
3. Flush any in-flight jobs; do not accept new write requests while the maintenance flag is active.
4. Run diagnostics (`/api/system/health`, `/api/system/version`, `docker compose logs`) to capture the snapshot before further action.
5. If data is suspect, restore from backups in a disposable environment and validate hash chains before pointing production traffic back.
6. Announce the restart window, test the system with health/readiness endpoints, and reopen traffic only when the system is stable.

## Command references
```bash
# Silence the application in Docker
docker compose stop backend

# Or drop traffic from Kubernetes
kubectl scale deployment smartaccounting --replicas=0 -n production

# Rediscover health information
curl http://localhost:5000/api/system/health
curl http://localhost:5000/api/system/version

# After repair, bring the backend back
docker compose up -d backend
# or
kubectl scale deployment smartaccounting --replicas=2 -n production
```

## Checklist before exit
- [ ] Maintenance mode is logged with start/end timestamps.
- [ ] Backups/restores are verified during the window (see `docs/operations/backup-restore.md`).
- [ ] `/api/system/version` reports the approved commit hash and image digest.
- [ ] All audit exports for the window are archived and tagged for later review.
