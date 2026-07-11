# SmartAccounting™ Final Product Architecture Blueprint

## 1. Purpose

This document defines the final target architecture of SmartAccounting™.

It does not describe only what exists today.

It defines:

- what the final product must become
- how every product area connects
- how AI operates safely
- how users move through the system
- which engines must exist
- which pages must exist
- which capabilities must remain forbidden
- how implementation phases must be ordered

This document must always be read together with:

```text
docs/final-truth/SMARTACCOUNTING_FINAL_PRODUCT_VISION.md
docs/final-truth/audits/SMARTACCOUNTING_FULL_TRUTH_SCAN_*.txt
Final Codex Architecture Audit
```

---

# 2. Product Identity

SmartAccounting is:

```text
German Accounting Operating System
+
AI Accounting Intelligence
+
Human-Controlled Execution
+
Compliance Preparation
+
Kanzlei Workspace
+
Production Operations Platform
```

It is not:

- a chatbot
- a simple invoicing tool
- an autonomous accountant
- a DATEV replacement
- an ELSTER submission bot
- an uncontrolled AI automation layer

---

# 3. Final Product Architecture

```text
Workspace Layer
    ↓
Business / Company Context
    ↓
Accounting Core
    ↓
Document Intelligence
    ↓
AI Accounting Intelligence
    ↓
Review and Approval
    ↓
Safe Execution
    ↓
Recovery and Audit
    ↓
Reports and Compliance
    ↓
Advisor / Kanzlei Workflow
    ↓
Production Operations
```

---

# 4. Final Workspace Model

The final product must operate as a unified workspace.

The workspace contains:

- companies
- accounting periods
- users
- teams
- tasks
- documents
- accounting records
- AI conversations
- approvals
- decisions
- notifications
- audit events
- advisor packages
- saved views
- recent work
- favorites

The workspace must provide:

```text
Global Search
Command Palette
Activity Feed
Recent Work
Favorites
Saved Views
Notifications
Tasks
AI Assistant
Company Switcher
Role-Aware Navigation
```

---

# 5. Core Product Engines

## 5.1 Accounting Engine

Responsible for:

- invoices
- expenses
- customers
- suppliers
- chart of accounts
- journal entries
- ledger
- posting preview
- final posting
- reversal
- payments
- credit notes
- VAT
- reports
- period close

Authority:

```text
Backend + Database
```

---

## 5.2 Document Intelligence Engine

Responsible for:

- secure upload
- OCR
- digital PDF extraction
- classification
- field extraction
- confidence
- duplicate detection
- field validation
- reviewed values
- document fingerprints
- draft preparation

---

## 5.3 Review Engine

Responsible for:

- review queues
- warnings
- blockers
- missing evidence
- duplicate candidates
- tax issues
- bank issues
- approval items
- next best actions
- readiness scoring

Primary interface:

```text
Smart Review Center
```

---

## 5.4 Approval Engine

Responsible for:

- proposal persistence
- approve
- reject
- role validation
- company validation
- risk level
- decision reason
- expiry
- status transitions
- audit evidence

---

## 5.5 Safe Execution Engine

Responsible for:

- atomic execution claims
- ownership
- allowed-tool validation
- safe draft creation
- completion
- failure handling
- idempotency
- duplicate prevention

It must never directly perform:

- autonomous ledger posting
- payment
- bank transfer
- ELSTER submission
- direct DATEV upload
- deletion
- period close
- journal reversal

---

## 5.6 Recovery Engine

Responsible for:

- immutable recovery evidence
- locating existing drafts
- verifying company
- verifying fingerprint
- verifying document
- verifying tool
- verifying draft type
- completing execution without creating duplicates
- retry coordination
- stuck execution detection

---

## 5.7 Workflow Engine

Responsible for:

- tasks
- notifications
- reminders
- deadlines
- escalation
- assignments
- recurring checks
- background coordination

---

## 5.8 Bank Reconciliation Engine

Responsible for:

- bank statement import
- transaction normalization
- match suggestions
- invoice matching
- expense matching
- partial payments
- split transactions
- bank fees
- duplicate detection
- unmatched queue
- reconciliation confirmation
- statement close

---

## 5.9 Period Close Engine

Responsible for:

- accounting periods
- open and closed states
- readiness checklist
- lock enforcement
- reopen with reason
- snapshots
- year-end close
- retained earnings handling
- close audit trail

---

## 5.10 Reporting Engine

Responsible for:

- trial balance
- profit and loss
- balance sheet
- general ledger
- account statement
- cash flow
- AR aging
- AP aging
- VAT reports
- comparisons
- snapshots
- exports

---

## 5.11 German Compliance Engine

Responsible for:

