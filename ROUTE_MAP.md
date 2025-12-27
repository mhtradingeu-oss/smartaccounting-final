# Route Map

| Path | Purpose | Protection + Notes |
| --- | --- | --- |
| `/` | Public landing page with hero, trust badges, and CTAs; authenticated visitors still reroute to `/dashboard`. | Public marketing experience powered by `LandingRoute`. |
| `/login` | Login page that also reroutes authenticated users to `/dashboard`. | Public. |
| `/pricing` | Stripe-agnostic pricing marketing page with plan cards, plan comparison, and contact CTA. | Public marketing experience; highlights Stripe / compliance readiness before checkout is enabled. |
| `/request-access` | Request access form for invite-only preview and updates. | Public; collects name/email/company, surfaces accessible messaging, and links back to pricing/landing. |
| `/onboarding` | SaaS onboarding wizard inside the main layout. | `ProtectedRoute` (any authenticated user) + `Layout`. |
| `/rbac` | Role-based access control console. | `ProtectedRoute` + `requiredRole="admin"`; wrapped in `Layout`. |
| `/investor-dashboard` | Auditor/investor KPI surface. | `ProtectedRoute` + `requiredRole="auditor"`. |
| `/analytics` | Experimental analytics/insights board. | Public (no `ProtectedRoute`). |
| `/dashboard` | Main KPI dashboards. | `ProtectedRoute` + `Layout`. |
| `/invoices` | Invoice list. | `ProtectedRoute` + `Layout`; viewers are hidden from the sidebar. |
| `/invoices/create` | Invoice creation form. | `ProtectedRoute` + `Layout`. |
| `/invoices/:invoiceId/edit` | Invoice edit flow. | `ProtectedRoute` + `Layout`. |
| `/expenses` | Expense list. | `ProtectedRoute` + `Layout`. |
| `/expenses/create` | Expense creation form. | `ProtectedRoute` + `Layout`. |
| `/bank-statements` | Bank statement list. | `ProtectedRoute` + `Layout`. |
| `/bank-statements/upload` | Upload placeholder (coming soon). | `ProtectedRoute` + `Layout`; placeholder explains upcoming capability. |
| `/bank-statements/:statementId` | Bank statement detail view. | `ProtectedRoute` + `Layout`. |
| `/billing` | Billing/subscription management UI. | `ProtectedRoute` + `Layout`; sidebar renders a "Coming soon" badge when `FEATURE_FLAGS.STRIPE_BILLING.enabled === false`. |
| `/german-tax-reports/*` | German VAT/tax reporting workspace (feature flagged). | `ProtectedRoute` + `Layout`; sidebar shows a "Coming soon" badge and the page surfaces availability messaging when the backend returns `501/disabled`. |
| `/companies` | Company profile and settings. | `ProtectedRoute` + `Layout`. |
| `/users` | User administration. | `ProtectedRoute` + `Layout` + `requiredRole="admin"`. |
| `/compliance` | Compliance dashboard (Elster/GDPR). | `ProtectedRoute` + `Layout` + `requiredRole="admin"`; feature flagged if `FEATURE_FLAGS.ELSTER_COMPLIANCE.enabled` is false. |
| `/compliance-dashboard` | Legacy alias that navigates to `/compliance`. | Same guards as `/compliance`. |
| `/audit-logs` | Audit trails. | `ProtectedRoute` + `Layout` + `requiredRole="admin"`. |
| `/gdpr-actions` | GDPR action center. | `ProtectedRoute` + `Layout`. |
| `*` | Fallback not-found screen (renders the inline `NotFound` component). | Public catch-all. |
