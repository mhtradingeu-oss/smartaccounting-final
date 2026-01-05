# Frontend Route Inventory

This table enumerates every route exposed by `client/src/App.jsx` along with the page component that renders it, the authentication/role expectations, and the feature flags that gate it. It mirrors the shared `ROUTE_DEFINITIONS` so the router, docs, and tests stay aligned.

| Path | Component | Auth | Role | Feature Flags | Notes |
| --- | --- | --- | --- | --- | --- |
| `/` | `client/src/pages/Landing.jsx` | No | — | — | `LandingRoute` redirects authenticated users to `/dashboard`. |
| `/login` | `client/src/pages/Login.jsx` | No | — | — | `LoginRoute` reroutes signed-in visitors to `/dashboard`. |
| `/pricing` | `client/src/pages/Pricing.jsx` | No | — | — | Public marketing page. |
| `/request-access` | `client/src/pages/RequestAccess.jsx` | No | — | — | Self-serve interest capture. |
| `/onboarding` | `client/src/pages/OnboardingWizard.jsx` | Yes | — | — | Protected onboarding wizard. |
| `/rbac` | `client/src/pages/RBACManagement.jsx` | Yes | `admin` | — | Admin-only RBAC tooling. |
| `/investor-dashboard` | `client/src/pages/InvestorDashboard.jsx` | Yes | `auditor` | — | Auditor-oriented KPIs; surfaced via dashboard quick link. |
| `/analytics` | `client/src/pages/Analytics.jsx` | Yes | — | — | Analytics surface guarded by auth. |
| `/ai-advisor` | `client/src/pages/AIInsights.jsx` | Yes | — | — | Read-only AI insight feed. |
| `/ai-assistant` | `client/src/pages/AIAssistant.jsx` | Yes | — | `AI_ASSISTANT_ENABLED` | Conversational advisor; FeatureGate hides UI when the flag is unset. |
| `/dashboard` | `client/src/pages/Dashboard.jsx` | Yes | — | — | Primary KPI canvas plus investor quick link for auditors/accountants. |
| `/invoices` | `client/src/pages/Invoices.jsx` | Yes | — | — | Invoice list/editor hub. |
| `/expenses` | `client/src/pages/Expenses.jsx` | Yes | — | — | Expenses overview. |
| `/expenses/create` | `client/src/pages/ExpensesCreate.jsx` | Yes | — | — | Create expense flow. |
| `/invoices/create` | `client/src/pages/InvoiceCreate.jsx` | Yes | — | — | Invoice creation. |
| `/invoices/:invoiceId/edit` | `client/src/pages/InvoiceEdit.jsx` | Yes | — | — | Invoice editing. |
| `/bank-statements` | `client/src/pages/BankStatements.jsx` | Yes | — | — | Bank feed list. |
| `/bank-statements/preview` | `client/src/pages/BankStatementPreview.jsx` | Yes | — | — | Placeholder preview view. |
| `/ocr-preview` | `client/src/pages/OCRPreview.jsx` | Yes | — | `OCR_PREVIEW_ENABLED` | FeatureGate shows explanatory state when the flag is off. |
| `/bank-statements/import` | `client/src/pages/BankStatementImport.jsx` | Yes | — | — | CSV/MT940 import UI. |
| `/bank-statements/:statementId/reconciliation-preview` | `client/src/pages/BankStatementReconciliationPreview.jsx` | Yes | `accountant` | — | Accountant-only reconciliation preview. |
| `/bank-statements/:statementId` | `client/src/pages/BankStatementDetail.jsx` | Yes | — | — | Statement detail. |
| `/billing` | `client/src/pages/Billing.jsx` | Yes | — | `STRIPE_BILLING` | Stripe billing console; FeatureGate replaces page when flag is disabled. |
| `/german-tax-reports/*` | `client/src/pages/GermanTaxReports.jsx` | Yes | — | `GERMAN_TAX` | Wildcard route keyed by `activeCompany.id`; UI surfaces status callout and keeps controls disabled while the flag/back end are off. |
| `/companies` | `client/src/pages/Companies.jsx` | Yes | — | — | Company directory. |
| `/users` | `client/src/pages/Users.jsx` | Yes | `admin` | — | Admin user management. |
| `/compliance` | `client/src/pages/ComplianceDashboard.jsx` | Yes | `admin` | `ELSTER_COMPLIANCE` | Admin-only compliance hub; flag gate hides navigation and prevents backend calls. |
| `/audit-logs` | `client/src/pages/AuditLogs.jsx` | Yes | `admin` | — | Audit log listing. |
| `/gdpr-actions` | `client/src/pages/GDPRActions.jsx` | Yes | — | — | GDPR workflows. |
| `/compliance-dashboard` | `client/src/App.jsx` (redirect) | Yes | `admin` | `ELSTER_COMPLIANCE` | Legacy alias that immediately navigates to `/compliance`. |
| `*` | `client/src/App.jsx` (NotFound component) | No | — | — | Catch-all 404. |
