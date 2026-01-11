# System Admin Guide

This document describes the System Admin (platform) domain versus Company User domain in SmartAccounting.

## Roles and Capabilities

### System Admin (platform)
- Identity: `role === 'admin'` **and** `companyId` is null/undefined.
- Scope: Platform-wide visibility and governance.
- Core capabilities:
  - View system overview, health, uptime, and monitoring metrics.
  - Manage companies (create, suspend/restore, delete when safe).
  - Manage users across the platform (activate/deactivate, role changes).
  - View global pricing/plan catalog and subscription state summaries.
  - View global feature flags and AI governance coverage.
  - View system-wide audit logs.
  - View backup status and maintenance state.
  - Read-only environment/config snapshot.

### Company Users (tenant-bound)
- Identity: Any authenticated user with `companyId` set.
- Roles:
  - `admin`: full company permissions.
  - `accountant`: edit accounting data and run exports.
  - `auditor`: read-only + export access.
  - `viewer`: read-only, minimal access.
- Scope: Company-only accounting workflows, dashboards, and compliance reporting.

## Detection Logic

### Backend
- Source of truth: `src/middleware/authMiddleware.js`.
- `isSystemAdminUser(user)` returns true when:
  - `user.role === 'admin'` **and**
  - `user.companyId` is null/undefined.
- `requireSystemAdmin` enforces system-only routes.
- `requireCompany` enforces `x-company-id` and blocks system admins from all company routes.
- Company context is derived **only** from the `x-company-id` header (never from token, query, or body).

### Frontend
- Helper: `client/src/lib/systemAdmin.js`.
- `isSystemAdmin(user)` returns true when `role === 'admin'` and `companyId` is null/undefined.
- Routing gates:
  - `SystemAdminRoute` restricts `/system-admin`.
  - `CompanyRoute` redirects system admins away from company pages.

## Page Access Matrix

### System Admin Only
- `/system-admin` (System Admin Dashboard)

### Company User Only
- `/dashboard`
- `/invoices`, `/invoices/create`, `/invoices/:id/edit`
- `/expenses`, `/expenses/create`
- `/bank-statements/*`
- `/companies`
- `/users`
- `/rbac`
- `/billing`
- `/german-tax-reports/*`
- `/compliance`
- `/audit-logs`
- `/gdpr-actions`
- `/ai-assistant`, `/ai-advisor`, `/analytics`

### Shared (Unauthenticated)
- `/login`
- `/pricing`
- `/request-access`
- `/terms`
- `/privacy`

## Login Flows

- System Admin:
  - Authenticate → redirect to `/system-admin`.
  - Company context is not loaded.
  - Company routes are always denied, even if an `x-company-id` header is provided.
- Company User:
  - Authenticate → redirect to `/dashboard`.
  - Company context is supplied via `x-company-id` on every company-scoped request.

## Backend Route Enforcement

System routes (system admin only):
- `GET /api/system/*` (overview, health, companies, users, feature flags, maintenance, config, backups, monitoring)

Company routes (company context required):
- `x-company-id` header required; missing → 400 `COMPANY_CONTEXT_REQUIRED`.
- Invalid / not accessible → 403 `COMPANY_CONTEXT_INVALID`.
- System admins are blocked from company routes (403) regardless of header.
- `GET/POST /api/dashboard/*`
- `GET/POST /api/invoices/*`
- `GET/POST /api/expenses/*`
- `GET/POST /api/bank-statements/*`
- `GET/POST /api/exports/*`
- `GET/POST /api/compliance/*`
- `GET/POST /api/german-tax/*`
- `GET/POST /api/elster/*`
- `GET/POST /api/german-tax-compliance/*`
- `GET/POST /api/ai/*`
- `GET/POST /api/users/*`
- `GET/POST /api/companies/*`
- `GET/POST /api/tax-reports/*`
- `GET/POST /api/gdpr/*`

## System Admin Dashboard Sections

Each section maps to a system API endpoint:
- System Overview: `GET /api/system/overview`
- Companies Management: `GET/POST/PATCH/DELETE /api/system/companies`
- Users Management: `GET/POST/PATCH /api/system/users`
- Plans & Pricing: `GET /api/system/plans`
- Subscriptions & Billing: `GET /api/system/subscriptions`
- Feature Flags / AI Governance: `GET /api/system/feature-flags`
- Audit Logs: `GET /api/system/audit-logs`
- Backups & Restore Status: `GET /api/system/backups`
- Maintenance Mode: `GET/POST /api/system/maintenance`
- Environment / Config: `GET /api/system/config`
- Monitoring & Telemetry: `GET /api/system/monitoring`

## Extending the System Admin Area

- Add backend endpoints in `src/routes/system.js`.
- Add new UI sections in `client/src/pages/SystemAdminDashboard.jsx`.
- Add navigation entries in `client/src/navigation/sidebarNavigation.js` if new routes are introduced.
- Keep the `isSystemAdmin` detection logic consistent in both frontend and backend.
- Do not couple system admin actions to company accounting tables unless explicitly scoped.
