# ELSTER — Design & Limitations

## Legal Reality
- ELSTER is for official tax filing in Germany
- Any error in submission = direct legal responsibility

## Strict Limitations (Design Only)
- No API integration
- No data submission
- No test filing or simulation
- No automation
- No claims of “ready for submission”

## Allowed (Design Only)
- Explain ELSTER requirements
- Provide checklists for readiness
- Read-only validation rules
- Readiness score (e.g., “UStVA readiness: 88% – missing tax classification on 2 invoices”)

## UX Guidelines
- No “Submit” or “Send to ELSTER” actions
- Only “Prepare”, “Analyze”, “Explain”, “Export preview”
- Fixed label: “Design & Preparation only – no tax submission”
- Mandatory disclaimer: “SmartAccounting does not submit tax declarations.”

## Legal Responsibility Matrix
| Actor           | Responsibility         |
|-----------------|-----------------------|
| User            | Data correctness      |
| Steuerberater   | Tax filing            |
| SmartAccounting | Tool + preparation    |
| AI              | Explanation only      |

## Gate Criteria
- No API calls
- No tax submission
- No automation
- Clear, non-misleading UX
- Visible disclaimers
- AI advisory only
