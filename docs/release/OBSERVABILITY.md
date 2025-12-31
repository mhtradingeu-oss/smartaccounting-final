# OBSERVABILITY: Logging, Metrics, Tracing, Errors

## 1. Request Correlation

- Every backend request is assigned a unique `requestId` (UUID v4 or from `X-Request-Id` header).
- The `requestId` is available in `req.requestId` and attached to the request context for all logs.
- The `requestId` is returned in the `X-Request-Id` response header for all API responses.
- All logs include the `requestId`, `userId` (if authenticated, redacted in logs), and `companyId` (OK to log).

## 2. Structured Logging

- All backend logs are structured JSON in production, with fields:
  - `timestamp`, `level`, `message`, `service`, `environment`, `version`, `requestId`, `userId` (redacted), `companyId`, `method`, `path`, `ip`, `meta`.
- Logs are written to `logs/combined.log` and errors to `logs/error.log`.
- Console output is human-readable in dev, JSON in prod.

## 3. Log Redaction Rules

- Never log tokens, passwords, secrets, authorization headers, or OCR content.
- The logger automatically redacts sensitive fields (see SENSITIVE_KEYWORDS in logger).
- User IDs are redacted; company IDs are logged for audit/correlation.
- If logging an error, only non-sensitive metadata is included.
- Do not log full request/response bodies for sensitive endpoints.

## 4. Log Correlation Example

```json
{
  "timestamp": "2025-12-31T12:00:00.000Z",
  "level": "info",
  "message": "HTTP request",
  "service": "smartaccounting",
  "environment": "production",
  "version": "1.2.3",
  "requestId": "b7e1...",
  "userId": "<redacted>",
  "companyId": "c123",
  "method": "GET",
  "path": "/api/companies",
  "ip": "1.2.3.4",
  "meta": { "statusCode": 200, "durationMs": "12.3ms" }
}
```

## 5. Metrics & Tracing

- `/metrics` endpoint exposes minimal liveness gauge for Prometheus.
- Performance middleware logs slow requests (see LOG_SLOW_REQUEST_MS).
- No distributed tracing system is enabled by default.

## 6. Frontend Logging

- In production, frontend logs only minimal error metadata (no PII).
- RouteErrorBoundary and AppErrorBoundary log errors with minimal context and (if available) requestId.
- Console logging is enabled in dev only.

## 7. Guidance for Developers

- Always use the logger, not `console.log`, for backend logs.
- Never log secrets, tokens, passwords, or OCR content.
- If in doubt, redact or omit sensitive fields.
- Review logs regularly for accidental leaks.

---

_This document is part of Phase 8: Production Readiness Audit._
