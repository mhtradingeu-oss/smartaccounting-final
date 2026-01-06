# UX Mental Model Report — Phase 3 Role-aware UX

## Role → Visible Actions Matrix

| Role | Expected actions | Visible actions |
| --- | --- | --- |
| Admin | 1. Manage invoices & expenses for tenants. 2. Import/refresh bank statements and review billing. 3. Reach compliance admin controls and demo data generation. | 1. `New Invoice` CTA plus edit links are guarded by `PermissionGuard` so admins can create & edit invoices (see `client/src/pages/Invoices.jsx:131` and `client/src/pages/Invoices.jsx:252`). 2. `Create Expense` is available via the primary CTA (see `client/src/pages/Expenses.jsx:118`). 3. Bank statement `Refresh`/`Import` are exposed through `PermissionGuard` and tagged as accountant/admin actions (see `client/src/pages/BankStatements.jsx:173`). 4. Billing card surfaces the subscription view & cancel controls for admins (see `client/src/pages/Billing.jsx:169`). 5. Compliance overview includes quick links for audit logs & GDPR actions (see `client/src/pages/ComplianceDashboard.jsx:71`). 6. The dashboard shows an admin-only “Load Demo Data” control (see `client/src/pages/Dashboard.jsx:111`). |
| Accountant | 1. Operate the daily ledger: create/edit invoices, capture expenses, import statements. 2. Monitor KPIs and AI signals in a read-only audit channel. | 1. Invoice creation/edit flows mirror Admin visibility (see `client/src/pages/Invoices.jsx:131` and `client/src/pages/Invoices.jsx:252`). 2. Expense creation CTA is open to accountants (see `client/src/pages/Expenses.jsx:118`). 3. Bank statement `Import` and `Refresh` sit next to the read-only summary for accountants (see `client/src/pages/BankStatements.jsx:173`). 4. The dashboard surfaces the investor audit card for analysts (see `client/src/pages/Dashboard.jsx:171`). 5. The AI Assistant stays read-only and labels itself as advisory (see `client/src/pages/AIAssistant.jsx:191`). |
| Auditor | 1. Consume read-only audit dashboards and summaries. 2. Access exports & compliance-ready views without mutation. | 1. The dashboard links to the investor-focused surface (see `client/src/pages/Dashboard.jsx:171`). 2. Bank statements present a read-only summary + banner tied to `isReadOnlyRole` (see `client/src/pages/BankStatements.jsx:148`). 3. The AI Assistant is explicitly read-only and audit logged (see `client/src/pages/AIAssistant.jsx:200`). 4. Compliance overview frames an “Admin center” with audit/GDPR quick links (see `client/src/pages/ComplianceDashboard.jsx:41`). |
| Viewer | 1. View dashboards, invoices, expenses, and statements without edit affordances. 2. Never see admin-only CTAs. | 1. Sidebar filters hide the Invoices nav for viewers (see `client/src/components/Sidebar.jsx:52`). 2. Invoice header and table actions show the read-only banner + `PermissionGuard` disabled states (see `client/src/pages/Invoices.jsx:151`). 3. Expenses page surfaces the read-only banner and a disabled “View” placeholder explaining the future detail view (see `client/src/pages/Expenses.jsx:109` and `client/src/pages/Expenses.jsx:142`). 4. Bank statement preview is disabled for read-only roles with a clarifying tooltip (see `client/src/pages/BankStatements.jsx:198`). 5. The AI Assistant keeps an explicit advisory banner (see `client/src/pages/AIAssistant.jsx:200`). |

## UX mismatches found

- Bank statements always displayed the read-only banner, even when admins/accountants had write access, which conflicted with the import affordance and made daily operators doubt their permissions (resolved by guarding the banner via `isReadOnlyRole`; see `client/src/pages/BankStatements.jsx:148`).  
- “Delete” and “Reprocess” buttons looked actionable but had no handlers, so users could click without feedback; they now surface as disabled placeholders with a clear “coming soon” explanation (see `client/src/pages/BankStatements.jsx:294`).  
- The billing page heading relied on `t('billingTitle')` and related keys, but the English locale did not define them, so the UI showed raw keys; the missing strings were added so the page renders “Billing” copy (see `client/src/pages/Billing.jsx:142` and `client/src/locales/en/translation.json:130`).

## Fixes applied

- Bank statements now only show the read-only banner and “Read-only summary” messaging for read-only roles, and per-statement delete/reprocess controls are replaced with explained disabled states so the UI matches available capabilities (see `client/src/pages/BankStatements.jsx:148` and `client/src/pages/BankStatements.jsx:294`).  
- Added the missing `billingTitle`, `billingSubtitle`, `currentSubscription`, `noActiveSubscription`, and `choosePlanButton` strings to the English locale so the billing header, subtitle, and quick actions render real copy instead of translation keys (see `client/src/locales/en/translation.json:130`).

## Remaining UX risks

- The Auditor dashboard still contains placeholder sections for audit log & GDPR summaries; maintain the read-only, calm tone when those components land so auditors keep the “view-only” mental model (see `client/src/pages/AuditorDashboard.jsx:6`).  
- The AI Assistant will still show “No AI insights yet” until backend data arrives; keep the advisory language around that message so viewers don’t expect actionable outcomes (see `client/src/pages/AIAssistant.jsx:315`).

## Confirmation checklist

- No misleading actions.  
- No role confusion.  
- UI intent is consistent.
