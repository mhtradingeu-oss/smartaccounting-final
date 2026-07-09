# P1 Source of Truth & Architecture Map — SmartAccounting

Date: 2026-07-09  
Status: P1 scan completed. Architecture documentation lock before P2.

## 1. Purpose

This document locks the current SmartAccounting architecture source of truth after P1.

It prevents random edits, duplicated runtime paths, legacy entrypoint confusion, AI/voice duplication, frontend/backend route drift, and feature work before architecture truth is understood.

No feature work should bypass this document.

---

## 2. Official daily runtime

Official daily runtime commands:

- `npm run start:all`
- `npm run stop:all`

Runtime is managed through:

- `scripts/start-all.sh`
- `scripts/stop-all.sh`
- `docker-compose.yml`

Official runtime model:

- Frontend: Vite via `scripts/start-all.sh`
- Backend: Docker Compose backend service
- Database: Docker Compose Postgres service
- Redis: Docker Compose Redis service

Confirmed local ports:

- Frontend: `5173`
- Backend: `5001`
- Postgres: `5441`
- Redis: `6381`

Reference:

- `docs/ARCHITECTURE_LOCK/RUNTIME_SOURCE_OF_TRUTH.md`

---

## 3. Forbidden daily runtime commands

These commands must not be used as the normal daily runtime:

- `node server/index.js`
- `node src/server.js`
- `cd client && npm run dev`

They are development/debug-only unless a future architecture phase explicitly reclassifies them.

---

## 4. Backend source of truth

The active backend source is under:

- `src/`

Important active backend areas:

- `src/app.js`
- `src/server.js`
- `src/routes/`
- `src/services/`
- `src/models/`
- `src/middleware/`
- `src/security/`

P1 warning:

- `Dockerfile` currently contains `CMD ["node", "server/index.js"]`.
- Existing architecture lock says `server/index.js` is not the daily runtime source of truth.
- Runtime evidence indicates Docker Compose may override the Dockerfile command for development.

Decision:

- Do not change this blindly.
- Resolve Dockerfile vs Docker Compose command truth in a dedicated Runtime / DevOps checkpoint.

---

## 5. Environment source of truth

Daily runtime environment source:

- `docker-compose.yml`

Local CLI environment source:

- `.env`

Legacy/debug only:

- `server/.env`

Frontend environment:

- `client/.env`
- `client/.env.local`

Rules:

- `USE_SQLITE=false` for normal development runtime.
- SQLite is allowed only for tests that explicitly set `USE_SQLITE=true`.
- Frontend API base must stay `/api`.
- Browser env must not use Docker service names.
- `VITE_WS_URL` remains disabled until realtime backend is officially implemented.

Reference:

- `docs/ARCHITECTURE_LOCK/ENVIRONMENT_SOURCE_OF_TRUTH.md`

---

## 6. Frontend source of truth

Active frontend source is under:

- `client/src/`

Important active frontend areas:

- `client/src/main.jsx`
- `client/src/App.jsx`
- `client/src/AppRoutes.jsx`
- `client/src/pages/`
- `client/src/components/`
- `client/src/services/`
- `client/src/context/`
- `client/src/navigation/`

Frontend API rule:

- Frontend calls `/api`.
- Vite proxies `/api` to the backend.
- No page should invent backend URLs directly.

---

## 7. Legacy / not source of truth

These paths are not official daily runtime source of truth:

- `server/index.js`
- `server/src/app.js`
- `server/src/modules/voice/*`
- `server/src/modules/ai-brain/*`

They must not be used to build new production logic unless a future truth scan explicitly reclassifies them.

---

## 8. AI source of truth

Official AI source:

- `src/services/ai/`

Official AI orchestrator path:

- `src/services/ai/orchestrator/`

AI flow must be:

1. Frontend / Voice / Automation
2. AI Orchestrator
3. AI services
4. Governance / validation
5. Safe approval / execution path
6. Database
7. Audit log

Forbidden:

- duplicate AI brain
- direct AI execution from frontend
- direct AI execution from voice
- direct accounting mutation without governance and approval
- bypassing audit/idempotency rules

---

## 9. Voice source of truth

Official voice route:

- `/api/ai/voice/assistant`

Official mounting path:

- `src/routes/ai/index.js`
- `src/routes/ai/voice.js`

Voice is input-only.

Allowed:

- transcribe
- normalize text
- forward request
- return safe assistant answer
- optional TTS only when explicitly enabled

Forbidden:

