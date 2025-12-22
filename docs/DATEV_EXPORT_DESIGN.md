# DATEV Export — Design Only

## Scope
- Define DATEV export schema for accounting data
- Specify Kontenrahmen (SKR03/SKR04), Buchungssätze, Steuerkennzeichen
- Prepare data for export (design and mapping only)
- UX must clearly state: “Export vorbereiten – kein DATEV-Upload”

## Non-Scope (Strictly Prohibited)
- No generation of official DATEV files
- No guarantee of 100% DATEV compliance
- No claims of “DATEV-ready”
- No direct upload or API integration

## Design Elements
### Kontenrahmen
- Support for SKR03 and SKR04 frameworks
- Mapping of accounts to DATEV standards

### Buchungssätze
- Structure for booking records
- Fields: Datum, Konto, Gegenkonto, Betrag, Steuerkennzeichen, Buchungstext

### Steuerkennzeichen
- Design for tax code mapping
- Read-only validation, no automated assignment

### Export Preparation
- Data is prepared for export only
- User must review and confirm correctness
- No automated submission or upload

## UX Guidelines
- Button: “Export vorbereiten”
- Label: “Design & Preparation only – no tax submission”
- Mandatory disclaimer: “SmartAccounting does not submit tax declarations.”

## Legal & Compliance
- User responsible for data correctness
- Steuerberater responsible for tax filing
- SmartAccounting provides tools and preparation only
- AI provides insights, not actions

## Gate Criteria
- No API calls
- No file generation
- No submission
- Clear, non-misleading UX
- Visible disclaimers
