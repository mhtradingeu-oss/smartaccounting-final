# Environment Source of Truth — SmartAccounting

## Daily runtime

Daily runtime is Docker Compose via:

```bash
npm run start:all
npm run stop:all
Runtime environment source

For daily runtime, docker-compose.yml is the source of truth.

Local CLI environment

Root .env is for local CLI tools only and must point to Docker-exposed local ports:

Backend: localhost:5001
Postgres: localhost:5441
Redis: localhost:6381
Rules
USE_SQLITE=false for development runtime.
SQLite is allowed only for tests that explicitly set USE_SQLITE=true.
server/.env is legacy/debug only.
Frontend API base must stay /api.
VITE_WS_URL must remain disabled until realtime backend is officially implemented.
