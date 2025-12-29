# Backend Route Map

> Generated via `node scripts/listRoutes.js`. Use this reference to cross-check client expectations with the live Express stack.

## Health & Observability
| Path | Methods | Notes |
| --- | --- | --- |
| `/health` | GET | Public health check |
| `/metrics` | GET | Minimal Prometheus exposition |
| `/ready` | GET | Checks primary DB connectivity |

## Authentication & Session
| Path | Methods | Notes |
| --- | --- | --- |
| `/api/auth/login` | POST | Issues JWT + refresh tokens |
| `/api/auth/register` | POST | Self-serve registration (guarded via validation) |
| `/api/auth/logout` | POST | Revokes refresh token |
| `/api/auth/refresh` | POST | Rotates refresh token |
| `/api/auth/me` | GET | Current user profile |

## Admin & Maintenance
| Path | Methods | Notes |
| --- | --- | --- |
| `/api/admin/demo-data/load` | POST | Admin + default company only; idempotent seed loader |

## AI & Analytics
> AI endpoints are read-only. Viewer roles receive a curated subset (top 3) and the `viewerLimited` flag to highlight restricted access.
| Path | Methods | Notes |
| --- | --- | --- |
| `/api/ai/insights` | GET | Read-only AI-driven insights, capped to 3 items for viewers; response flags `viewerLimited`. |
| `/api/ai/insights/:id/decisions` | POST | Disabled (returns `501`) to prevent writes. |
| `/api/ai/insights/generate` | POST | Disabled (returns `501`) until a read-only generator is backfilled. |
| `/api/ai/exports/insights.json` | GET | Exports JSON payload |
| `/api/ai/exports/insights.csv` | GET | Exports CSV payload |

## Users & Companies
| Path | Methods | Notes |
| --- | --- | --- |
| `/api/users/` | GET | List users (requires auth + RBAC) |
| `/api/users/` | POST | Create user (admin) |
| `/api/users/:userId` | PUT | Update user |
| `/api/users/:userId` | DELETE | Remove user |
| `/api/companies/` | GET | Company profile |
| `/api/companies/:companyId` | PUT | Update company settings |

## Dashboard & Monitoring
| Path | Methods | Notes |
| --- | --- | --- |
| `/api/dashboard/stats` | GET | Dashboard KPIs |
| `/api/monitoring/logs` | GET | Aggregated monitoring logs |
| `/api/system/health-detailed` | GET | Detailed system snapshot |
| `/api/system/info` | GET | Metadata endpoint |
| `/api/system/version` | GET | App version / git info |
| `/api/system/stats` | GET | System metrics |
| `/api/system/db-test` | GET | Triggers DB sanity check |

## Invoices & Expenses
| Path | Methods | Notes |
| --- | --- | --- |
| `/api/invoices/` | GET | Invoice list |
| `/api/invoices/` | POST | Create invoice |
| `/api/invoices/:invoiceId` | GET | Invoice detail |
| `/api/invoices/:invoiceId` | PUT | Update invoice |
| `/api/invoices/:invoiceId/status` | PATCH | Change invoice status |
| `/api/expenses/` | GET | Expense list |
| `/api/expenses/` | POST | Create expense |
| `/api/expenses/:expenseId` | GET | Expense detail |
| `/api/expenses/:expenseId/status` | PATCH | Update expense status |

## Bank Statements
| Path | Methods | Notes |
| --- | --- | --- |
| `/api/bank-statements/` | GET | Lists statements |
| `/api/bank-statements/import` | POST | Imports CSV/MT940/CAMT053 via multipart/form-data (`bankStatement` file + `format` field); guarded by `authenticate` + `requireRole(['admin','accountant'])`, keeping the request company-scoped (`req.companyId`). |
| `/api/bank-statements/:id/transactions` | GET | Statement transactions |
| `/api/bank-statements/reconcile` | POST | Reconciliation |
| `/api/bank-statements/transactions/:id/categorize` | PUT | Tag transaction |

## Tax Reporting & Compliance
### Tax Reports
| Path | Methods | Notes |
| --- | --- | --- |
| `/api/tax-reports/` | GET | List tax reports |
| `/api/tax-reports/` | POST | Create report |
| `/api/tax-reports/generate` | POST | Generate report |
| `/api/tax-reports/:id` | GET | Report detail |
| `/api/tax-reports/:id` | PUT | Update report |
| `/api/tax-reports/:id` | DELETE | Delete report |
| `/api/tax-reports/:id/export/elster` | GET | Export to Elster format |
| `/api/tax-reports/:id/submit` | POST | Submit report |

### Compliance
| Path | Methods | Notes |
| --- | --- | --- |
| `/api/compliance/overview` | GET | Compliance status overview |
| `/api/compliance/deadlines` | GET | Configured deadlines |
| `/api/compliance/reports/:type` | GET | Download compliance report |
| `/api/compliance/test` | GET | Compliance readiness probe |
| `/api/compliance/gobd/export` | GET | Export GoBD dataset |
| `/api/compliance/validate-transaction` | POST | Transaction validation |