- accounting execution inside voice layer
- old voice intent engine
- old safe pipeline
- duplicate AI brain

References:

- `docs/ARCHITECTURE_LOCK/VOICE_SOURCE_OF_TRUTH.md`
- `docs/ARCHITECTURE_LOCK/VOICE_RULES.md`
- `docs/ARCHITECTURE_LOCK/VOICE_ENFORCEMENT.md`

---

## 10. Route / security truth

P1 confirmed that route and security mapping requires a dedicated P2 phase.

Known P1 rule:

- Do not add or expose routes before P2 Security / Auth / Company / Role audit.

P2 must verify:

- public vs protected routes
- auth middleware
- company scoping
- role permissions
- feature flags
- system admin boundaries
- AI purpose headers
- route guard consistency

Known warning:

- Some frontend feature-flagged pages may still have direct route definitions even when hidden in navigation. This must be verified in P2/P12.

---

## 11. Accounting source of truth

Accounting logic lives under active backend services/routes/models, especially:

- `src/services/`
- `src/routes/`
- `src/models/`

Accounting core must be certified in P3 before any high-risk AI execution.

P3 must verify:

- chart of accounts
- journal entries
- journal entry lines
- posting preview
- final posting
- reversal
- posted immutability
- invoice posting
- expense posting
- VAT logic
- audit log coverage

No AI execution may bypass P3.

---

## 12. DATEV / German tax truth

Direct ELSTER / official German tax submission remains disabled unless a future official integration phase is approved.

Allowed now:

- preparation
- readiness checks
- export
- warnings
- Steuerberater package

Forbidden now:

- direct ELSTER submission
- official tax transmission
- pretending preparation output is official filing

Relevant docs:

- `docs/DATEV_EXPORT_DESIGN.md`
- `docs/ELSTER_DESIGN_AND_LIMITATIONS.md`
- `docs/DATEV_ELSTER_OFFICIAL_LIMITATIONS.md`
- `docs/GUARDS/ENGINEERING_SAFETY_GUARD.md`

---

## 13. Event / queue / observability truth

Enterprise event, replay, graph, observability, DLQ, queue, and timeline foundations exist, but must not drive production decisions until their contract is consolidated.

P11 must verify:

- canonical event contract
- event store
- audit timeline
- correlationId
- causationId
- DLQ
- worker bootstrap
- idempotency lifecycle
- observability dashboard integration

Known warning:

- Do not activate or extend event graph behavior before canonical event contract review.

---

## 14. Known P1 warnings

### WARN-1 — Dockerfile / entrypoint conflict

`Dockerfile` references `server/index.js`, while the architecture lock marks it as non-daily-runtime / legacy-debug only.

Phase: Runtime / DevOps checkpoint.

### WARN-2 — Production healthcheck path

Production healthcheck may reference `/health`, while current backend health is expected around `/api/health` or docs readiness.

Phase: Runtime / DevOps checkpoint.

### WARN-3 — Extra local ports

P0 showed additional local ports such as `3000`, `5000`, and local Redis `6379`.

Phase: Runtime environment cleanup / developer machine hygiene.

### WARN-4 — Authenticated endpoint smoke

Enterprise endpoints returned `401 AUTH_MISSING` without token, which is good for protection, but authenticated smoke still needs a dedicated check.

Phase: P2 / Security runtime validation.

### WARN-5 — Route guard consistency

Route security must be mapped before adding new routes or exposing new pages.

Phase: P2.

### WARN-6 — Timeline persistence / worker bootstrap / mock execution

These must be handled in their own phases, not during P1.

Phase: P10 / P11.

---

## 15. Current quality baseline after P1

As of the P1 scan:

- `npm run lint -- --quiet`: PASS
- Backend app require inside Docker: PASS
- Git status: clean

Latest known P0 cleanup commit:

- `3419cb7 fix: clean enterprise replay lint`

---

## 16. Next allowed phase

After this document is committed, the next allowed phase is:

- P2 — Security / Auth / Company / Role Route Guard Audit

P2 is scan-first.

No product feature work, frontend expansion, AI execution, event activation, or accounting mutation work may start before P2 truth scan.

---

## 17. Engineering rule

Before changing any part of the system:

1. Scan truth first.
2. Read relevant files.
3. Avoid duplicate logic.
4. Patch narrowly.
5. Validate syntax/lint/runtime.
6. Stage explicitly.
7. Commit separately.
8. Push.
9. Keep repo clean.

Never use:

- `git add .`