- VAT readiness
- UStVA preparation
- tax-code mapping
- reverse charge
- EU B2B
- §19 preparation
- DATEV-compatible preparation
- Steuerberater packages
- GoBD evidence
- retention
- reproducible exports

---

## 5.12 Kanzlei Engine

Responsible for:

- Kanzlei organizations
- Mandanten
- staff assignments
- Mandant permissions
- advisor tasks
- client requests
- readiness comparison
- package queue
- advisor notes
- client communication
- Mandant audit

---

## 5.13 Search and Knowledge Engine

Responsible for:

- global search
- entity search
- document search
- accounting search
- audit search
- AI conversation search
- knowledge retrieval
- company memory
- decision history
- evidence retrieval

---

## 5.14 Audit and Event Engine

Responsible for:

- immutable audit events
- correlation IDs
- request IDs
- before/after values
- actor
- company
- source
- linked records
- execution timeline
- recovery timeline
- integrity evidence

---

## 5.15 Production Operations Engine

Responsible for:

- Redis
- background jobs
- retries
- dead-letter queue
- schedulers
- monitoring
- metrics
- structured logs
- tracing
- alerts
- backups
- restore
- disaster recovery
- CI/CD
- staging
- release management

---

# 6. Final AI Architecture

The final AI must operate as one governed intelligence system.

```text
User / Page / Voice / Automation
        ↓
AI Gateway
        ↓
AI Orchestrator
        ↓
Company Context + Role Context
        ↓
Capability Registry
        ↓
Grounded Reasoning
        ↓
Explanation and Evidence
        ↓
Proposal
        ↓
Approval
        ↓
Safe Execution
        ↓
Audit and Recovery
```

There must not be multiple independent AI brains.

---

# 7. AI Specialist Capabilities

The user experiences one AI assistant, but internally it can use specialist capabilities.

## Accounting Analyst

- explains reports
- detects accounting issues
- explains journals
- identifies missing postings
- compares periods

## Document Reviewer

- reviews OCR
- detects missing fields
- checks totals
- detects duplicates
- prepares drafts

## Tax Preparation Specialist

- explains VAT
- detects UStVA issues
- identifies reverse-charge risks
- prepares advisor questions
- explains tax readiness

## Bank Reconciliation Specialist

- proposes matches
- explains confidence
- detects duplicate transactions
- identifies partial payments
- detects bank fees

## Audit and Compliance Officer

- checks audit completeness
- detects missing evidence
- verifies immutable history
- checks GoBD readiness
- reports compliance gaps

## Financial Controller

- analyzes variance
- compares actual vs expected
- detects unusual expenses
- monitors margins
- monitors liquidity

## Risk Analyst

- ranks risks
- identifies urgent items
- detects anomalies
- prioritizes review queues

## Forecasting Specialist

- cash-flow forecast
- collection forecast
- recurring expense forecast
- scenario analysis

## Kanzlei Assistant

- summarizes each Mandant
- prioritizes missing documents
- prepares client messages
- summarizes packages
- compares readiness

---

# 8. AI Memory Architecture

AI memory must be structured and governed.

## Company Memory

Stores stable company facts and configuration.

## Accounting Memory

Stores derived accounting context from approved records.

## Document Memory

Stores document metadata, review results, fingerprints, and evidence.

## Decision Memory

Stores proposals, approvals, rejections, reasons, and outcomes.

## Conversation Memory

Stores scoped conversation context according to retention policy.

## Audit Memory

Stores immutable events and evidence references.

## Learning Memory

Stores approved patterns and user preferences without changing accounting truth.

AI memory must never override database truth.

---

# 9. AI Explainability Standard

Every AI output that affects work must contain:

```text
What
Why
Evidence
Source records
Calculation
Confidence
Risk
Alternatives
What approval will do
What approval will not do
Professional review requirement
```

---

# 10. AI Governance

Required:

- provider allowlist
- model registry
- prompt registry
- prompt versioning
- schema validation
- PII redaction
- cost monitoring
- usage limits
- company limits
- timeout
- fallback
- circuit breaker
- audit logging
- tool allowlist
- human approval
- adversarial testing

---

# 11. Final Navigation

## Home

- Dashboard
- Smart Review Center
- Tasks
- Notifications
- Activity Feed

## Accounting

- Invoices
- Expenses
- Documents
- Bank
- Journal
- Ledger
- Chart of Accounts
- Customers
- Suppliers

## Intelligence

- AI Assistant
- AI Review
- Approval Queue
- Insights
- Risk Center
- Forecasting
- Explainability Center

## Reports and Compliance

- Reports Center
- VAT Center
- UStVA Preparation
- Tax Readiness
- DATEV Packages
- Period Close

## Audit and Operations

- Audit Explorer
- Execution Timeline
- Recovery Center
- Security Activity
- System Health

