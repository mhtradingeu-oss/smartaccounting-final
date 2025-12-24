# Observability & Ops Runbook

## Enabling metrics

- Set `METRICS_ENABLED=true` before deploying to production so the Prometheus /metrics scrape endpoint is live.
- Optionally define `METRICS_BASIC_AUTH_USER` and `METRICS_BASIC_AUTH_PASS` to gate the scrape endpoint; restart the backend whenever you change those credentials.
- Metrics gatherers already include default process metrics (`prom-client.collectDefaultMetrics()`), an HTTP duration histogram (`method`, `route`, `status` labels), and a request counter sharing the same labels.
- Verify `/metrics` returns 200 with valid Basic Auth (if configured) and exposes the `smartaccounting_http_response_duration_seconds` and `smartaccounting_http_requests_total` families.

## Protecting metrics

- Docker Compose intentionally does not map the backend port (`5000`) to the host and Traefik only forwards `/api` paths, so `/metrics` is not exposed to the internet unless you explicitly add another router.
- Always enable Basic Auth when you flip `METRICS_ENABLED` on and the service is reachable by anyone inside the VPC; credentials are not defaulted and must be supplied via the environment template.
- Don’t store secrets (e.g., Basic Auth credentials or Sentry DSN) in commits—use secret management or `.env.prod`.

## What to monitor & suggested alerts

- **Prometheus histogram buckets**: watch 99th-percentile bucket shifts for latency regressions; alert on the 1s bucket (or higher) exceeding baseline.
- **`smartaccounting_http_requests_total`**: trigger a warning when error-status labels (`4xx`, `5xx`) spike or when request rate drops unexpectedly (indicating a crash loop).
- **`/ready` probe**: alert when Kubernetes / Docker health checks report 503 from `/ready`, which indicates Sequelize cannot reach the database.
- **Sentry**: monitor the event volume, especially “fatal”/“error” severity flows; use `requestId` or `route` tags to filter incidents.

## Sentry setup

- Provide `SENTRY_DSN` (copy/paste from your Sentry project) and optionally `SENTRY_ENV` (default falls back to `NODE_ENV`) plus `SENTRY_TRACES_SAMPLE_RATE` to control sampling (0–1, e.g., `0.1` for 10% traces).
- After deployment, trigger an error (e.g., invalid route) and confirm the event appears in Sentry with `requestId`, `companyId`, `userId`, and `route` tags.
- If Sentry events stop arriving:
  1. Check the backend logs for “Sentry” warnings and ensure `SENTRY_DSN` didn’t change.
  2. Confirm outbound connectivity to `o41655.ingest.sentry.io` (or your self-hosted endpoint).
  3. Validate the sample rate is between 0 and 1; invalid values are ignored.

## Troubleshooting tips

- **Metrics endpoint returns 404**: ensure `METRICS_ENABLED=true`; when false the endpoint deliberately responds 404 so scrapers know it is disabled.
- **Metrics endpoint returns 401**: verify Basic Auth credentials match `METRICS_BASIC_AUTH_USER/PASS` and that your Prometheus job uses them (`Authorization: Basic ...`).
- **`/ready` failing**: check `DATABASE_URL`, network reachability to Postgres, and that migrations/seeds completed (`sequelize.authenticate()` must succeed).
- **Logs missing request metadata**: confirm the request hit the backend after the request ID middleware and that `X-Request-Id` returned in the response is passed to your log store.
- **Sentry not capturing contextual data**: ensure the DSN is set and the request is not flagged as operational (4xx); the log entry will include `route` and `requestId` so you can correlate quickly.
