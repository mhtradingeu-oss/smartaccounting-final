# F13 — DATEV BWA Golden Reference Contract

## Status

REFERENCE CONTRACT — IMPLEMENTATION NOT YET CERTIFIED

## Purpose

This document defines the approved reference boundary for building
SmartAccounting BWA support against the supplied DATEV BWA Jahresübersicht
examples.

It does not certify that SmartAccounting currently produces an original
DATEV document or a complete DATEV-compatible SKR04 BWA.

## Reference Documents

The supplied reference set contains two DATEV BWA Jahresübersicht reports:

- BWA through April 2024
- BWA through July 2024

The reference characteristics include:

- BWA-Nr. 1
- DATEV-BWA form
- SKR04
- calendar-year monthly overview
- cumulative period column
- Wareneinsatz based on Wareneinkauf
- preliminary accounting result

## Golden Row Order

The target row vocabulary and order is:

1. Umsatzerlöse
2. Bestandsveränderungen FE/UE
3. Aktivierte Eigenleistungen
4. Gesamtleistung
5. Material-/Wareneinkauf
6. Rohertrag
7. Sonstige betriebliche Erlöse
8. Betrieblicher Rohertrag
9. Personalkosten
10. Raumkosten
11. Betriebliche Steuern
12. Versicherungen/Beiträge
13. Besondere Kosten
14. Fahrzeugkosten
15. Werbe-/Reisekosten
16. Kosten Warenabgabe
17. Abschreibungen
18. Reparatur/Instandhaltung
19. Sonstige Kosten
20. Gesamtkosten
21. Betriebsergebnis
22. Zinsaufwand
23. Sonstiger neutraler Aufwand
24. Neutraler Aufwand
25. Zinserträge
26. Sonstiger neutraler Ertrag
27. Verrechnete kalkulatorische Kosten
28. Neutraler Ertrag
29. Kontenklasse unbesetzt
30. Ergebnis vor Steuern
31. Steuern Einkommen und Ertrag
32. Vorläufiges Ergebnis

## Current SmartAccounting Definition

The current implementation is:

- definition ID: de-bwa-01-skr03
- version: 1
- chart system: SKR03
- row count: 25
- preliminary: true

The current definition provides the main BWA calculation skeleton but does
not represent the complete SKR04 DATEV BWA-Nr. 1 reference contract.

## Current Coverage Gaps

The current definition does not separately represent all reference rows.

Missing or collapsed boundaries include:

- Besondere Kosten
- Zinsaufwand
- Sonstiger neutraler Aufwand
- Zinserträge
- Sonstiger neutraler Ertrag
- Verrechnete kalkulatorische Kosten
- Kontenklasse unbesetzt

The current rows Neutraler Aufwand and Neutraler Ertrag aggregate concepts
that the reference displays separately.

The current Summe Kosten label must be reviewed against the reference label
Gesamtkosten.

Many current account rows have no executable account matchers and therefore
must not be considered complete account mapping.

## SKR04 Authority Decision

The existing file docs/DATEV_MAPPING_SKR04.md is a legacy design note.

It contains example accounts and ellipses, but does not define:

- complete BWA account ranges
- complete role mappings
- complete cost mappings
- neutral account mappings
- versioned source authority
- golden expected calculations

It must not be used by itself as an executable SKR04 BWA definition.

A new versioned SKR04 contract must be validated separately.

## DATEV Export Blocking Finding

The current DATEV export route accepts both skr03 and skr04 as query values.

The current datevExportService contains placeholder schema resolution and
shows SKR03 account codes in its default account structure.

Until separately certified, SmartAccounting must not claim that selecting
skr04 produces a correct SKR04 DATEV export.

The following failure mode must be prevented:

- metadata indicates SKR04
- exported booking accounts remain SKR03 accounts

## Chart-System Authority Boundary

No certified company-level accounting chart authority was found.

The final architecture must not rely only on a client query parameter to
choose SKR03 or SKR04.

The future authority chain must be:

Company Accounting Configuration
→ authoritative chart system
→ chart accounts
→ BWA definition
→ DATEV export mapping

Account metadata may support validation but must not conflict with the
company-level authority.

## Historical Recalculation Finding

The April and July reference reports show that values for earlier months may
change after later accounting entries or adjustments.

Therefore two modes must remain distinct:

### Live BWA

Recalculated from the current posted ledger state.

### Frozen BWA Artifact

Generated from a defined source cutoff and preserved with immutable evidence.

A historical frozen artifact must preserve at least:

- company ID
- report year
- selected month
- definition ID
- definition version
- chart system
- source cutoff
- source hash
- generated timestamp
- generated user
- period status
- export format
- artifact checksum

## Period-Lock Decision

No certified accounting-period close and lock runtime was found.

Existing migrations containing the word lock concern other accountability or
immutability controls and do not certify accounting-period locking.

Period locking, reopening, and reopening reason evidence require a separate
governed phase.

## Report-Snapshot Decision

No certified ReportSnapshot or ExportArtifact runtime was found.

The current BWA API is a live read model.

It must not be represented as an immutable historical artifact.

## Current Export Boundary

The generic financial report exporter supports:

- JSON
- CSV

It currently has no BWA:

- export columns
- flattening contract
- report builder registration

It currently has no certified:

- PDF
- XLSX
- BWA artifact
- DATEV-style BWA renderer

## Branding and Legal Representation

A future SmartAccounting BWA may use a DATEV-inspired accounting structure
for compatibility and accountant review.

It must not:

- use the DATEV logo without authorization
- claim to be an original DATEV document
- imply DATEV certification
- conceal that SmartAccounting generated the document

The output must identify itself as SmartAccounting-generated preparation and
review output.

## Mandatory Governance Rules

- No SKR04 implementation from incomplete placeholder documentation.
- No client-controlled chart-system authority.
- No silent fallback from SKR04 to SKR03.
- No DATEV compatibility claim without exact contract validation.
- No immutable-history claim without snapshot evidence.
- No historical reproducibility claim without source hash and definition version.
- No PDF work before the row and mapping contracts are certified.
- No direct DATEV upload or ELSTER submission through this BWA phase.
- Existing SKR03 BWA behavior must remain backward compatible.
- All production changes require targeted tests and company-isolation proof.

## Approved Next Phases

### F13-R10-C — Chart-System Authority Truth and Design

Define the authoritative source for a company’s SKR03 or SKR04 selection and
its relationship to ChartAccount metadata and exports.

### F13-R11 — Versioned SKR04 BWA Definition

Create a new versioned definition only after mapping authority is approved.

### F13-R12 — Golden Fixture Validation

Validate calculated rows and formulas against approved reference fixtures.

### F13-R13 — BWA JSON and CSV Export

Extend the existing generic export architecture without changing existing
report contracts.

### F13-R14 — Period Lock and Frozen Report Artifact

Implement governed period authority and reproducible export evidence.

### F13-R15 — PDF and XLSX Rendering

Build presentation formats only after calculation and snapshot contracts are
certified.

## Final Decision

SmartAccounting has a tested SKR03 BWA calculation and runtime foundation.

It does not yet have a certified complete SKR04 DATEV BWA-Nr. 1 definition,
a certified SKR04 DATEV booking export, or a frozen historical BWA artifact.

This reference contract is the mandatory authority for the next BWA phases.
