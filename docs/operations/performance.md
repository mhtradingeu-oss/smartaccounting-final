<!-- Performance runbook for Phase 7 readiness -->

# Performance & Scale Readiness

## Pagination guarantees
- `src/utils/pagination.js` carves out the default (`20`) and maximum (`200`) page sizes while translating `page`/`offset` inputs into the pagination parameters that every list endpoint now consumes.  
- The guarded helper is wired into the list handlers in `src/routes/invoices.js`, `src/routes/expenses.js`, `src/routes/companies.js`, `src/routes/bankStatements.js`, and `src/routes/taxReports.js`, so every `/api/*` list response returns `pagination` metadata plus `currentPage`/`total` for easy throttling on the client.
- Clients may continue to request pages via `page` or `offset`, but they will never exceed the `MAX_PAGE_LIMIT`, so abuse or runaway queries need to hit other safeguards first.

## Index strategy
- `database/migrations/20250101000000-add-performance-indexes.js` adds targeted indexes for `companyId`, `userId`, `status`, and `createdAt` on the tables that back invoices, expenses, bank statements, bank transactions, tax reports, companies, and users.  
- The migration keeps index names explicit (like `idx_invoices_company_id` and `idx_tax_reports_status`) to make it easier to inspect `pg_stat_user_indexes` or drop/rebuild them in a follow-up migration without guessing what was created.
- Ensure this migration is deployed before defaulting to any new reporting query patterns that rely on these filters.

## Slow query detection
- `src/middleware/performance.js` already tracks response time, error rate, and slow requests through the `performanceMonitor` and `response-time` middleware hooks, and it logs warnings whenever a request exceeds `1000ms`.  
- Combine that telemetry with PostgreSQL `pg_stat_statements` (or the hosted equivalent) and surface any `SELECT` that journeys through `createdAt` or `companyId` filters without hitting the new indexes.
- Keep a dashboard of `performanceMonitor.getMetrics()` (exported from the same file) to assess whether slow requests are trending upward under load; if they are, tie back the trace to the controller mentioned above.

## Rate & payload safety
- Payload limits are explicitly enforced through `app.use(express.json({ limit: process.env.JSON_LIMIT || '10mb' }))` and the `requestSizeLimiter('10mb')` middleware defined in `src/middleware/security.js`, so the default JSON limit never exceeds 10 MB without an intentional environment override.
- The pagination helper in `src/utils/pagination.js` ensures all list endpoints honor the `MAX_PAGE_LIMIT`; even if a client tries to request 1000 records, the helper normalizes the limit before any Sequelize query runs.
- Together, those layers keep our rate limits from being sidestepped, which is critical for the volume-heavy endpoints in this phase.

## Cache guidance
- `src/utils/cache.js` provides `cache.get` / `cache.set` with a feature flag driven by `CACHE_ENABLED` (default `false`).  
- When `CACHE_ENABLED=true` and `CACHE_STORE=redis`, the module attempts to load `redis` and honor `REDIS_URL`/`REDIS_USERNAME`/`REDIS_PASSWORD`, but it falls back silently to the in-memory Map so the service stays up even if Redis is unreachable.  
- The module respects a TTL (default `CACHE_DEFAULT_TTL=60`) and keeps serialized entries consistent across driver switches, so enabling caching for any expensive aggregate (e.g., VAT summary) is just a matter of calling `cache.get` before `cache.set`.
- Only flip the flag after the Redis cluster is provisioned; keep the default bit flipped until you are confident the cluster can serve the QPS spikes removed from critical API flows.

## Load-test baseline
- Use the request telemetry already emitted by `src/middleware/performance.js` to define a baseline: aim for 95th percentile latency under `500ms` for authenticated list endpoints (`/api/invoices`, `/api/expenses`, `/api/bank-statements`, `/api/tax-reports`) and ensure `slowRequestRate` stays below 1%.  
- Hammer the system with `100` concurrent users (signed in via `tests/utils/testHelpers.js`) while verifying the PostgreSQL `pg_stat_activity` queue stays near zero and the newly added indexes are being scanned instead of full tables.  
- If you observe degraded `performanceMonitor` metrics, revisit `src/utils/pagination.js`, `database/migrations/20250101000000-add-performance-indexes.js`, and `src/utils/cache.js` to see whether the limit needs tuning, an index rebuild, or a cache hit rate improvement before scaling the service further.
