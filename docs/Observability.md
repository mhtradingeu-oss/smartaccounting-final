# Observability & Runtime Visibility

This Phase 3 guide summarizes the lightweight, fail-safe telemetry that can run alongside the SmartAccounting backend without touching business logic or existing API contracts.

## Structured Logging

- All logs flow through the context-aware logger in `src/lib/logger/index.js`, which merges AsyncLocalStorage metadata (`requestId`, `userId`, `companyId`, `method`, `path`, `ip`), automatically redacts sensitive fields (`authorization`, `password`, `token`, etc.), and writes JSON lines to `logs/combined.log` plus a trimmed error-only stream while still streaming readable entries to the console.
- HTTP request metadata (method, path, status, duration, and contextual IDs) is emitted from `src/middleware/security.js` when `REQUEST_LOGGING` is not explicitly disabled.
- Console output is routed through the central logger, and every log record stays JSON-ready for ingestion or grep-based troubleshooting.
- Audit, security, performance, and business helper methods still exist on the logger so channels remain tagged with `channel:{audit|security|performance|business}` for downstream alerting or compliance hooks.

## Request Correlation

- The earliest middleware in `src/app.js` is the request ID generator in `src/middleware/requestId.js`. It seeds the shared AsyncLocalStorage context with the incoming or generated `X-Request-Id`, which automatically surfaces in logs and headers (`X-Request-Id` on the response).
- Authentication (`src/middleware/authMiddleware.js`) and company context (`src/middleware/requireCompany.js`) update that shared context so downstream logs retain `userId` and `companyId`.

## Error Visibility

- Errors pass through `src/middleware/errorHandler.js`, which classifies them as operational (mapped to 4xx) or programmer faults (5xx), logs only once, and exposes a consistent JSON error shape without leaking stack traces to the client.
- Stack traces remain attached to the backend log entry when the error is logged at `error` level, while the API response keeps a sanitized `status`/`message`/`code` payload.

## Runtime Metrics

- When `METRICS_ENABLED=true`, each response updates an in-memory metrics snapshot (`src/middleware/metrics.js`) that tracks request count, latency, error rate, slow requests, and status code buckets. A minute-by-minute summary is emitted through `logger.performance`.
- The slow-request threshold is tunable via `LOG_SLOW_REQUEST_MS` (default `1000`), and slow routes are highlighted even when detailed request logging is disabled.
- The optional `REQUEST_LOGGING` flag controls whether every HTTP request emits an `info`/`warn`/`error` log; you can silence it to reduce noise while still preserving metric snapshots.

## Health & Readiness Probes

- `GET /health` returns a rapid liveness signal with environment, version, and timestamp so orchestrators know the process is still running.
- `GET /ready` verifies the primary database connectivity before reporting `ready`; any failure surfaces as `503` with a descriptive `error` payload so load balancers can stop traffic while the DB is unreachable.

## Observability Environment Discipline

- The optional environment variables below control observability and have safe defaults:
- `LOG_LEVEL`: determines how verbose the context-aware logger should be; defaults to `debug` for development and `info` for production.
  - `METRICS_ENABLED`: set to `true` to activate runtime metrics logging (defaults to `false`).
  - `REQUEST_LOGGING`: set to `false` if you want to keep the request log silent (defaults to `true`).
  - `LOG_SLOW_REQUEST_MS`: slow-request threshold in milliseconds (defaults to `1000`).
  - `LOG_SLOW_QUERY_MS`: slow-database-query threshold in milliseconds (defaults to `500`, set `0` to disable slow-query warnings).
  - `METRICS_SNAPSHOT_INTERVAL_MS`: snapshot cadence for runtime metrics (defaults to `60000`).
- `validateEnv.js` now warns when these are missing or set to unexpected values, but it never fails the startup — observability remains optional and toggleable.

## Usage Notes

- To correlate a customer-visible failure, reproduce it via the API, look for the returned `code`/`status`, then search logs for the same `requestId` (every log record carries it).
- `GET /metrics` now exposes Prometheus-style gauges (uptime, request/error counts, slow rates, memory and CPU usage) so a single scrape captures availability and runtime health.