### GDPR
| Path | Methods | Notes |
| --- | --- | --- |
| `/api/gdpr/export-user-data` | GET | User data export |
| `/api/gdpr/anonymize-user` | POST | GDPR anonymization flow |

## German Tax Compliance Feature Flagged
| Path | Methods | Notes |
| --- | --- | --- |
| `/api/german-tax/eur/:year` | GET | EUR forecast (feature flagged) |
| `/api/german-tax/kleinunternehmer/:year` | GET | Kleinunternehmer status |
| `/api/german-tax/submit` | POST | Submit VAT return |
| `/api/german-tax/validate-transaction` | POST | Validate transaction for German tax |
| `/api/german-tax/vat-return` | POST | Generate VAT return |
| `/api/german-tax/elster-export` | POST | Export to Elster (service placeholder) |

## German Tax Compliance (Future)
| Path | Methods | Notes |
| --- | --- | --- |
| `/api/german-tax-compliance/calendar/:year` | GET | Calendar insights |
| `/api/german-tax-compliance/compliance/check/:year` | GET | Compliance check |
| `/api/german-tax-compliance/elster/test` | GET | Connectivity test |
| `/api/german-tax-compliance/eur/generate` | POST | EÜR generation |
| `/api/german-tax-compliance/ustva/generate` | POST | UStVA generation |
| `/api/german-tax-compliance/ustva/submit` | POST | UStVA submit |
| `/api/german-tax-compliance/export/gobd` | POST | GoBD export |
| `/api/german-tax-compliance/validate/integrity` | POST | Integrity check |

## Payments & Stripe
| Path | Methods | Notes |
| --- | --- | --- |
| `/api/stripe/health` | GET | Stripe readiness |
| `/api/stripe/plans` | GET | Public pricing catalog |
| `/api/stripe/subscription` | GET | Current subscription |
| `/api/stripe/billing-history` | GET | Billing events |
| `/api/stripe/create-customer` | POST | Customer onboarding |
| `/api/stripe/create-subscription` | POST | Subscribe plan |
| `/api/stripe/cancel-subscription` | POST | Cancel plan |

## Logs, Exports & OCR
| Path | Methods | Notes |
| --- | --- | --- |
| `/api/logs/` | POST | Ingest app logs (internal) |
| `/api/exports/accounting-records` | GET | Accounting exports |
| `/api/exports/ai-decisions` | GET | AI decisions export |
| `/api/exports/audit-logs` | GET | Audit trail export |
| `/api/exports/vat-summaries` | GET | VAT summaries export |
| `/api/ocr/process` | POST | OCR ingestion |
| `/api/ocr/preview` | POST | OCR preview only (flag-gated, no persistence) |
| `/api/ocr/reprocess/:fileId` | POST | Retry OCR |
| `/api/ocr/results/:fileId` | GET | OCR result detail |
| `/api/ocr/search` | GET | Search OCR results |
| `/api/ocr/validate/:documentId` | GET | OCR validation |

## Telemetry & Systems Intelligence
| Path | Methods | Notes |
| --- | --- | --- |
| `/api/telemetry/client-error` | POST | Frontend error ingestion |

## Email Testing
| Path | Methods | Notes |
| --- | --- | --- |
| `/api/email-test/test-config` | GET | Template listing |
| `/api/email-test/test-connection` | POST | Validate SMTP |
| `/api/email-test/test-template/:type` | POST | Send test template |
| `/api/email-test/send-test` | POST | Trigger email for QA |

## Elster Exports (`/api/elster`)
> All routes are currently short-circuited by `disabledFeatureHandler('Elster exports')`, so they return `501 {status:'disabled'}` before the handlers below execute. The service layer also lacks the helper methods referenced below, so these routes are effectively dead code until Elster exports are re-enabled.
| Path | Methods | Notes |
| --- | --- | --- |
| `/api/elster/history` | GET | First handler (uses missing `getSubmissionHistory`) |
| `/api/elster/history` | GET | Second handler (awaits same service but never reached) |
| `/api/elster/status/:transferTicket` | GET | Historical check (undefined `getSubmissionStatus`) |
| `/api/elster/status/:ticket` | GET | Active handler (calls `checkSubmissionStatus`) |
| `/api/elster/submit` | POST | Submits tax report (uses several missing helpers) |
| `/api/elster/generate-xml` | POST | Generates XML (calls `generateElsterXML`) |

## Route Audit Notes
- All `/api/*` endpoints above are mounted on the configurable `API_BASE_URL` (defaults to `/api`). `/api/expenses` now respects this prefix to avoid drift.
- `scripts/listRoutes.js` can be run in any environment (it defaults to `USE_SQLITE=true`) to refresh this map before releases.
