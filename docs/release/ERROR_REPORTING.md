# Error Reporting & Telemetry

## Backend

- Global error handler
- requestId on every error
- No stack in production logs

## Frontend

- AppErrorBoundary catches UI crashes
- Minimal telemetry sent to backend
- No PII / No stack traces

## Optional Providers

- SENTRY_DSN
- OTEL_EXPORTER_OTLP_ENDPOINT
- TELEMETRY_PROVIDER=console|sentry|otel

Default: console only.
