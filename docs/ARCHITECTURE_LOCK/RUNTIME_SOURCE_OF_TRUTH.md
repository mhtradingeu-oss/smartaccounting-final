# Runtime Source of Truth — SmartAccounting

## Official daily runtime

Use only:

```bash
npm run start:all
npm run stop:all
Official runtime model
Frontend: Vite via scripts/start-all.sh
Backend: Docker Compose backend service
Database: Docker Compose Postgres service
Redis: Docker Compose Redis service
Do not use for daily runtime
node server/index.js
node src/server.js
cd client && npm run dev

These commands are development/debug-only and must not be used as the normal system startup path.

Current confirmed ports
Frontend: 5173
Backend: 5001
Postgres: 5441
Redis: 6381
Rule

Before changing runtime, Docker, DB boot, or voice/AI boot logic, run a truth scan first.
