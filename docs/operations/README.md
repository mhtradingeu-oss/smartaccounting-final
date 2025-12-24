# Operations Playbooks

This directory collects the operational runbooks required for Phase 6.

## Smoke Tests
`scripts/ops/smoke/smoke-prod.sh` exercises `/health`, `/api/health`, and `/api/auth/health` and exits non-zero if any endpoint fails; pass a custom base URL as the first argument (default `http://localhost:3000`) or set `SMOKE_TIMEOUT` for a longer network window.

- **Important runtime behavior:** the backend container executes `scripts/docker-entrypoint.sh`, which runs `npm run db:migrate` before `node index.js`. If migrations fail the container exits, so deployments fail fast and require an updated schema entry.

- `incident-response.md`: Steps for handling and containing incidents with audit-grade evidence.
- `release.md`: Phase 9 release engineering runbook with preflight, deploy, post-deploy, and rollback guidance tied to the new gating scripts and metadata endpoint.
- `log-inspection.md`: Commands and procedures for inspecting logs while staying compliant.
- `audit-request-handling.md`: How to respond to auditors with exports that respect GoBD.
- `gdpr-request-handling.md`: GDPR response process with export hooks.
- `emergency-maintenance.md`: Emergency shutdown and maintenance-mode choreography.
- `backup-restore.md`: Backup, restore, and verification strategy plus failure simulation.
- `export-goBD.md`: Mapping export endpoints to GoBD requirements.
