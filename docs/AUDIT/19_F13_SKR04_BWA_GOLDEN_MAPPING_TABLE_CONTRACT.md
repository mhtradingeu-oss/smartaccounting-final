# F13 — SKR04 BWA Golden Mapping Table Contract

## Status

SOURCE INVENTORY COMPLETE — ACCOUNT MAPPINGS NOT YET APPROVED

## Purpose

This document converts the approved 32-row BWA presentation contract into a
machine-oriented mapping table design.

It does not invent account codes or ranges.

It records which rows are formulas, which require direct account mapping, and
which mapping evidence is still missing.

This document authorizes mapping-source collection and test design only.

It does not authorize a runtime SKR04 definition.

## Governing Contracts

This contract follows:

- 16_F13_DATEV_BWA_GOLDEN_REFERENCE_CONTRACT.md
- 17_F13_CHART_SYSTEM_AUTHORITY_DESIGN.md
- 18_F13_SKR04_BWA_MAPPING_AUTHORITY_CONTRACT.md

The governing rules include:

- no account-range guessing
- no timeless SKR04 definition
- no silent account exclusion
- no overlapping ACCOUNT_SUM mappings
- no runtime registration before golden validation
- no SKR04 compatibility claim before certification

## Source Inventory Decision

The repository contains no complete, year-specific, revisioned SKR04 BWA
row-to-account source.

The current legacy SKR04 notes:

- contain examples and ellipses
- contain no approved account ranges
- contain no applicable year
- contain no revision
- contain no official source URL
- contain no complete BWA row grouping

Therefore all direct account mappings remain pending external source approval.

## Applicable Year Decision

The first executable SKR04 BWA definition must target one explicit accounting
year.

The year must not be omitted.

The selected year remains pending approval.

The future mapping set must preserve:

- applicable year
- source title
- source publisher
- source revision or publication date
- source location
- review date
- reviewer identity
- mapping revision

## Row Type Vocabulary

The approved row types are:

### ACCOUNT_SUM

A direct aggregation of one or more approved accounts, account ranges, or
normalized roles.

### FORMULA

A deterministic calculation from previously declared rows.

### DISPLAY_ZERO

A presentation row that is required by the reference but has no approved
account population for the selected mapping version.

DISPLAY_ZERO must not hide real unmapped accounts.

Any relevant unmatched profit-and-loss account must remain visible as a
warning.

## Mapping Status Vocabulary

Every row must have one status:

- APPROVED
- PENDING_SOURCE
- PENDING_REVIEW
- FORMULA_APPROVED
- DISPLAY_ONLY
- BLOCKED_AMBIGUITY

No row may silently default to APPROVED.

## Golden Mapping Table

