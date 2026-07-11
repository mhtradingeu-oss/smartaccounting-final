# SmartAccounting™ — Final Product Vision

## Final Product Source of Truth

**Status:** Authoritative
**Market:** Germany
**Scope:** Accounting Core, AI Accounting Intelligence, Human-Controlled Execution, German Compliance Preparation, Kanzlei Workspace, Production Operations.

## 1. Product Definition

SmartAccounting is a secure AI-assisted accounting operating system for German businesses, freelancers, finance teams, accountants, and accounting firms.

It combines:

- Professional accounting core
- Document and OCR intelligence
- AI accounting analysis and explainability
- Human-controlled approvals and execution
- DATEV / UStVA / Steuerberater preparation
- Period close and bank reconciliation
- Kanzlei / Mandanten workspace
- Immutable audit, recovery, security, and production operations

## 2. Governing Principle

The AI analyzes, explains, prioritizes, detects, recommends, and prepares.

The AI must not independently:

- Post final journal entries
- Send or move money
- Submit ELSTER
- Upload directly to DATEV
- Delete accounting evidence
- Modify posted entries
- Close or reopen accounting periods
- Perform legally binding accounting or tax decisions

Human authorization, permissions, company isolation, audit evidence, idempotency, and recovery are mandatory.

## 3. Final System Layers

### Layer 1 — Accounting Core

Invoices, expenses, customers, suppliers, chart of accounts, posting preview, posting, journal, ledger, reversal, VAT, reports, accounting periods, close, audit.

### Layer 2 — Document Intelligence

Secure uploads, OCR, digital PDF extraction, classification, field extraction, confidence, consistency checks, duplicate detection, reviewed values, decision fingerprint, draft preparation.

### Layer 3 — AI Accounting Intelligence

Risk detection, anomalies, VAT checks, missing documents, duplicate detection, bank suggestions, cash-flow forecasting, review prioritization, explainable insights, German accounting guidance.

### Layer 4 — Human-Controlled Execution

Approval queue, approve/reject, atomic claim, safe draft execution, immutable recovery evidence, idempotent completion, retries, execution timeline, recovery center.

### Layer 5 — German Compliance Preparation

VAT readiness, UStVA preparation, DATEV-compatible exports, Steuerberater packages, GoBD evidence, reproducible exports, retention and audit history.

### Layer 6 — Kanzlei Workspace

Mandanten dashboard, readiness per client, missing documents, approval queues, period status, package queues, team assignment, client requests, advisor notes.

### Layer 7 — Production Operations

Queues, monitoring, metrics, structured logs, backups, restore proof, disaster recovery, security, GDPR, GoBD, CI/CD, staging, release management.

## 4. Final Product Pages

### Overview

- Dashboard
- Smart Review Center
- Tasks and Notifications

### Accounting

- Invoices
- Expenses
- Documents / OCR Inbox
- Bank and Reconciliation
- Journal Entries
- General Ledger
- Chart of Accounts
- Customers
- Suppliers

### Intelligence

- AI Assistant
- AI Review
- AI Approval Queue
- AI Insights
- Risk Center
- Forecasting
- AI Policy and Capability Status

### Reports and Tax

- Reports Center
- Trial Balance
- Profit and Loss
- Balance Sheet
- General Ledger
- Account Statements
- Cash Flow
- AR/AP Aging
- VAT Center
- UStVA Preparation
- Tax Readiness
- DATEV / Steuerberater Packages
- Period Close

### Audit and Governance

- Audit Explorer
- Execution Timeline
- Recovery Center
- Security Activity
- Data Integrity and Export Evidence

### Kanzlei

- Kanzlei Dashboard
- Mandanten
- Mandant Workspace
- Team Tasks
- Client Requests
- Package Queue
- Advisor Notes

### Administration

- Companies
- Users
- Roles and Permissions
- Integrations
- AI Policies
- Notifications
- Settings
- Billing and Subscription

## 5. Core User Journeys

### Intelligent Document Journey

Upload → Security Scan → OCR → Classification → Extraction → Confidence → Human Review → Decision Fingerprint → AI Proposal → Approval → Atomic Claim → Safe Draft Creation → Recovery Evidence → Completion → Audit Timeline

### Invoice Journey

Draft → Validation → Issue → Posting Preview → Human Approval → Posting → Journal Entry → Customer Balance → Payment Match → Reports → Audit

### Expense Journey

Receipt → OCR → Review → Expense Draft → VAT Review → Posting Preview → Human Approval → Posting → Journal Entry → Bank Match → Reports → Audit

### Monthly Close Journey

Readiness Scan → Missing Documents → Bank Reconciliation → Draft Review → VAT Review → Approval Completion → Report Validation → Advisor Package → Close Approval → Period Lock → Snapshot → Audit Evidence

## 6. AI Capabilities

### Document AI

OCR, classification, extraction, confidence, validation, duplicate detection, cross-field checks, vendor recognition, VAT recognition.

### Accounting AI

Account suggestions, VAT suggestions, posting explanations, risk identification, anomaly detection, missing evidence, duplicate expenses.

### Bank AI

Match suggestions, partial-match proposals, duplicate transaction detection, reference interpretation, bank-fee recognition, unusual transactions.

### Reporting AI

Management summaries, trend and variance analysis, period comparison, revenue and expense drivers, explainable insights grounded in report data.

### Tax Preparation AI

VAT readiness, reverse-charge warnings, UStVA checks, missing evidence, period inconsistencies, advisor-question preparation.

### Compliance AI

GoBD readiness, missing audit links, retention warnings, access anomalies, export completeness.

### Workflow AI

Next best action, review prioritization, task generation, approval preparation, deadline reminders, recovery escalation.

### Kanzlei AI

Mandant summaries, readiness comparison, missing-document prioritization, client communication drafts, package summaries, workload prioritization.

## 7. Explainability Standard

Every AI proposal must show:

- What is proposed
- Why
- Evidence and source records
- Confidence
- Risk
- What approval will do
- What approval will not do
- Alternatives
- Whether professional review is needed

## 8. Safety and Governance

Mandatory:

- Backend and database as source of truth
- Company isolation
- Role enforcement
- Immutable audit
- Idempotency
- Recovery-first design
- No duplicate capability or service
- No unsafe direct AI execution
- No patch before truth scan
- Small single-purpose commits
- Runtime evidence before closure

## 9. Production Completion Criteria

The product is complete only when all of the following are certified:

- Accounting integrity
- Safe execution and recovery
- Period close and locking
- Bank reconciliation
- DATEV / advisor package
- VAT and UStVA preparation
- Kanzlei mode
- Final UX and multilingual accessibility
- Background jobs and notifications
- Security, GDPR, and GoBD hardening
- Backup and restore proof
- Observability
- Full regression, concurrency, load, migration, and security tests
- Staging certification
- Production deployment and release runbooks
- Commercial onboarding, billing, legal, and support readiness

## 10. Final Engineering Doctrine

Every phase follows:

Truth Scan → Documentation → Decision → Minimal Patch → Static Validation → Runtime Validation → Targeted Tests → Repository Verification → Commit → Push → Lock Document

No phase may be skipped or started before the previous phase is evidenced, committed, pushed, and locked.

## 11. Strategic Position

SmartAccounting does not replace DATEV, ELSTER, or a tax advisor.

It is the intelligent preparation, review, workflow, and safety layer before accounting data reaches the accountant, DATEV, or tax systems.
