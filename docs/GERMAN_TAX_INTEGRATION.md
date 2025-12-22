# German Tax Integration — Design & Legal Only

## Scope & Non-Scope

### In Scope (Design Only)
- Define types of tax integration
- Separate DATEV from ELSTER
- Clarify legal responsibilities
- Specify allowed and prohibited system actions
- Prepare clear, non-misleading UX
- Link integration to AI (analysis/preparation only)

### Out of Scope (Strictly Prohibited)
- Any real API with ELSTER
- Any tax data submission
- Any Zertifikat adoption
- Any tax automation
- Any “ready to submit” claims
- Any code implementation

## Tax Integration Classification
| Integration      | Type         | Risk   | Status      |
|-----------------|--------------|--------|-------------|
| DATEV           | Export (Files)| Medium | Design Only |
| ELSTER          | Filing        | High   | Design Only |
| VAT Calc        | Read-only     | Low    | Allowed     |
| GoBD Logs       | Audit         | Mandatory | Active   |
| AI Tax Insights | Advisory      | Low    | Allowed     |

## DATEV — Design Only
- Define DATEV export schema
- Specify Kontenrahmen (SKR03/SKR04), Buchungssätze, Steuerkennzeichen
- Data preparation for export only
- Prohibited: Generating official DATEV files, guaranteeing 100% compliance, claiming “DATEV-ready”
- UX: “Export vorbereiten – kein DATEV-Upload”

## ELSTER — Design Only
- ELSTER = official tax filing, direct legal responsibility
- Strictly prohibited: API, submission, test filing, simulation
- Allowed: Requirements explanation, checklists, validation rules (read-only), readiness score
- Example: “UStVA readiness: 88% – missing tax classification on 2 invoices”

## Legal Responsibility Matrix
| Actor           | Responsibility         |
|-----------------|-----------------------|
| User            | Data correctness      |
| Steuerberater   | Tax filing            |
| SmartAccounting | Tool + preparation    |
| AI              | Explanation only      |

- Mandatory disclaimers in all UI: “SmartAccounting does not submit tax declarations.”

## AI + German Tax
- AI does NOT: send ELSTER, create DATEV files, change VAT, perform final auto-classification
- AI DOES: explain VAT gaps, detect inconsistencies, prepare exports, simulate readiness, answer “why” questions
- All AI output = insight only

## UX & Messaging Rules
- Strictly prohibited: “Submit”, “Send to ELSTER”, “Auto VAT”
- Allowed: “Prepare”, “Analyze”, “Explain”, “Export preview”
- Fixed label: “Design & Preparation only – no tax submission”

## Documentation Outputs
- GERMAN_TAX_INTEGRATION.md
- DATEV_EXPORT_DESIGN.md
- ELSTER_DESIGN_AND_LIMITATIONS.md
- TAX_LEGAL_DISCLAIMER.md
- Update SYSTEM_GUARANTEES.md
- Update AI_READINESS.md

## Gate (Must Pass)
- No API calls
- No tax submission
- No automation
- Clear UX
- Visible disclaimers
- AI advisory only
- Any implementation = FAIL
