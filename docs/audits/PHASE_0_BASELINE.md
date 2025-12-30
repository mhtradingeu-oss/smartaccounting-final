# PHASE_0_BASELINE.md

## Baseline Scope Table (as of 2025-12-31)

### Feature Inventory

| Feature / Module | Status | Notes |
| ---------------- | ------ | ----- |
| Multi-company support + RBAC | Implemented | `docs/03_CORE_FEATURES.md` + `README.md` describe company context & JWT/RBAC enforcement across API/UI. |
| Company & tax configuration (profiles, tax metadata) | Implemented | `docs/03_CORE_FEATURES.md` details company settings; `docs/GERMAN_TAX_INTEGRATION.md` spells out the legal metadata that travels with each company. |
| Accounting workflows (invoices, expenses, bank statements, reconciliation) | Implemented | `docs/03_CORE_FEATURES.md` + README walkthroughs prove CRUD and status transitions plus bank-statement matching for production/demo flows. |
| VAT/UStG & §14 compliance validation | Implemented | `docs/06_SECURITY_GDPR_GERMAN_COMPLIANCE.md`, `docs/GERMAN_TAX_INTEGRATION.md`, and `docs/14_AI_ACCOUNTING_INTELLIGENCE_MASTER.md` cover 19%/7%/0% rates, reverse charge, and invoice legality checks. |
| Dashboards & KPI reporting | Implemented | `docs/03_CORE_FEATURES.md` and README describe revenue/expense KPI widgets, filtering by company/role, and analytics panels. |
| Reporting exports & weekly digest | Implemented | `docs/03_CORE_FEATURES.md` documents PDF/CSV exports; `docs/14_AI_ACCOUNTING_INTELLIGENCE_MASTER.md` describes weekly digests, cashflow summaries, and risk change reports. |
| Audit logs & GoBD compliance | Implemented | `docs/03_CORE_FEATURES.md`, `docs/06_SECURITY_GDPR_GERMAN_COMPLIANCE.md`, and `docs/PHASE_3_GOBD_AUDITLOG.md` describe immutable, hash-chained trails with 10-year retention. |
| Observability & health metrics | Implemented | `docs/Observability.md` (structured JSON logs, request IDs, `/health`, `/ready`, `/metrics`, and configurable telemetry toggles) plus health checks in README. |
| Email alerts (demo mode via nodemailer) | Implemented | `docs/03_CORE_FEATURES.md` + README show nodemailer alerts seeded with demo data; still gated to DEMO_MODE/ALLOW_DEMO_SEED and not wired to a production SMTP provider. |
| Slack-ready notifications | Partial | `docs/03_CORE_FEATURES.md` calls out Slack-ready hooks, but there is no shipped provider integration yet. |
| Real-time feed (WebSocket) | Planned | `docs/03_CORE_FEATURES.md` explicitly marks the real-time feed as planned (no backend sockets currently published). |
| AI intelligence (assistant, knowledge base, tool orchestration, risk engine, weekly digest, feedback loop) | Implemented | `docs/04_AI_ASSISTANT_MASTER.md`, `docs/05_AI_KNOWLEDGE_BASE.md`, and `docs/14_AI_ACCOUNTING_INTELLIGENCE_MASTER.md` cover explainable assistant roles, knowledge sources, deterministic/anomaly detection, tool-call safety, risk scoring, digest PDFs, and feedback actions. |
| Demo data seeding & verification | Implemented | `docs/DEMO_SEEDING.md`, README, and `scripts/demo-verify.js` / `scripts/verify-production.sh` describe guarded seeding (DEMO_MODE + ALLOW_DEMO_SEED flags) and verification of core endpoints. |
| Backup & disaster recovery | Implemented | `docs/DR.md` plus `scripts/ops/backup/*` and `scripts/ops/restore/*` cover AES-256 full dumps, WAL shipping, point-in-time recovery, and `scripts/ops/verify/verify-restore.js` verification steps. |
| CI/CD & release automation | Implemented | README + `package.json` scripts + `docs/11_DEPLOYMENT_AND_DEVOPS.md` describe lint/test/build/migrate pipelines, GitHub Actions, Docker releases, Gitleaks, and the release checklist. |
| Schema/migration safety & SQLite/Postgres parity | Implemented | `docs/audits/PHASE_2_DATABASE.md`, `docs/audits/POSTGRES_PARITY.md`, and `scripts/verify-schema.js` document additive, idempotent migrations with parity guarantees across databases. |
| Security & compliance controls | Implemented | `docs/06_SECURITY_GDPR_GERMAN_COMPLIANCE.md`, `docs/PHASE_3_GDPR_COMPLIANCE.md`, and `docs/TAX_LEGAL_DISCLAIMER.md` detail JWT, RBAC, rate limiting, GDPR exports/deletions, GoBD paste, and UStG guardrails. |
| Monitoring (Sentry, LogRocket, UptimeRobot) | Partial | `docs/11_DEPLOYMENT_AND_DEVOPS.md` lists these services as monitoring hooks; final alerting/config is still being staged. |
| Route & frontend coverage documentation | Implemented | `docs/audits/ROUTE_INVENTORY.md` and `docs/audits/FRONTEND_PAGE_INVENTORY.md` auto-generate audits of every backend route and UI page. |
| Asset management (Phase 3) | Planned | `docs/12_ROADMAP_AND_PHASES.md` includes asset management in Phase 3; no code yet. |
| Advanced audits (Phase 3) | Planned | `docs/12_ROADMAP_AND_PHASES.md` + `docs/audits/PHASE_3_ACCOUNTING.md` describe the upcoming advanced audit tooling. |
| SaaS billing / white-label / enterprise integrations (Phase 4) | Planned | `docs/12_ROADMAP_AND_PHASES.md` positions these scale-phase initiatives as future work. |
| DATEV export (design only) | Planned / Out-of-scope | `docs/_planned/10_INTEGRATIONS_DATEV_ELSTER_EMAIL.md` and `docs/DATEV_EXPORT_DESIGN.md` insist on design-only exports (no file generation or “DATEV-ready” claims). |
| ELSTER integration (design only) | Planned / Out-of-scope | `docs/GERMAN_TAX_INTEGRATION.md` and `docs/ELSTER_DESIGN_AND_LIMITATIONS.md` forbid any ELSTER API, submission, or automation; the doc is advisory only. |
| Production transactional email provider | Planned / Out-of-scope | `docs/_planned/10_INTEGRATIONS_DATEV_ELSTER_EMAIL.md` states SMTP/transactional email is future work; current email demos are gated. |

