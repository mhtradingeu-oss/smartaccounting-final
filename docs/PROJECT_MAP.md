🗺 SmartAccounting™ — Project Map
Technical Structure & Execution Guide
1. Purpose of This Document

This Project Map explains how SmartAccounting™ is physically and logically structured.

It is written for:

Developers & AI agents

Auditors & compliance reviewers

DevOps & infrastructure teams

New contributors onboarding the system

This document answers:

Where each part of the system lives

How frontend & backend connect

How the system is executed locally and in production

What is single-source vs shared

2. High-Level System Overview

SmartAccounting™ is a single-repository, full-stack application consisting of:

Layer	Technology
Backend	Node.js (ES Modules) + Express
Frontend	React + Vite + TailwindCSS
Database	SQLite (dev/demo), PostgreSQL (production)
AI Layer	Tool-based orchestration + rule engine
Deployment	Docker + Docker Compose

⚠️ Important
There is ONE backend only and ONE frontend only.
No duplicated or shadow services exist.

3. Repository Root Structure
SmartAccounting/
│
├── index.js                  # Backend entry point
├── package.json              # Backend dependencies & scripts
├── README.md                 # Master documentation (authoritative)
│
├── src/                       # Backend application (core)
├── client/                    # Frontend application
├── database/                  # Database files (dev/demo)
├── docs/                      # ALL official documentation
│
├── docker-compose.yml         # Development stack
├── docker-compose.prod.yml    # Production stack
│
├── backend/                   # Backend Docker artifacts only
├── logs/                      # Application logs
├── uploads/                   # Uploaded documents (GoBD relevant)
└── tests/                     # Automated tests

4. Backend Structure (Authoritative)
Location
/src

Entry Points

index.js → Application bootstrap

src/app.js → Express app configuration

Internal Structure
src/
├── app.js                     # Express setup & middleware chain
├── server.js                  # Optional server abstraction
│
├── config/                    # Environment & app configuration
├── models/                    # Sequelize models (DB schema)
├── routes/                    # API route definitions
├── services/                  # Business logic (VAT, invoices, AI tools)
├── middleware/                # Auth, RBAC, validation, security
├── utils/                     # Helpers, logging, formatting
├── lib/                       # Low-level utilities (DB, logger)
├── templates/                 # PDF / email templates
└── jobs/ (optional)           # CRON jobs (weekly digest, reminders)

Database (Development)
database/
└── smartaccounting.sqlite


🔒 Production uses PostgreSQL via Docker, not SQLite.

5. Frontend Structure
Location
/client

Tech Stack

React 18

Vite

TailwindCSS

Axios

i18next (multilingual support)

Structure
client/
├── index.html
├── vite.config.js
├── tailwind.config.js
│
├── src/
│   ├── components/            # Reusable UI components
│   ├── pages/                 # Route-based pages
│   ├── services/              # API communication
│   ├── context/               # Auth & global state
│   ├── hooks/                 # Custom React hooks
│   └── i18n/                  # Language resources
│
└── public/                    # Static assets

Development Run
cd client
npm install
npm run dev


Frontend runs on:

http://localhost:3000

6. Frontend ↔ Backend Communication

Backend runs on: http://localhost:5000

Frontend uses Vite proxy:

/api → http://localhost:5000/api


This avoids CORS issues in development.

7. Docker & Deployment Layout
Docker Files
Component	File
Backend	backend/Dockerfile
Frontend	client/Dockerfile
Dev Compose	docker-compose.yml
Prod Compose	docker-compose.prod.yml
Production Stack Includes

Backend (Node.js)

Frontend (Nginx + Vite build)

PostgreSQL

Persistent volumes

Health checks

Environment-based configuration

8. Documentation Structure (Critical)

All authoritative documentation lives here:

/docs


Includes:

System architecture

AI intelligence specification

German legal compliance

API contracts

Deployment & DevOps

Roadmap & phases

Government-ready presentations

❌ No documentation outside /docs is authoritative.

9. Execution Modes
Development

SQLite

Hot reload

Relaxed sync/migrations

Debug logging

Production

PostgreSQL

Immutable accounting data

GoBD-safe storage

Hardened security

AI audit logging

10. Cleanup & Refactoring Policy

Cleanup and refactoring must always be done in phases:

Structure audit

Dependency audit

Route & handler validation

Model & migration validation

AI tool safety validation

Compliance regression check

❌ No “big bang” refactors
✅ Always controlled, auditable phases

11. Single Source of Truth Rules

/docs = truth

Backend = one instance

Frontend = one instance

AI actions = logged & explainable

Accounting data = never overwritten

12. Final Statement

This Project Map guarantees that:

No duplicate systems exist

Every file has a defined purpose

AI agents can safely navigate the codebase

Auditors can understand system boundaries

Developers can onboard without ambiguity

🔗 README Link (/Users/nadeemnour/SmartAccounting/README.md)
