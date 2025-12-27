npm run db:seed

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
- DATEV-ready & ELSTER-ready exports
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

### Verification helper

`npm run demo:verify` (with `USE_SQLITE=true NODE_ENV=development JWT_SECRET=<secret>`) logs in as the seeded admin and confirms `/api/companies`, `/api/invoices`, and `/api/bank-statements` all return seeded objects. See `docs/DEMO_SEEDING.md` for more context.

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

### Project Structure

- 📍 [Project Map & System Layout](docs/PROJECT_MAP.md)