| # | Row ID | German Label | Target Type | Mapping Status | Account Source | Formula / Dependency Decision |
|---:|---|---|---|---|---|---|
| 1 | umsatzerloese | Umsatzerlöse | ACCOUNT_SUM | PENDING_SOURCE | Required | Direct SKR04 revenue mapping |
| 2 | bestandsveraenderungen | Bestandsveränderungen FE/UE | ACCOUNT_SUM | PENDING_SOURCE | Required | Direct inventory-change mapping |
| 3 | aktivierte_eigenleistungen | Aktivierte Eigenleistungen | ACCOUNT_SUM | PENDING_SOURCE | Required | Direct capitalized-own-work mapping |
| 4 | gesamtleistung | Gesamtleistung | FORMULA | FORMULA_APPROVED | Not required | 1 + 2 + 3 |
| 5 | material_wareneinkauf | Material-/Wareneinkauf | ACCOUNT_SUM | PENDING_SOURCE | Required | Direct material and merchandise mapping |
| 6 | rohertrag | Rohertrag | FORMULA | FORMULA_APPROVED | Not required | 4 - 5 |
| 7 | sonstige_betriebliche_erloese | Sonstige betriebliche Erlöse | ACCOUNT_SUM | PENDING_SOURCE | Required | Direct operating-income mapping |
| 8 | betrieblicher_rohertrag | Betrieblicher Rohertrag | FORMULA | FORMULA_APPROVED | Not required | 6 + 7 |
| 9 | personalkosten | Personalkosten | ACCOUNT_SUM | PENDING_SOURCE | Required | Direct personnel-cost mapping |
| 10 | raumkosten | Raumkosten | ACCOUNT_SUM | PENDING_SOURCE | Required | Direct occupancy-cost mapping |
| 11 | betriebliche_steuern | Betriebliche Steuern | ACCOUNT_SUM | PENDING_SOURCE | Required | Direct operating-tax mapping |
| 12 | versicherungen_beitraege | Versicherungen/Beiträge | ACCOUNT_SUM | PENDING_SOURCE | Required | Direct insurance and contribution mapping |
| 13 | besondere_kosten | Besondere Kosten | ACCOUNT_SUM | PENDING_SOURCE | Required | Separate reference boundary |
| 14 | fahrzeugkosten | Fahrzeugkosten | ACCOUNT_SUM | PENDING_SOURCE | Required | Direct vehicle-cost mapping |
| 15 | werbe_reisekosten | Werbe-/Reisekosten | ACCOUNT_SUM | PENDING_SOURCE | Required | Direct advertising and travel mapping |
| 16 | kosten_warenabgabe | Kosten Warenabgabe | ACCOUNT_SUM | PENDING_SOURCE | Required | Direct goods-distribution mapping |
| 17 | abschreibungen | Abschreibungen | ACCOUNT_SUM | PENDING_SOURCE | Required | Direct depreciation mapping |
| 18 | reparatur_instandhaltung | Reparatur/Instandhaltung | ACCOUNT_SUM | PENDING_SOURCE | Required | Direct repair and maintenance mapping |
| 19 | sonstige_kosten | Sonstige Kosten | ACCOUNT_SUM | PENDING_SOURCE | Required | Residual operating-cost mapping with explicit exclusions |
| 20 | gesamtkosten | Gesamtkosten | FORMULA | FORMULA_APPROVED | Not required | 9 + 10 + 11 + 12 + 13 + 14 + 15 + 16 + 17 + 18 + 19 |
| 21 | betriebsergebnis | Betriebsergebnis | FORMULA | FORMULA_APPROVED | Not required | 8 - 20 |
| 22 | zinsaufwand | Zinsaufwand | ACCOUNT_SUM | PENDING_SOURCE | Required | Direct interest-expense mapping |
| 23 | sonstiger_neutraler_aufwand | Sonstiger neutraler Aufwand | ACCOUNT_SUM | PENDING_SOURCE | Required | Direct non-operating-expense mapping excluding interest |
| 24 | neutraler_aufwand | Neutraler Aufwand | FORMULA | FORMULA_APPROVED | Not required | 22 + 23 |
| 25 | zinsertraege | Zinserträge | ACCOUNT_SUM | PENDING_SOURCE | Required | Direct interest-income mapping |
| 26 | sonstiger_neutraler_ertrag | Sonstiger neutraler Ertrag | ACCOUNT_SUM | PENDING_SOURCE | Required | Direct non-operating-income mapping excluding interest |
| 27 | verrechnete_kalkulatorische_kosten | Verrechnete kalkulatorische Kosten | ACCOUNT_SUM | PENDING_SOURCE | Required | Direct imputed-cost offset mapping |
| 28 | neutraler_ertrag | Neutraler Ertrag | FORMULA | FORMULA_APPROVED | Not required | 25 + 26 + 27 |
| 29 | kontenklasse_unbesetzt | Kontenklasse unbesetzt | ACCOUNT_SUM | PENDING_SOURCE | Required | Explicit reference mapping or DISPLAY_ONLY decision required |
| 30 | ergebnis_vor_steuern | Ergebnis vor Steuern | FORMULA | FORMULA_APPROVED | Not required | 21 - 24 + 28 + 29 |
| 31 | steuern_einkommen_ertrag | Steuern Einkommen und Ertrag | ACCOUNT_SUM | PENDING_SOURCE | Required | Direct income-tax mapping |
| 32 | vorlaeufiges_ergebnis | Vorläufiges Ergebnis | FORMULA | FORMULA_APPROVED | Not required | 30 - 31 |

## Formula Sign Decision

The table above records conceptual signs only.

The executable definition must preserve the existing engine convention:

- revenue and income account values are normalized before row evaluation
- expense account values are normalized before row evaluation
- formulas operate on normalized signed row values
- publication rounding occurs after raw formula evaluation

The final factors must be proven by failing tests before implementation.

## Required Direct-Mapping Rows

The following 21 rows require approved account authority:

