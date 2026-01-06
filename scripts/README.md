# scripts/

Automation, verification, and operational scripts for **SmartAccounting**.

This directory contains **non-runtime** scripts used for:

- Environment validation
- Database migrations & integrity checks
- Demo seeding & verification
- CI/CD automation
- Operational tasks (backup, restore, audits)

These scripts are critical for **reliability, compliance, and production safety**, but are **not loaded by the application at runtime**.

---

## 📂 Script Overview

### 🔐 Authentication & Environment

- **`auth-readiness.js`**
  Verifies authentication prerequisites:
  - Database connectivity
  - Correct DB dialect (SQLite/Postgres)
  - `JWT_SECRET` presence

- **`dev-smoke.js`**
  Lightweight smoke test for local development (non-destructive).

---

### 🗄️ Database & Migrations

- **`check-migrations.js`**
  Confirms database connectivity and that tables exist after migrations.

- **`migrate-prod.js`**
  Production-safe migration runner with:
  - Environment validation
  - Sequelize migration execution
  - Required migration verification (Postgres)
  - SQLite-safe behavior

- **`verify-schema.js`**
  Verifies required tables and columns before demo seeding or audits.

- **`wait-for-postgres.js`**
  Blocks execution until Postgres container is ready (used in CI and Docker tests).

---

### 🎯 Demo & Seed Verification

- **`seed-demo-prod.js`**
  Guarded demo seeding script.
  Requires explicit environment flags to prevent accidental production execution.

- **`smoke-demo-seed.js`**
  Verifies that demo data exists and core read endpoints respond correctly.

- **`demo-verify.js`**
  API-level verification of seeded demo data (login, companies, invoices, expenses, AI).

---

### 🧪 Feature & System Audits

- **`system-audit.sh`**
  End-to-end system audit:
  - Docker startup
  - Backend & frontend health
  - Database connectivity
  - Postgres compliance tests

- **`feature-audit.sh`**
  Business-feature walkthrough audit:
  - Login
  - Company access
  - Invoice creation
  - Expense creation
  - AI endpoints (read-only)

- **`verify-core-api.sh`**
  Verifies that core authenticated API endpoints return valid responses.

- **`verify-production.sh`**
  Production or pre-production verification:
  - `/health` and `/ready`
  - Auth login
  - Key business endpoints

---

### 🧰 Operational Scripts (`ops/`)

Located in `scripts/ops/` — **for production operations only**.

#### Backup

- **`full-backup.sh`** — Full database backup
- **`incremental-wal.sh`** — WAL-based incremental backup (Postgres)

#### Restore

- **`full-restore.sh`** — Restore from full backup
- **`point-in-time.sh`** — Point-in-time recovery (Postgres)

#### Verification

- **`verify-restore.js`** — Validates restore integrity after recovery

---

## 🎯 Purpose & Usage

- Designed for **DevOps**, **CI/CD**, **QA**, and **production operations**
- Safe to run in **development**, **staging**, and **production** when used correctly
- Intended to provide **proof**, not assumptions

---

## ⚠️ Safety & Compliance Rules

- ❌ Scripts must **never** contain secrets or hardcoded credentials
- ❌ Scripts must **never** auto-seed production without explicit flags
- ✅ All destructive actions must be **guarded** (env flags, confirmations)
- ✅ Scripts should fail fast with **clear error messages**
- ✅ Output should be readable by humans and CI systems

---

## ✅ Guiding Principle

> **If a script can damage data, it must prove intent first.**
> **If a script claims success, it must provide evidence.**

These scripts are part of the **SmartAccounting compliance and reliability layer**.
