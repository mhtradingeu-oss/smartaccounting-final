# DEPLOYMENT_CHECKLIST (Pre/Post Deploy)

## Pre-Deployment

- [ ] Confirm all required environment variables are set (see PRODUCTION_READINESS.md)
- [ ] Run `npm test` (root) — all tests must pass
- [ ] Run `npm run lint --prefix client` — no lint errors
- [ ] Run `npm run test --prefix client` — all frontend tests must pass
- [ ] Run `npm run build --prefix client` — build must succeed
- [ ] Run DB migrations (see below)
- [ ] Confirm /health and /ready endpoints return healthy
- [ ] Confirm /version endpoint returns correct build info
- [ ] Confirm secrets are not exposed to client (see envGuards)
- [ ] Review logs for errors or warnings

## Deployment

- [ ] Deploy using orchestrator (CI/CD, Docker, or cloud platform)
- [ ] Monitor /health and /ready during rollout
- [ ] Monitor logs for errors

## Post-Deployment

- [ ] Confirm /health and /ready are healthy
- [ ] Confirm main user flows (login, list companies) work
- [ ] Confirm metrics and logs are being collected
- [ ] Confirm backups are running and recent
- [ ] Document any incidents or issues

## Database Migration Safety

- [ ] Run DB migration command: `npm run migrate` or documented script
- [ ] Migration must be idempotent and safe to re-run
- [ ] If migration fails, rollback deployment and restore DB from backup

## Backup/Restore Drill

- [ ] Take a DB snapshot before deploy (see RUNBOOK.md)
- [ ] Test restore procedure regularly

---

_This checklist is part of Phase 8: Production Readiness Audit._
