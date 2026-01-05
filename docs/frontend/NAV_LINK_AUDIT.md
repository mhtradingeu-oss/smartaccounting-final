# Navigation Link Audit

This audit enumerates every navigation entry surfaced in the sidebar, top bar, and dashboard quick links, documents their visibility rules, and highlights the controls put in place to keep them aligned with backend truth.

### Sidebar – main navigation

| Item | Destination | Visible roles | Enabled when | Evidence |
| --- | --- | --- | --- | --- |
| Dashboard | `/dashboard` | authenticated | always | `client/src/navigation/sidebarNavigation.js:28-36` |
| Expenses | `/expenses` | authenticated | always | `client/src/navigation/sidebarNavigation.js:39-46` |
| AI Assistant | `/ai-assistant` | authenticated (all roles) | `isAIAssistantEnabled()` with `FeatureGate` fallback | `client/src/navigation/sidebarNavigation.js:47-55` and `client/src/pages/AIAssistant.jsx:195-284` |
| Invoices | `/invoices` | authenticated (viewer blocked) | always; viewer filter applied in `Sidebar` | `client/src/navigation/sidebarNavigation.js:57-63` and `client/src/components/Sidebar.jsx:52-68` |
| Bank Statements | `/bank-statements` | authenticated | always | `client/src/navigation/sidebarNavigation.js:65-72` |
| OCR Preview | `/ocr-preview` | authenticated | `isOCRPreviewEnabled()` with `FeatureGate` fallback | `client/src/navigation/sidebarNavigation.js:75-82` and `client/src/pages/OCRPreview.jsx:170-329` |
| German Tax | `/german-tax-reports` | authenticated | `FEATURE_FLAGS.GERMAN_TAX.enabled` | `client/src/navigation/sidebarNavigation.js:84-90` |
| Billing | `/billing` | authenticated | `FEATURE_FLAGS.STRIPE_BILLING.enabled` with `FeatureGate` fallback | `client/src/navigation/sidebarNavigation.js:93-99` and `client/src/pages/Billing.jsx:40-86` |
| Compliance | `/compliance` | admin-only | `FEATURE_FLAGS.ELSTER_COMPLIANCE.enabled` | `client/src/navigation/sidebarNavigation.js:102-108` |

### Sidebar – management & administration

| Section | Item | Destination | Visible roles | Evidence |
| --- | --- | --- | --- | --- |
| Management | Companies | `/companies` | accountant/admin/auditor (viewer blocked) | `client/src/navigation/sidebarNavigation.js:112-122` and `client/src/components/Sidebar.jsx:63-69` |
| Administration | Users | `/users` | admin only (filtered in `Sidebar`) | `client/src/navigation/sidebarNavigation.js:124-134` and `client/src/components/Sidebar.jsx:63-69` |

### Header navigation

- **Logo → `/dashboard`.** The top-left brand link always lands on the dashboard so the header never points to a ghost route (`client/src/components/TopBar.jsx:236`).  
- **Search results.** Autocomplete entries only target `/invoices`, `/companies`, `/bank-statements`, and `/dashboard`, mirroring live pages and avoiding disabled endpoints (`client/src/components/TopBar.jsx:34-57`).  
- **Notifications quick links.** Each notification (invoice processed, payment received, feature update) points to an existing route, and the German tax notification is only appended when `FEATURE_FLAGS.GERMAN_TAX.enabled` to avoid 501s (`client/src/components/TopBar.jsx:77-140`).  
- **Footer.** No clickable navigation (static version/copyright lines only) so no additional routes are exposed (`client/src/components/Footer.jsx:4-11`).

### Dashboard quick links

- **Investor dashboard shortcut.** Added inside the dashboard content for auditors/accountants so `/investor-dashboard` is no longer a dead endpoint; the card is gated by role and uses the `Link` component for a safe fast path (`client/src/pages/Dashboard.jsx:171-189`).

### Feature gating & backend alignment

- **Consistent FeatureGate.** A single helper centralizes the disabled-state UI across AI assistant, billing, and OCR preview flows, keeping users out of disabled backend endpoints (`client/src/components/FeatureGate.jsx:6-35`).  
- **AI assistant, billing, OCR preview pages.** Each wraps its experience with `FeatureGate` so nav items that stay hidden while flags are false do not reveal 501 errors (`client/src/pages/AIAssistant.jsx:195-284`, `client/src/pages/Billing.jsx:40-86`, `client/src/pages/OCRPreview.jsx:170-329`).  
- **Sidebar filtering.** The sidebar evaluates `enabled` values before rendering and additionally hides `/invoices` for viewers to align with viewer permissions (`client/src/components/Sidebar.jsx:45-135`).

### Automated guardrails

- **Route/nav parity test.** `client/src/tests/routeConfig.test.jsx:3-26` asserts there are no duplicate route paths and every sidebar href aligns with a defined route, surfacing mismatches early.

### Test readiness

- **Locale imports.** Swapping `client/src/i18n.js` to relative `./locales/.../translation.json` imports removes the Vitest alias-resolution blocker while keeping runtime builds unchanged, so `npm run test --prefix client` can now find the translations (`client/src/i18n.js:1-16`).

### Findings & fixes

- Investor dashboard gained a clear UI surface so the guarded `/investor-dashboard` route is no longer dead (`client/src/pages/Dashboard.jsx:171-189`).  
- Sidebar links to AI assistant, OCR preview, German tax, billing, and compliance are hidden when their backend flags are off; `FeatureGate` provides the “coming soon/disabled” messaging for each entry (`client/src/navigation/sidebarNavigation.js:47-109`, `client/src/components/FeatureGate.jsx:6-35`).  
- Header search/notification links reuse existing routes, so there are no stray clicks hitting disabled endpoints (`client/src/components/TopBar.jsx:34-140`).  
- Tests now ensure nav/link sets stay in sync with the route inventory (`client/src/tests/routeConfig.test.jsx:3-26`).
