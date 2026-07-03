# DATEV / ELSTER Official Limitations

## Current Product Scope

SmartAccounting currently provides:

- DATEV-compatible export preparation for review by the user and/or Steuerberater.
- VAT and accounting summaries based on application records and posted journal entries.
- ELSTER/UStVA preparation concepts and limited export/preview workflows.

SmartAccounting currently does **not** provide:

- direct DATEV API upload,
- official DATEV certification,
- direct ELSTER submission,
- ERiC-based official ELSTER transmission,
- tax filing certification,
- binding tax advice.

## User-Facing Rule

Every user-facing DATEV or ELSTER workflow must avoid misleading language.

Use:

- “Prepare export”
- “Download for Steuerberater review”
- “Prepare UStVA data”
- “No direct tax submission”
- “Review with a qualified Steuerberater before filing”

Do not use:

- “Submit to ELSTER”
- “Send to Finanzamt”
- “Officially filed”
- “DATEV certified”
- “ELSTER connected”
- “100% compliant”
- “tax filing completed”

## DATEV Workflow

The current DATEV workflow prepares export files and records audit logs. The export is intended for review and further processing by the user or Steuerberater.

## ELSTER Workflow

The current ELSTER workflow is intentionally not a direct official submission workflow. Any official ELSTER integration would require a separate ERiC/certificate-based architecture, legal review, production/test environment separation, audit logging, and explicit user consent.

## Responsibility Boundary

SmartAccounting provides accounting workflow support, export preparation, and review evidence. Tax filing, payment decisions, legal classification, and final submission must be confirmed by the user and/or a qualified Steuerberater.
