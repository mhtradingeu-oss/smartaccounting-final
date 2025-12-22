.

🧠 SmartAccounting™ — Technology Stack & AI Architecture

Enterprise-Grade | AI-First | German-Law-Compliant

1. Purpose of This Document

This document defines all technologies, frameworks, architectural choices, and system tools used in SmartAccounting™.

It serves as a single source of truth for:

Developers & AI agents

Auditors & Steuerberater

DevOps & infrastructure teams

Investors & regulators

This file answers what is used, why it is used, and how it supports German compliance and AI safety.

2. High-Level Technology Overview
┌───────────────────────────────────────────────────────────────────────┐
│                  SmartAccounting™ Technology Layers                   │
├───────────────────────────────────────────────────────────────────────┤
│ Frontend        React 18 + Vite + TailwindCSS                          │
│ Backend         Node.js (ESM) + Express                                 │
│ Database        SQLite (dev/demo) → PostgreSQL (production)             │
│ ORM             Sequelize                                              │
│ AI Layer        Rule Engine + AI Orchestrator + Tool Execution          │
│ Authentication  JWT + bcrypt                                           │
│ Security        Helmet, RBAC, Rate Limiting, Audit Logs                 │
│ OCR             Tesseract.js                                           │
│ Reporting       PDF / CSV / DATEV-ready exports                         │
│ DevOps          Docker, Docker Compose                                  │
│ Documentation   Markdown + OpenAPI                                     │
└───────────────────────────────────────────────────────────────────────┘

3. Frontend Technologies
3.1 Core Stack
React 18

Component-based UI architecture

Hooks for state and lifecycle

Concurrent rendering support

Enterprise-ready ecosystem

Vite

Native ES module bundling

Extremely fast HMR

Production-optimized builds

Clean dev/prod parity

TailwindCSS

Utility-first design system

Consistent UI across dashboards

Dark mode ready

RTL-compatible (Arabic support)

3.2 State & Data Handling

React Context API for:

Authentication state

User roles

Company context

Custom Hooks:

useAuth

useApi

useLocalStorage

Axios for API communication

3.3 Internationalization (i18n)

Library: react-i18next

Supported languages:

🇩🇪 German (primary, legal terminology)

🇬🇧 English

🇸🇦 Arabic (RTL supported)

Auto-detect browser language

Locale-aware formatting (dates, numbers, currency)

4. Backend Technologies
4.1 Runtime & Framework
Node.js (ES Modules only)

Single runtime for entire backend

No CommonJS (require) usage

Clean import/export enforcement

Long-term maintainability

Express.js

Minimal, predictable HTTP framework

Explicit routing

Middleware-driven security model

AI-tool compatible request handling

4.2 Database Strategy
Development & Demo

SQLite

Fast local iteration

Deterministic demos

Zero setup friction

Production

PostgreSQL

ACID-compliant

High reliability

Strong auditing & indexing support

ORM

Sequelize

Explicit models

Controlled associations

Migration-ready

Database-agnostic design

Optional (Planned / AI)

pgvector

Semantic search

AI memory & document embeddings

5. AI Architecture Layer (Core Differentiator)

SmartAccounting™ is AI-first by design — not an add-on.

5.1 AI Components

AI Orchestrator

Routes user/system events

Injects context & policy

Deterministic Rule Engine

UStG, GoBD, HGB, AO, GDPR

Hard enforcement (non-negotiable)

AI Reasoning Layer

LLM + heuristics

Risk & anomaly detection

Tool Execution Layer

Invoices

VAT reports

Reminders

Exports

Audit & Feedback Loop

Human-in-the-loop

Acceptance / rejection learning

5.2 AI Safety Principles

❌ No destructive edits

✅ All actions logged

✅ Role-aware execution

✅ Explainable decisions only

✅ GoBD-compliant immutability

6. Compliance-by-Design (Germany)
Regulation	Technical Enforcement
GoBD	Immutable logs, versioned corrections, traceability
UStG	VAT rule engine, invoice §14 validation
HGB	Period locking, structured accounting
AO	Retention, audit readiness
GDPR / DSGVO	Data minimization, export, deletion
7. Security Architecture
Authentication

JWT tokens

Secure expiration & refresh

bcrypt password hashing

Authorization

Role-Based Access Control (RBAC)

Admin / Accountant / Auditor / Viewer

Planned: Steuerberater (read-only)

Protection

Helmet security headers

Rate limiting

Input validation

CORS hardening

Audit Logging

Every sensitive action logged

Who / what / when / why

Immutable storage

8. OCR & Document Processing

Tesseract.js

German language support

Invoice & receipt parsing

OCR text stored for:

Search

Audit

AI analysis

GoBD-safe document storage

9. Reporting & Exports

PDF generation

CSV exports

DATEV-ready data structures

ELSTER-ready VAT exports

Weekly AI-generated financial digests

10. Testing Stack
Backend

Jest

Supertest

Integration & security tests

Frontend

Vitest

React Testing Library

Coverage

Services

Routes

Security paths

Compliance logic

11. DevOps & Deployment
Containerization

Docker

Docker Compose (dev & prod)

Deployment Philosophy

Platform-agnostic

No vendor lock-in

Supports:

On-premise

Cloud (AWS, Azure, Hetzner)

Replit (reference deployment)

Environment Management

.env driven

No secrets in code

Production-safe defaults

12. Logging & Monitoring

Context-aware structured logging that enriches logs with AsyncLocalStorage metadata and redacts secrets for JSON-ready ingestion

Application logs

Audit logs

Health endpoints

Backup verification hooks

13. Development Workflow
npm install
cd client && npm install
npm run dev


Quality gates:

ESLint

Prettier

Tests

Manual compliance review

14. Future-Ready (Planned)

Redis caching

TypeScript migration

Advanced AI anomaly scoring

ELSTER deep integration

DATEV XML export

AI Ops / SuperAdmin intelligence

15. Final Statement

This technology stack guarantees:

German legal compliance by design

AI safety and explainability

Audit-proof accounting operations

Enterprise-grade scalability

AI-agent-ready architecture

SmartAccounting™ is not just software — it is a compliant, intelligent accounting system.
