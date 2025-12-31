# RUNBOOK: Incident Playbooks & Rollback

## 1. API Health/Readiness Endpoints

### /health (Liveness)

- **Path:** `/health`
- **Method:** GET
- **Response:**
  ```json
  {
    "status": "ok",
    "environment": "production",
    "timestamp": "2025-12-31T12:00:00.000Z",
    "version": "1.2.3"
  }
  ```
- **Purpose:** Used by load balancers and uptime checks. No secrets exposed.

### /ready (Readiness)

- **Path:** `/ready`
- **Method:** GET
- **Response (healthy):**
  ```json
  {
    "status": "ready",
    "db": "connected",
    "timestamp": "2025-12-31T12:00:00.000Z"
  }
  ```
- **Response (unhealthy):**
  ```json
  {
    "status": "not-ready",
    "db": "disconnected",
    "error": "<error message>"
  }
  ```
- **Purpose:** Used by orchestrators to determine if the app can serve traffic. Checks DB connectivity. No secrets exposed.

### /version

- **Path:** `/api/system/version`
- **Method:** GET
- **Response:**
  ```json
  {
    "success": true,
    "metadata": {
      "packageVersion": "1.2.3",
      "commitHash": "abc1234",
      "buildTimestamp": "2025-12-31T12:00:00.000Z",
      "imageDigest": "sha256:...",
      "nodeVersion": "v18.18.0",
      "environment": "production"
    }
  }
  ```
- **Purpose:** Returns build metadata (git sha, build time, image digest). No secrets exposed.

## 2. Frontend: API Unavailable Handling

- The client uses a global error boundary and API error formatter.
- If the API is unavailable (network error or /health fails), a friendly error state is shown with a retry button.
- No sensitive data is shown to the user.

## 3. Rollback Playbook

- If a deployment causes /ready to fail (status: not-ready), immediately rollback to the previous stable release.
- Use orchestrator or deployment platform rollback tools (e.g., `kubectl rollout undo`, `docker service update --rollback`, or cloud provider rollback).
- After rollback, verify /health and /ready return healthy responses.

## 4. Incident Response

- If /health or /ready fail in production:
  1. Check logs for errors (DB, migrations, config).
  2. Confirm environment variables are correct.
  3. If DB is down, restore from latest backup (see backup/restore drill).
  4. If code bug, rollback and open incident ticket.

---

_This runbook is part of Phase 8: Production Readiness Audit._
