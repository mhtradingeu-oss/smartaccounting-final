## 🛡️ Security Guardrails

- All dependencies are scanned in CI (`npm audit --audit-level=high`)
- Never commit secrets or credentials to the repository
- Use `.env.example` for environment variables, never `.env` in git
- For secret scanning, use tools like [truffleHog](https://github.com/trufflesecurity/trufflehog) or [gitleaks](https://github.com/gitleaks/gitleaks) before pushing
- Security headers, CORS, rate limiting, and helmet are always enabled in production

---

# 🧠 SmartAccounting™

## 🚀 Quickstart (Dev & Prod)

### Backend
```sh
cp backend/.env.example backend/.env
npm install
npm run dev
# or: npm run test, npm run lint, npm run db:migrate
```

### Frontend
```sh
cd client
cp .env.example .env
npm install
npm run dev
# or: npm run test, npm run lint
```

### Docker (Production)
```sh
cp .env.prod.example .env.prod
docker compose -f docker-compose.prod.yml up --build
```
> Copy `.env.prod.example` to `.env.prod` and replace the placeholder secrets before running the production compose stack.

### Database Init & Migrations
```sh
npm run db:migrate
# To seed admin user:
npm run db:seed
```

### First Run Checklist
- [x] .env files created
- [x] DB migrated
- [x] Admin user seeded
- [x] Lint/test pass
- [x] Docker up (optional)

---

## AI-Powered German Accounting & Compliance Intelligence

SmartAccounting™ is an **enterprise-grade, AI-first accounting platform** designed specifically for companies operating in **Germany**.

It combines:
- German accounting & tax law (UStG, GoBD, HGB, AO)
- Explainable, auditable artificial intelligence
- Secure, role-based workflows
- Multilingual professional UX (🇩🇪 🇬🇧 🇸🇦)

This is **not a bookkeeping tool** and **not a chatbot**.  
It is a **regulatory-aware accounting intelligence system**.

---

## 🎯 Core Mission

- Prevent VAT & accounting errors **before they occur**
- Enforce German law automatically (not optionally)
- Reduce manual accounting workload by **60–80%**
- Provide audit-ready, government-safe outputs
- Support human decisions — never silently override them

---

## 🧠 AI-First by Design

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

| Layer | Stack |
|-----|------|
| Frontend | React + Vite + TailwindCSS |
| Backend | Node.js (ESM only) + Express |
| Database | **PostgreSQL (production)** · SQLite (dev/demo) |
| ORM | Sequelize |
| Auth | JWT + Role-Based Access |
| AI | Tool-based orchestration + rule engine |
| Compliance | UStG · GoBD · HGB · AO · GDPR |
| Deployment | Docker · CI-ready · Cloud-ready |

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
  *(Design & decision history – internal use)*

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
