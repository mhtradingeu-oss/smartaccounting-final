# Observability & Runtime Visibility

This guide describes how the SmartAccounting backend surfaces operational signals so that incidents can be diagnosed quickly without touching business logic.

## Structured Logging

- `src/lib/logger/index.js` now emits one JSON line per log entry, writes it both to the filesystem and console, and flushes each record with `requestId`, `userId`, `companyId`, `method`, `path`, `route`, `statusCode`, and `durationMs`.
- Sensitive keys (`authorization`, `password`, `token`, `cookie`, etc.) are sanitized before persisting, so secrets never leak no matter which route or helper logs data.
- Logs are context-aware: the request ID is injected before any middleware in `src/middleware/requestId.js`, and the Observability middleware enriches the context with route-level metadata and response duration before every request log.
- Specialized channels (`logger.security`, `logger.performance`, etc.) still decorate their entries with `channel` without breaking the JSON shape.

## Request Correlation

- The request ID middleware seeds AsyncLocalStorage with a trace block that carries every contextual ID through downstream services.
- Observability middleware (`src/middleware/observability.js`) captures response duration, route pattern (when available), and status code via `res.once('finish')`, then re-logs using the enriched context so every HTTP access log contains the critical fields developers rely on.
- Auth middleware augments that context with `userId` and `companyId`, so even background jobs or async callbacks retain the customer scope.

## Error Visibility

- The centralized error handler (`src/middleware/errorHandler.js`) still classifies operational vs. programming failures, keeps user-friendly responses minimal, and adds the route label so every error log can be traced to a handler.
- When `SENTRY_DSN` is configured, `src/lib/sentry/index.js` initializes Sentry and the error handler calls `captureException`, tagging every event with `requestId`, `userId`, `companyId`, `route`, `method`, and `statusCode`. No DSN = no crash.

## Runtime Metrics

- Prometheus metrics are powered by `prom-client` and gated behind `METRICS_ENABLED`. When enabled, the middleware registers:
  - `smartaccounting_http_response_duration_seconds` (histogram with `method`, `route`, `status` labels)
  - `smartaccounting_http_requests_total` (counter with the same labels)
  - Default process metrics via `collectDefaultMetrics`
- `/metrics` only returns 200 when metrics are enabled and, if `METRICS_BASIC_AUTH_USER`/`METRICS_BASIC_AUTH_PASS` are set, it also enforces Basic Auth while keeping the endpoint returning 404 otherwise.
- Metrics middleware also updates the shared context so every log winds up tagged with the same route and duration values that Prometheus sees.

## Health & Readiness Probes

- `GET /health` is purely a liveness check (version, environment, timestamp) with no database interaction. Deployments can hit this endpoint from Kubernetes, Docker health checks, or plain curl.
- `GET /ready` authenticates the Sequelize connection via `sequelize.authenticate()` and returns `503` when the database is unreachable, allowing load balancers to stop routing traffic until the primary database is back.

## Observability Environment Discipline

- `LOG_LEVEL`, `REQUEST_LOGGING`, and `LOG_SLOW_REQUEST_MS` still govern logging noise; `REQUEST_LOGGING=false` silences request logs while metrics continue to update.
- New toggles:
  - `METRICS_ENABLED`: flip `true` to expose Prometheus metrics.
  - `METRICS_BASIC_AUTH_USER` / `METRICS_BASIC_AUTH_PASS`: protect `/metrics` with Basic Auth (optional but recommended in production).
  - `SENTRY_DSN`, `SENTRY_ENV`, `SENTRY_TRACES_SAMPLE_RATE`: configure Sentry per environment without crashing when not set.

## Usage Notes

- Every response still echoes `X-Request-Id`, so correlating a failing API request to a log entry is a matter of copying that value into Log Insights.
- When metrics are enabled, Prometheus can scrape `/metrics` (behind Basic Auth if configured); you can monitor histogram buckets for latency and the counter for error spikes.
- The new Observability middleware keeps request durations, routes, and user/company IDs in-sync between logs, metrics, and Sentry, simplifying incident response.
