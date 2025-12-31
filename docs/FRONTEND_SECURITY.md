# Frontend Safety & Security Notes

## Environment hygiene
- `client/src/lib/envGuards.js` now runs at startup to warn whenever production misses a required `VITE_*` variable like `VITE_API_URL`/`VITE_APP_ENV`, and to log if any server-only secrets (JWT, DB, Stripe secret, etc.) leak into `import.meta.env`.
- The guard skips tests so unit suites do not fail or spam the logs.

## DOM safety
- A repository-wide search for `dangerouslySetInnerHTML` returns zero matches; React always escapes interpolated values and no raw HTML blobs are rendered without an explicit sanitizer.
- Any future HTML rendering should either reuse `ux/ErrorState`/`PageStates` or go through a documented sanitization step before passing strings into components.

## Production UX safety
- `AppErrorBoundary` now provides a localized crash screen plus retry/logout actions so fatal errors never render blank pages, while `RouteErrorBoundary` keeps lazy route failures scoped and renders the shared `PageErrorState` instead.
- Read-only mode banners (`ReadOnlyBanner`) and no-access variants (`PageNoAccessState`) remain wired up on their respective routes (`AIInsights`, `Invoices`, `BankStatements`, `Expenses`, etc.) and were not altered by this change set.