## Kanzlei

- Kanzlei Dashboard
- Mandanten
- Team Tasks
- Client Requests
- Advisor Notes
- Package Queue

## Administration

- Companies
- Users
- Roles
- Integrations
- AI Policies
- Notifications
- Settings
- Billing

---

# 12. Final User Experience Features

The final workspace must include:

- global search
- command palette
- saved views
- filters
- sorting
- pagination
- bulk actions
- favorites
- recent work
- activity feed
- notification center
- task center
- keyboard shortcuts
- responsive layouts
- DE / EN / AR
- complete RTL
- accessibility
- role-aware actions
- explainable states
- safe confirmations

---

# 13. Final Product Journeys

## Document Journey

```text
Upload
→ Scan
→ OCR
→ Classification
→ Extraction
→ Review
→ Proposal
→ Approval
→ Safe Draft Execution
→ Recovery Evidence
→ Completion
→ Audit
```

## Invoice Journey

```text
Draft
→ Review
→ Issue
→ Posting Preview
→ Approval
→ Posting
→ Payment Matching
→ Reports
→ VAT
→ Advisor Package
→ Audit
```

## Expense Journey

```text
Receipt
→ OCR
→ Review
→ Expense Draft
→ VAT Review
→ Posting Preview
→ Approval
→ Posting
→ Bank Matching
→ Reports
→ Audit
```

## Bank Journey

```text
Import
→ Normalize
→ Detect Duplicates
→ Suggest Match
→ Review
→ Confirm
→ Reconcile
→ Statement Close
→ Audit
```

## Monthly Close Journey

```text
Readiness Scan
→ Missing Documents
→ Bank Reconciliation
→ Draft Review
→ VAT Review
→ Approval Completion
→ Report Validation
→ Advisor Package
→ Close Approval
→ Period Lock
→ Snapshot
→ Audit
```

## Kanzlei Journey

```text
Mandant Overview
→ Readiness Review
→ Missing Documents
→ Client Request
→ Accounting Review
→ Tax Review
→ Package Preparation
→ Advisor Approval
→ Period Close
→ Audit
```

---

# 14. Final Sequential Architecture

## Foundation Track

- Final vision lock
- Runtime source-of-truth lock
- AI authority lock
- Legacy classification
- capability registry
- dependency graph

## Execution Track

- safe execution API
- existing draft recovery
- execution timeline
- recovery center
- retry coordination

## Accounting Track

- period close
- customers and suppliers
- invoice posting
- credit notes
- AR/AP
- cash flow
- bank completion

## Compliance Track

- VAT certification
- UStVA preparation
- DATEV packages
- GoBD evidence
- advisor workflow

## AI Track

- unified orchestrator
- AI memory
- capability graph
- explainability
- risk and anomalies
- forecasting
- provider governance
- cost monitoring

## Workspace Track

- global search
- command palette
- activity
- recent work
- saved views
- notifications
- tasks
- final page UX

## Kanzlei Track

- mandate authorization
- Kanzlei organization
- team assignment
- Mandant workspace
- advisor workflow
- Kanzlei AI

## Operations Track

- queue
- workers
- notifications
- monitoring
- backup
- restore
- DR
- security
- GDPR
- staging

## Commercial Track

- onboarding
- billing
- subscriptions
- usage limits
- legal documents
- support
- production release

---

# 15. Immediate Engineering Order

The immediate implementation order is:

```text
F9  Controlled Safe Draft Execution
F10 Execution Timeline and Recovery Center
F11 Period Accounting and Close
F12 Master Data and Accounting Completion
F13 Bank Reconciliation
F14 Jobs, Notifications, and Operations
F15 German Compliance Packages
F16 AI Intelligence and Memory Expansion
F17 Workspace and Final UX
F18 Kanzlei Mode
F19 Security, GDPR, GoBD, and Recovery Certification
F20 Staging and Production Release
```

No later phase may bypass its dependency.

---

# 16. Non-Negotiable AI Boundaries

AI must never autonomously:

- post final journals
- pay or transfer money
- submit ELSTER
- upload directly to DATEV
- delete evidence
- modify posted entries
- close or reopen periods
- confirm reconciliation
- reverse journals
- make binding tax decisions

---

# 17. Final Product Completion Gate

SmartAccounting is complete only when:

- accounting integrity is certified
- safe execution is certified
- recovery is certified
- period close is certified
- bank reconciliation is certified
- DATEV and UStVA preparation are certified
- Kanzlei mode is certified
- AI governance is certified
- every final page is complete
- DE/EN/AR and RTL are complete
- notifications and jobs are operational
- restore has been proven
- staging has passed
- security testing has passed
- legal and billing readiness is complete
- version 1.0 is documented and releasable
