## Developer Runbook

### Local Development

- Backend: `npm run dev` (http://localhost:5000)
- Frontend: `cd client && npm run dev` (http://localhost:3000)
- API base: `/api`
- Health: `GET http://localhost:5000/health`

### Docker Local (Pre-Production)

- Start: `docker compose up --build`
- Backend: http://localhost:5001 (host) → 5000 (container)
- Frontend: http://localhost:3000
- API base: `/api`
- Health: `GET http://localhost:5001/health`
- DB: Postgres (forced by USE_SQLITE=false and DATABASE_URL in compose)

### Docker Test

- Start: `docker compose -f docker-compose.test.yml up --build`
- No host ports exposed
- Backend: internal only (5000)
- DB: Postgres (test DB, isolated)
- Health (inside container): `docker compose -f docker-compose.test.yml exec -T backend curl -fsS http://localhost:5000/health`

### Validation

- Backend health: `curl -fsS http://localhost:5001/health` (docker local)
- Frontend loads: open http://localhost:3000
- API: `curl http://localhost:5001/api/any-endpoint`
- DB: check logs or connect to Postgres container
- Tests: see output from `docker compose -f docker-compose.test.yml up --build`