### Explicit Assumptions

- Production-grade features are covered by the documented CI/test gate (`README.md`) and runtime guard tests (`docs/audits/TEST_COVERAGE_RUNTIME_GUARDS.md`). 
- AI remains advisory, never files tax returns, and never executes unsupervised destructive edits (`docs/TAX_LEGAL_DISCLAIMER.md`, `docs/GERMAN_TAX_INTEGRATION.md`, `docs/14_AI_ACCOUNTING_INTELLIGENCE_MASTER.md`).
- DATEV/ELSTER exports and transactional email integration stay in Phase 3/4 roadmaps and are not part of this baseline (`docs/_planned/10_INTEGRATIONS_DATEV_ELSTER_EMAIL.md`, `docs/12_ROADMAP_AND_PHASES.md`).
- Demo seeding & verification require DEMO_MODE + ALLOW_DEMO_SEED for execution to avoid accidental production data seeding (`docs/DEMO_SEEDING.md`, `docs/audits/TEST_COVERAGE_RUNTIME_GUARDS.md`).
- Backups, WAL shipping, and disaster recovery follow the runbook commitments (RPO 15m, AES-256 dumps, WAL shipping, verification via `scripts/ops/verify/verify-restore.js`) in `docs/DR.md`.
- Schema/migration changes are additive/expand-only with cross-dialect parity checks (`docs/audits/PHASE_2_DATABASE.md`, `docs/audits/POSTGRES_PARITY.md`, `scripts/verify-schema.js`).

### Explicit Exclusions

- No DATEV or ELSTER API submissions, Zertifikat adoption, or tax filing automation (`docs/DATEV_EXPORT_DESIGN.md`, `docs/ELSTER_DESIGN_AND_LIMITATIONS.md`, `docs/TAX_LEGAL_DISCLAIMER.md`, `docs/GERMAN_TAX_INTEGRATION.md`).
- No claims of production-ready transactional email delivery; current email alerts are demo-only and future providers are roadmap work (`docs/_planned/10_INTEGRATIONS_DATEV_ELSTER_EMAIL.md`, `README.md`).
- No unauthorized tax automation or “ready to submit” statements; AI output is advisory-only (`docs/TAX_LEGAL_DISCLAIMER.md`, `docs/04_AI_ASSISTANT_MASTER.md`).
- No destructive database migrations; all change scripts follow additive/expand-only patterns (`docs/audits/PHASE_2_DATABASE.md`, `docs/audits/SCHEMA_MIGRATION_CHANGES.md`).
- Focus remains on German accounting law (UStG, GoBD, HGB, AO, GDPR); other national standards are explicitly out of scope (`README.md`, `docs/06_SECURITY_GDPR_GERMAN_COMPLIANCE.md`).

### Risks if Assumptions Are Wrong

| Assumption | Risk if Wrong |
| ---------- | ------------- |
| Documented features are production-grade & tested | Hidden bugs or regressions undermine the baseline and could invalidate audit coverage or CI gates. |
| AI is advisory only | Legal exposure, regulatory non-compliance, and reputational damage if AI were seen as filing taxes. |
| DATEV/ELSTER/email integrations are out-of-scope | Stakeholders might expect these features; premature scope creep could break contracts or audit readiness. |
| Demo seeding guard rails are mandatory | Seeder could run unintentionally and seed production data or bypass compliance controls. |
| Backups/DR runbooks always work | Failure would lead to data loss, extended downtime, and audit failures (RPO/RTO breaches). |
| Migrations remain additive & parity-checked | Schema drift or destructive migrations could corrupt Postgres/SQLite data, breaking deployments. |

**Gate: PASS** – Baseline scope, assumptions, and exclusions are explicit; no ambiguity remains for Phase 0 scope decisions.
