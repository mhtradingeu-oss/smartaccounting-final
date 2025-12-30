# PHASE_1_ARCHITECTURE.md

## Architecture diagram

[Clients (web UI, CLI/demo scripts such as `scripts/demo-verify.js`)]  
  ↓ HTTP requests
[Entrypoint (`index.js` + `src/utils/validateEnv.js` load `.env`, enforce required vars)]  
  ↓
[Runtime orchestrator (`src/server.js` starts the Express app, handles graceful shutdown and signal traps)]  
  ↓
[Express app (`src/app.js` wires requestId/CORS/security middleware, swagger docs, health/metrics, route registration)]  
  ↓
[Route modules (`src/routes/*.js` and `src/routes/ai/*`) enforce RBAC, parse requests, and delegate to services)]  
  ↓
[Services (`src/services/*`, including AI, compliance, bank/import, OCR, tax engines) contain domain logic, file parsing, and aggregation)]  
  ↓
[Models (`src/models/index.js` + individual Sequelize units) via `src/lib/database/index.js` → Postgres/SQLite per `src/config/database.js` + `config/sequelize.js`)]

Cross-cutting layers: `src/middleware/*` (auth/policy, requestId, performance, secure upload), `src/lib/logger/*`, `validators`, `shared` utilities, operational `scripts/` (migrations, readiness, backups), and the `tests/` suites (models/routes/services/security/integration) that exercise each tier.

## Strengths

- **Layered HTTP flow:** `src/app.js` centralizes middleware, docs (`src/config/swagger.js`), and health checks before handing requests to well-named route files, delivering a predictable entry route for every API surface.  
- **Services backed by clear models:** Routes such as `src/routes/bankStatements.js` invoke domain services like `src/services/bankStatementService.js`, while Sequelize models under `src/models/` expose associations via `src/models/index.js`, so persistence logic is kept in one folder (models) and business rules sit next to the domain flows (services).  
- **Robust environment/config handling:** `index.js` + `src/utils/validateEnv.js` guard required variables, `src/config/database.js`/`config/sequelize.js` choose Postgres vs SQLite, and `Dockerfile` + `docker-compose.prod.yml` rely on `.env.prod` + health checks to keep deployments consistent.  
- **Operational scaffolding:** Scripts such as `scripts/verify-schema.js`, `scripts/check-migrations.js`, and the `scripts/ops/` suite provide runnable gates for migrations, backups, and readiness; tests mirror production layers through `tests/fixtures`, `tests/integration`, and route/service-specific files.  
- **Observability and security baked in:** Structured logging (`src/lib/logger`), security middleware (`src/middleware/security.*`), RBAC helpers, request timing (`src/lib/logger.requestLogger`), and `/health`, `/ready`, `/metrics` endpoints give teams visibility across the same runtime used in production.

## Weaknesses

- **Controller-service boundary sometimes blurred:** Certain routes (`src/routes/bankStatements.js` brings models like `BankStatement`/`BankTransaction` into the route layer) still handle transactions directly, which duplicates persistence concerns and bypasses service-level invariants.  
- **Monolithic service classes:** Core services such as `src/services/bankStatementService.js` currently mix CSV/MT940/CAMT parsing, file I/O, transaction creation, summary assembly, and transactional fencing within one class, making it harder to unit-test, mock, or scale individual responsibilities.  
- **Limited background processing strategy:** Synchronous file parsing and business rules run inside HTTP request handlers (e.g., bank imports, AI insight generation) without a job queue or worker layer, meaning CPU-bound work blocks the Node event loop and risks timeouts under higher concurrency.  
- **Configuration is environment-variable heavy with limited separation:** Every module loads `dotenv` (entry scripts plus `src/config/database.js`), so setups with multiple entry points must reapply the same overrides; there is no explicit config caching or typed schema beyond `validateEnv`, increasing the chance of drift between env files and runtime expectations.

## Required refactors

- **Push persistence/transactions entirely into services:** Refactor routes to stop touching Sequelize models directly (e.g., move `BankStatement`/`BankTransaction` read/update logic from `src/routes/bankStatements.js` into `bankStatementService`) so higher-level guards cannot sidestep auditing/audit logging.  
- **Split heavy services into submodules:** Extract file parsing, transaction matching, and summary reporting from `src/services/bankStatementService.js` (and similar combo services) into dedicated helpers or processor classes; this will simplify testing and open the door to reusing the same processors from job workers.  
- **Introduce an asynchronous job/work queue for CPU-heavy work:** Build a queue/event layer (even a simple in-memory queue behind a singleton) to decouple imports, AI insight generation, document OCR, and tax engine runs from HTTP handlers, ensuring requests finish quickly while background workers handle long-running tasks.  
- **Formalize configuration layering:** Introduce a config module that loads `.env` once, merges defaults, and surfaces typed interfaces (perhaps via a schema or `Joi`/`zod`) instead of sprinkling `process.env` across modules; align this with Dockercompose env_file definitions so staging/production values stay versioned and documented.

## 2026 scalability assessment

- **Database scaling:** The Sequelize/Postgres combo defined via `src/config/database.js` and `config/sequelize.js` supports pooling and SSL options, but horizontal scaling needs read replicas or sharding; plan to push read queries (dashboards, analytics) to read-only pools and ensure migrations remain idempotent across replicas.  
- **Service scaling:** Routes/services live in the same Node process, so CPU-intensive work (bank imports, AI models) will compete with API throughput; by 2026, consider splitting services into worker processes or microservices for compliance-heavy tasks (AI insights, taxes) and keep HTTP servers lightweight.  
- **Operational readiness:** Docker setup (single-stage build, health checks, `docker-compose.prod.yml`, `Dockerfile.backend`, live volumes for logs/uploads) is production-ready, but resilience requires automated backup/restore (`scripts/ops/*`), readiness probes, and alerting tied to metrics/telemetry to handle multi-tenant growth.  
- **Testing & gating:** The existing `tests/` tree plus `scripts/verify-schema.js` provide regression safety, yet more load/performance tests will be necessary before 2026 to ensure new tax/AI pipelines do not regress; add stress tests around bank-import and AI endpoints so the current architecture can validate capacity before scaling.

**Gate: PASS** – The current architecture does not block future growth but needs the refactors above to keep the layering clean and to move heavy operations into asynchronous workers before 2026-scale load.
