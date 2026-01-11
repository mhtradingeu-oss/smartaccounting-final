[![CI](https://github.com/mhtradingeu-oss/smartaccounting-final/actions/workflows/ci.yml/badge.svg)](https://github.com/mhtradingeu-oss/smartaccounting-final/actions/workflows/ci.yml)

# SmartAccounting™

## High-Level Overview

SmartAccounting™ is an enterprise-grade, AI-first accounting platform for German and EU compliance. It combines:

- German accounting & tax law (UStG, GoBD, HGB, AO)
- Explainable, auditable artificial intelligence
- Secure, role-based workflows
- Multilingual professional UX

## Quickstart

See [docs/PROJECT_MAP.md](docs/PROJECT_MAP.md) for project structure and setup.

## Documentation

All technical, compliance, and architecture documentation is in the [docs/](docs/) directory. Canonical documents include:

- [02_SYSTEM_ARCHITECTURE.md](docs/02_SYSTEM_ARCHITECTURE.md)
- [06_SECURITY_GDPR_GERMAN_COMPLIANCE.md](docs/06_SECURITY_GDPR_GERMAN_COMPLIANCE.md)
- [14_AI_ACCOUNTING_INTELLIGENCE_MASTER.md](docs/14_AI_ACCOUNTING_INTELLIGENCE_MASTER.md)
- [PHASE_3_AUDIT.md](docs/PHASE_3_AUDIT.md)

For a full list, see [docs/DOCUMENTATION_AUDIT.md](docs/DOCUMENTATION_AUDIT.md).

## Security & Compliance

### SECURITY NOTE: Production Secrets

**Never commit real secrets (e.g., JWT_SECRET, database, Stripe, or email credentials) to the repository.**

- All production secrets must be injected via server environment variables or a secure secret manager.
- The file `.env.prod` must never be committed; only `.env.prod.example` is tracked for reference.
- See `docs/operations/secret-rotation-checklist.md` for rotation and incident response.

If you find a secret in the repository, rotate it immediately and follow the checklist.

Security, GDPR, GoBD, and audit guarantees are described in the canonical docs above.

## CI / Test Gate

- `npm run lint` (backend ESLint + TypeScript rules keep the codebase clean).
- `npm test` now runs Jest plus the new production smoke suite (auth login, `/api/companies`, `/api/invoices` via `supertest`) so API contracts are exercised before merging.
- `npm run smoke:frontend` builds the React client (`client` package) to catch frontend build regressions early.
- `.github/workflows/ci.yml` chains lint → Jest → frontend bundle → Docker build → Gitleaks secret scan (the Gitleaks step now receives `GITHUB_TOKEN` so the action can report with proper auth).

## License

SmartAccounting™ is proprietary software. Commercial, SaaS, and white-label licensing available.

SmartAccounting™ AI acts as:

- a **virtual senior accountant**
- a **compliance & audit guard**
- a **risk and anomaly detector**
- an **explainable decision assistant**

### AI Principles

- 🇩🇪 German-law-first
- 🧾 GoBD-safe (non-destructive, traceable)
- 👤 Human-in-the-Loop
- 🔍 Explainable & auditable
- 🏛 Government-ready

> 📘 Full AI constitution & guarantees:
> `docs/14_AI_ACCOUNTING_INTELLIGENCE_MASTER.md`

---

## 🏗 Technical Overview

| Layer      | Stack                                           |
| ---------- | ----------------------------------------------- |
| Frontend   | React + Vite + TailwindCSS                      |
| Backend    | Node.js (ESM only) + Express                    |
| Database   | **PostgreSQL (production)** · SQLite (dev/demo) |
| ORM        | Sequelize                                       |
| Auth       | JWT + Role-Based Access                         |
| AI         | Tool-based orchestration + rule engine          |
| Compliance | UStG · GoBD · HGB · AO · GDPR                   |
| Deployment | Docker · CI-ready · Cloud-ready                 |

---

## 🇩🇪 German Compliance Coverage

- GoBD-compliant immutable audit logs
- VAT logic: 19% / 7% / 0% / Reverse-Charge
- Kleinunternehmerregelung
- EÜR, UStVA, tax forecasting
- DATEV/ELSTER preparation exports (design-only, no submission)
- GDPR data rights (export / deletion)

---

## 📚 Documentation Map (Authoritative)

All system knowledge lives in `/docs`:

### Executive & Vision

- `00_EXECUTIVE_SUMMARY.md`
- `01_PRODUCT_VISION_AND_SCOPE.md`

### Architecture & Core

- `02_SYSTEM_ARCHITECTURE.md`
- `03_CORE_FEATURES.md`
- `08_API_AND_DATA_MODEL_OVERVIEW.md`

### AI & Intelligence

- `04_AI_ASSISTANT_MASTER.md`
- `05_AI_KNOWLEDGE_BASE.md`
- `14_AI_ACCOUNTING_INTELLIGENCE_MASTER.md`

### Security & Compliance

- `06_SECURITY_GDPR_GERMAN_COMPLIANCE.md`

### UX, Integrations & Ops

- `09_FRONTEND_DASHBOARDS_AND_UX.md`
- `10_INTEGRATIONS_DATEV_ELSTER_EMAIL.md`
- `11_DEPLOYMENT_AND_DEVOPS.md`

### Roadmap & Governance

- `12_ROADMAP_AND_PHASES.md`
- `13_GOVERNMENT_READY_PRESENTATION.md`

### Internal Reference

- `15_CHAT_CONSOLIDATED_MASTER.md`
  _(Design & decision history – internal use)_

---

## 🚀 Development

```bash
# Backend
npm install
npm run dev

# Frontend
cd client
npm install
npm run dev
Frontend: http://localhost:3000
Backend API: http://localhost:5000
```

## Session management & logout

- Sessions are backed by the JWT that lives in `localStorage` (key `token`). `AuthContext` refreshes the token silently when possible, exposes rate-limit metadata on login, and continues working even if the secure auth cookie is not being replayed (e.g., during local HTTP testing).
- The top-right profile menu now surfaces your role, a read-only badge when applicable, and a logout action that clears the token (⌘Q) and redirects to `/login`.
- The app also listens for server-pushed logout events so shared sessions are invalidated centrally; reloading the page after the logout continues to enforce the new authentication state.
- Use the `SECURE_COOKIES` flag (`true`/`false`) to toggle the `Secure` attribute on the JWT and refresh cookies. Set it to `false` when running with `NODE_ENV=production` on `http://localhost`, but keep it `true` for real HTTPS deployments.

## Admin bootstrap

Provision the system administrator with `node scripts/create-admin.js`. The script accepts values either via CLI flags (`--company-name`, `--company-tax-id`, `--company-address`, `--company-city`, `--company-postal`, `--company-country`, `--user-email`, `--user-password`, `--user-first-name`, `--user-last-name`) or the matching `ADMIN_*` environment variables that also feed the seeder. It deduplicates the company by tax ID and creates the admin user only once, so running it multiple times is safe as long as the same email is provided.

## ⚠️ Demo data seeding

Use the guarded demo seeder for local sandboxes or demo deployments only. It refuses to run unless **both** `DEMO_MODE=true` and `ALLOW_DEMO_SEED=true`.

### Local (SQLite)

```bash
USE_SQLITE=true NODE_ENV=development DEMO_MODE=true ALLOW_DEMO_SEED=true npm run db:seed:demo
USE_SQLITE=true NODE_ENV=development DEMO_MODE=true ALLOW_DEMO_SEED=true npm run db:seed:demo:reset
```

### Docker / Production-style demos

```bash
docker compose -f docker-compose.prod.yml run --rm backend \
  /bin/sh -c "DEMO_MODE=true ALLOW_DEMO_SEED=true npm run db:seed:demo"
docker compose -f docker-compose.prod.yml run --rm backend \
  /bin/sh -c "DEMO_MODE=true ALLOW_DEMO_SEED=true npm run db:seed:demo:reset"
```

After the guarded demo seeder completes it emits a **Login sheet** (email, role, password) for each demo account so you can copy credentials without guessing.

The seeded dataset now covers invoices in every major status, expenses (draft/booked/archived), bank statements with matched and unmatched transactions, ledger entries, AI insights + decisions, a VAT report stub, and audit logs so every screen surfaces data. The login sheet lists the four demo roles: `demo-admin@demo.com`, `demo-accountant@demo.com`, `demo-auditor@demo.com`, and `demo-viewer@demo.com`, all sharing the password defined via `DEMO_PASSWORD` (default `Demo123!`).

### End-to-end production verification

The new script `scripts/verify-production.sh` runs the sequential checks that every deployment should cover: `/health`, `/api/auth/login`, `/api/dashboard/stats`, `/api/invoices`, `/api/expenses`, `/api/bank-statements`, and `/api/ai/insights`. It logs a warning if the container marker is absent, prints each step as it runs, and exits with `0` only when every endpoint responded successfully.

#### Inside the backend container (recommended)

```bash
docker compose -f docker-compose.prod.yml run --rm backend \
  bash -c "PRODUCTION_VERIFY_BASE_URL=http://localhost:5000 bash scripts/verify-production.sh"
```

#### From the host

```bash
PRODUCTION_VERIFY_BASE_URL=http://localhost:5000 bash scripts/verify-production.sh
```

Use `PRODUCTION_VERIFY_BASE_URL` to point the script at another host or port if needed. The script requires `python3` (used to extract the bearer token from the login response).

See `docs/audits/ROUTE_INVENTORY.md` for the full backend route list.

See `docs/DEMO_SEEDING.md` for more context.

🛡 Security & Audit Guarantees

- No destructive edits (GoBD-safe)
- Full audit trail for all actions
- Role-based permissions everywhere
- GDPR-compliant data handling
- AI actions are logged & explainable

🎯 Intended Audience

- Developers & Architects
- Accounting & Tax Professionals
- Auditors & Steuerberater
- Government & Compliance Reviewers
- Investors & Enterprise Clients

📄 License
SmartAccounting™ is proprietary software.
Commercial, SaaS, and white-label licensing available.

## Manual UI Walkthrough: Invoices Module (Phase 1)

To verify the invoices module is fully functional:

1. Log in as demo-accountant@demo.com (password: demopass2).
2. Select the seeded demo company.
3. Go to the Invoices page:

- You should see a list of demo invoices (from seeder).
- Filtering, searching, and pagination should work.
- Viewer/Auditor roles: no create/edit buttons.
- Accountant/Admin: can create and edit invoices.

4. Click an invoice to view/edit details:

- All fields and status transitions should be visible.
- Read-only for non-editable roles/statuses.

5. Create a new invoice:

- Fill required fields, submit, and verify redirect to list/details.
- Errors (e.g., missing fields, API errors) are shown clearly.

6. Console must be clean (no errors/warnings).

## Manual UI Walkthrough: Dashboard KPIs (Phase 2)

To verify the dashboard KPIs:

1. Log in as demo-accountant@demo.com (password: demopass2).
2. Select the seeded demo company.
3. Go to the Dashboard page:
   - You should see real numbers for:
     - Total Revenue (current month)
     - Total Expenses (current month)
     - Net Balance
     - Invoice count by status (paid/unpaid)
     - Recent invoices (last 5)
   - Switching company updates all KPIs.
   - Viewer role: dashboard is read-only.
   - No console errors or warnings.

## Manual UI Walkthrough: Expenses & Bank Statements (Phase 3)

To verify Expenses and Bank Statements modules:

### Expenses

1. Log in as demo-accountant@demo.com (password: demopass2).
2. Select the seeded demo company.
3. Go to the Expenses page:

- You should see demo expenses from the seeder.
- Create a new expense and verify it appears in the list.
- Viewer role: no create button, read-only.
- Dashboard KPIs update after adding expenses.
- No console errors or warnings.

### Bank Statements

1. Go to the Bank Statements page:

- You should see demo bank statements from the seeder.
- Click "View transactions" to see statement transactions.
- Viewer role: read-only, no upload/delete/reprocess actions.
- No console errors or warnings.

## Manual UI Walkthrough: AI Advisor (Phase 4)

To verify AI Advisor insights:

1. Log in as demo-accountant@demo.com (password: demopass2).
2. Select the seeded demo company.
3. Visit `/ai-advisor` (AI Advisor insights page):

- You should see AI-generated insights for invoices (unpaid/overdue), expenses (spikes/anomalies), and cashflow signals.
- Each insight shows title, explanation, severity, and is labeled as "Advisory Only".
- Viewer role: summary or limited insights only.
- No actions or data changes are possible.
- No console errors or warnings.

If no insights appear, check that demo data is seeded and company is selected.

- 📍 [Project Map & System Layout](docs/PROJECT_MAP.md)
