📘 Advisor Technical & Legal Documentation Pack

SmartAccounting – German Accounting System

This document is intended for Steuerberater, Wirtschaftsprüfer, and auditors to understand the technical, legal, and compliance architecture of SmartAccounting in accordance with GoBD, HGB, AO, UStG, GDPdU, DATEV, and ELSTER requirements.

1️⃣ System Architecture Overview

SmartAccounting is a modular, audit-safe accounting platform designed specifically for German accounting requirements.

Backend Architecture

- Node.js / Express backend
- PostgreSQL as authoritative ledger database
- Clear separation of:
  - Models
  - Validators
  - Services
  - Routes
- Strict request validation and transaction boundaries

Core Accounting Modules

- Invoices (AR)
- Expenses (AP)
- Bank Statements (CAMT.053 / MT940 / OCR fallback)
- Matching & Reconciliation
- VAT Aggregation & Reporting
- Export modules (DATEV, GDPdU, ELSTER)

Audit & Immutability

- Immutable audit log for every financial mutation
- Request-level traceability (requestId, userId, companyId)
- No silent changes or background recalculations

2️⃣ Compliance Features (GoBD / HGB / AO)
GoBD Compliance

Immutability:
Financially relevant records cannot be altered after posting/reconciliation.

Traceability:
Every create, import, reconciliation, and export action is logged.

Completeness:
No deletion of accounting data; only reversals or corrections via new entries.

GDPdU / IDEA Readiness

- Full transaction export
- Raw imported payloads preserved
- Change history retained
- Time-period filtering supported

VAT (UStG)

- VAT is calculated server-side only
- No user-supplied VAT totals accepted
- Supports:
  - 19%, 7%
  - Reverse charge
  - EU acquisitions
  - Partial & overpayments
- Tax-relevant dates are payment-based (not mutable)

3️⃣ Data Flow & Internal Controls
Bank Import

- CAMT.053 / MT940 XML
- OCR fallback for PDF/images
- Raw statements stored immutably

Matching Engine

- Read-only matching suggestions
- No financial mutation during matching
- Fully reversible until reconciliation

Reconciliation & Locking

- Explicit user confirmation required
- Sets tax-relevant payment date
- Locks:
  - Bank transaction
  - Linked invoice/expense
- Prevents retroactive changes

Export Control

- Only locked & confirmed records are exportable
- Draft, pending, or unlocked records are excluded

4️⃣ Legal Safeguards
GoBD

- No overwrite of accounting data
- Full audit trail with timestamps
- Clear separation between draft and posted data

GDPdU

- Machine-readable exports
- Chronological integrity
- No loss of historical data

ELSTER / UStVA

- VAT aggregation per tax key
- Period-locked reporting
- Cross-check against journal and DATEV exports
- Export-only (no auto-submission)

DATEV

- Zahlungsverkehr (payments)
- Open items & clearing accounts
- SKR03 / SKR04 compatible mapping
- CSV format with DATEV-safe quoting

5️⃣ Technical Safeguards

- All writes are transactional
- No recalculation during export
- No implicit state transitions
- Locks are explicit and irreversible
- Background jobs are read-only
- Strict company isolation (multi-tenant safe)

6️⃣ Integration & Extensibility
API Design

- REST-based
- Version-safe endpoints
- Read-only exports
- Clear separation between:
  - Operational APIs
  - Audit/export APIs

Extensibility

- Modular service architecture
- New exports or integrations do not affect core ledger
- Advisor tooling can be extended without compliance risk

7️⃣ Advisor Guarantees

SmartAccounting guarantees that:

✔ No financial data is altered without audit trace
✔ VAT values cannot be manipulated by users
✔ Exports reflect exact ledger state
✔ Reconciled data is legally immutable
✔ All German accounting standards are respected

📂 Reference Documentation

For deeper technical or legal inspection, see:

docs/06_SECURITY_GDPR_GERMAN_COMPLIANCE.md
docs/08_API_AND_DATA_MODEL_OVERVIEW.md
docs/11_DEPLOYMENT_AND_DEVOPS.md
docs/13_GOVERNMENT_READY_PRESENTATION.md

🎯 Final Assessment (for Advisors)

SmartAccounting is suitable for use in German accounting environments, including collaboration with Steuerberater, external auditors, and tax authorities, and is technically prepared for Betriebsprüfung, DATEV exchange, and ELSTER reporting.