- Umsatzerlöse
- Bestandsveränderungen FE/UE
- Aktivierte Eigenleistungen
- Material-/Wareneinkauf
- Sonstige betriebliche Erlöse
- Personalkosten
- Raumkosten
- Betriebliche Steuern
- Versicherungen/Beiträge
- Besondere Kosten
- Fahrzeugkosten
- Werbe-/Reisekosten
- Kosten Warenabgabe
- Abschreibungen
- Reparatur/Instandhaltung
- Sonstige Kosten
- Zinsaufwand
- Sonstiger neutraler Aufwand
- Zinserträge
- Sonstiger neutraler Ertrag
- Verrechnete kalkulatorische Kosten
- Kontenklasse unbesetzt
- Steuern Einkommen und Ertrag

The count must be revalidated during implementation because
Kontenklasse unbesetzt may become DISPLAY_ONLY after source review.

## Required Formula Rows

The following rows are formulas:

- Gesamtleistung
- Rohertrag
- Betrieblicher Rohertrag
- Gesamtkosten
- Betriebsergebnis
- Neutraler Aufwand
- Neutraler Ertrag
- Ergebnis vor Steuern
- Vorläufiges Ergebnis

All formula dependencies refer only to earlier rows.

## Source Evidence Schema

Each approved direct mapping must record:

```text
mappingId
applicableYear
chartSystem
bwaNumber
rowId
label
accountCodes
accountRanges
normalizedRoles
signConvention
sourceTitle
sourcePublisher
sourceRevision
sourceLocation
reviewedBy
reviewedAt
reviewStatus
notes
```

Empty arrays must be explicit.

Missing evidence must remain PENDING_SOURCE.

## Account Range Rules

An account range must be:

- inclusive
- four-digit unless the selected source explicitly defines another length
- non-overlapping with another ACCOUNT_SUM row
- traceable to one source
- applicable to one mapping year and revision

Open-ended ranges are forbidden unless the source explicitly defines them.

## Residual Row Rules

Sonstige Kosten must not become a catch-all that hides mapping gaps.

A residual row may include an account only when:

- the source assigns it there, or
- an approved exclusion-based rule is documented and tested

Unmapped profit-and-loss accounts must remain warnings.

## Kontenklasse Unbesetzt Decision

Kontenklasse unbesetzt requires an explicit source decision.

Until then it remains:

- PENDING_SOURCE
- not automatically zero-certified
- not populated by guessed account classes

If the selected official reference proves it is presentation-only, it may be
changed to DISPLAY_ZERO in a later reviewed revision.

## Test Fixture Design

The future fixture must include at least one approved account for every direct
mapping row that is populated by the selected source.

It must also include:

- one unmapped revenue account
- one unmapped expense account
- one reversal
- one zero month
- independent YTD values
- raw values that expose premature-rounding errors

## Definition Metadata Requirements

The executable definition must preserve:

- id
- version
- chartSystem
- bwaNumber
- bwaForm
- applicableYear
- mappingRevision
- sourceRevision
- preliminary
- rows

The definition must be deeply immutable.

## Runtime Registration Blocker

Runtime registration remains blocked until:

- one applicable year is selected
- all direct rows have reviewed statuses
- no row remains BLOCKED_AMBIGUITY
- formula tests pass
- overlap tests pass
- golden fixture tests pass
- SKR03 regression tests pass
- company chart authority consumption is implemented or registration remains test-only

## Approved Next Phase

### F13-R11-C1 — External Source Acquisition and Review

Acquire the selected-year official SKR04 account source and the supporting BWA
row-grouping authority.

Record sources without copying unsupported mappings into runtime code.

### F13-R11-C2 — Reviewed Mapping Table

Replace PENDING_SOURCE entries only with evidence-backed accounts and ranges.

### F13-R11-D — Contract Tests

Add failing tests from the reviewed table.

## Mandatory Governance Rules

- No account code or range may be inferred from row names.
- No PENDING_SOURCE row may be implemented.
- No residual catch-all may hide unmapped accounts.
- No source without year and revision may authorize production mapping.
- No runtime registry change in this contract phase.
- No SKR04 support or DATEV certification claim.
- No modification of the certified SKR03 definition.
- No direct DATEV upload or ELSTER submission.

## Final Decision

The 32-row structural contract is ready.

The row-to-account mappings are not ready.

The next authorized action is external source acquisition and reviewed mapping,
not executable SKR04 code.
