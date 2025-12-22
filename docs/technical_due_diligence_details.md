# SmartAccounting Technical Due Diligence Pack — Details

## 1. Architecture Diagram
- Modular backend/frontend
- AI governance layer: all AI actions are suggestions, never direct mutations
- Immutable audit log subsystem
- Human approval workflow engine

## 2. Phase Map (0–13)
- 0: Foundation
- 1–4: Core features, compliance scaffolding
- 5–9: AI integration, audit, automation
- 10–13: GoBD, DATEV, ELSTER, GDPR, security, and audit guarantees

## 3. Audit & Immutability Guarantees
- All actions logged, tamper-proof
- Data changes are reversible and traceable

## 4. AI Read-Only → Suggestion → Automation Separation
- AI can only suggest, never act autonomously
- Human review required for all changes

## 5. Security & Compliance Summary
- GDPR-compliant data handling
- GoBD, DATEV, ELSTER audit and export readiness
- Secure authentication, authorization, and encryption

## 6. Deployment & Operations
- Dockerized, scalable, production-ready
- Monitoring, alerting, and incident response in place

## 7. Documentation References
- See docs/ for compliance, architecture, and audit documentation
