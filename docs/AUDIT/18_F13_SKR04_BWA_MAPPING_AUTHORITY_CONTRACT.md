# F13 — SKR04 BWA Mapping Authority Contract

## Status

MAPPING AUTHORITY REQUIRED — RUNTIME IMPLEMENTATION NOT YET AUTHORIZED

## Purpose

This document records the F13-R11-A truth-scan decision for a future
versioned SKR04 BWA definition.

It distinguishes:

- the approved 32-row BWA presentation contract
- the existing SKR03 implementation
- official SKR04 account-source material
- missing row-to-account mapping authority
- implementation work that remains blocked

This document creates no runtime definition, matcher, route, migration,
permission, export, or compatibility claim.

## Proven Current Baseline

The current certified implementation remains:

- definition ID: de-bwa-01-skr03
- version: 1
- chart system: SKR03
- row count: 25
- current BWA and report-service baseline: 40/40 tests passed

No executable SKR04 BWA definition was found.

## Golden Presentation Contract

The approved reference contains 32 ordered rows:

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

## Truth-Scan Label Normalization Finding

The automated gap summary produced three label-based false positives.

The following current rows already exist semantically:

- Bestandsveränderungen FE/UE maps to the current
  Bestandsveränderungen row.
- Kosten Warenabgabe maps to the current
  Kosten der Warenabgabe row.
- Gesamtkosten maps to the current
  Summe Kosten row.

These are presentation-label differences, not missing calculation rows.

## True Structural Coverage Gaps

The seven true missing or collapsed presentation boundaries are:

- Besondere Kosten
- Zinsaufwand
- Sonstiger neutraler Aufwand
- Zinserträge
- Sonstiger neutraler Ertrag
- Verrechnete kalkulatorische Kosten
- Kontenklasse unbesetzt

The current generic Neutraler Aufwand and Neutraler Ertrag rows do not provide
the complete reference separation.

## Matcher Coverage Finding

Fifteen current ACCOUNT_SUM rows have no executable matchers.

They include:

- Bestandsveränderungen
- Aktivierte Eigenleistungen
- Material-/Wareneinkauf
- Sonstige betriebliche Erlöse
- Personalkosten
- Betriebliche Steuern
- Versicherungen/Beiträge
- Fahrzeugkosten
- Werbe-/Reisekosten
- Kosten der Warenabgabe
- Abschreibungen
- Reparatur/Instandhaltung
- Neutraler Aufwand
- Neutraler Ertrag
- Steuern Einkommen und Ertrag

Therefore the existing SKR03 structure must not be treated as sufficient
mapping authority for SKR04.

## Official Source Boundary

Official DATEV SKR04 account material may be used as an account-source
reference for the applicable year.

An account chart alone does not prove the BWA row assignment for every
account.

The BWA row-to-account grouping requires separately approved mapping evidence.

The implementation must preserve source identity and applicable year.

## Annual Versioning Decision

DATEV standard account frameworks and standard BWA forms may change with the
applicable accounting year.

A future executable definition must therefore preserve at least:

- chart system
- BWA form
- BWA number
- applicable accounting year
- mapping source
- mapping revision
- definition version
- row contract version

A timeless generic SKR04 mapping is not approved.

## Mapping Table Required Before Code

Before any executable SKR04 definition is registered, an approved mapping
table must exist for every ACCOUNT_SUM row.

Each mapping record must define:

- row ID
- German display label
- row type
- account code or inclusive range
- optional normalized account role
- sign convention
- overlap decision
- source reference
- applicable year
- review status

Formula rows must define:

- ordered dependencies
- factor for each dependency
- forward-reference prohibition
- rounding boundary
- expected sign behavior

## Ambiguity and Overlap Rules

One profit-and-loss account must not map to multiple distinct ACCOUNT_SUM rows.

Overlapping ranges must fail validation.

An account matched by both role and code must remain within one row.

Unmapped profit-and-loss accounts must remain visible as warnings.

Silent exclusion is forbidden.

## Definition Identity Decision

The future definition must use a stable chart-specific identity.

Conceptual identity:

```text
de-bwa-01-skr04
```

The applicable year and mapping revision must be explicit metadata or an
explicit versioned identity.

The final identity format remains subject to the mapping-contract phase.

## Registration Boundary

The SKR04 definition must not be added to the runtime registry until:

- all 32 rows are represented
- every ACCOUNT_SUM row has approved mapping authority
- formula dependencies validate
- ambiguity tests pass
- official source references are recorded
- golden fixture tests pass
- company chart authority is available or the definition remains test-only

Runtime registration before these conditions is forbidden.

## Test-First Requirements

The implementation phase must begin with failing contract tests for:

- definition identity and chart system
- exact 32-row order
- exact labels
- exact row types
- required matcher coverage
- no duplicate row IDs
- no missing formula references
- no forward formula references
- no circular formulas
- no non-finite factors
- no ambiguous account mapping
- unmapped profit-and-loss warnings
- deterministic zero rows
- explicit month preservation
- deep immutability
- SKR03 backward compatibility

## Golden Fixture Boundary

A reference fixture must prove calculations from ledger-like account inputs.

The fixture must not hard-code only final presentation values.

It must preserve:

- input account codes
- monthly values
- YTD values
- expected row results
- expected formulas
- expected warnings
- reversal behavior
- applicable year
- source reference

## Claim Safety

Until the mapping table and golden fixtures are approved, SmartAccounting
must not claim:

- complete SKR04 BWA support
- DATEV-certified BWA output
- exact DATEV account grouping
- production-safe SKR04 DATEV export

A future SmartAccounting report must identify itself as SmartAccounting
generated preparation and review output.

## Approved Next Sequence

### F13-R11-C — SKR04 Row-to-Account Mapping Source Inventory

Build the reviewed source table for the selected accounting year.

### F13-R11-D — SKR04 Definition Contract Tests

Add failing tests without registering a production definition.

### F13-R11-E — Narrow Versioned Definition Implementation

Implement only the approved mapping and formula contract.

### F13-R11-F — Golden Fixture Validation

Prove row results, warnings, reversals, and compatibility.

### F13-R11-G — Registry and Authority Alignment

Register SKR04 only after company chart authority and compatibility rules are
available.

## Mandatory Governance Rules

- No account-range guessing.
- No mapping copied from incomplete legacy notes.
- No timeless SKR04 definition.
- No silent account exclusion.
- No overlapping ACCOUNT_SUM mappings.
- No production registration before golden validation.
- No SKR04 support claim before certification.
- No change to the existing SKR03 contract without separate proof.
- No use of DATEV branding or certification claims.
- No direct DATEV upload or ELSTER submission in this phase.

## Final Decision

F13-R11-A proved that the engine can support another versioned definition.

It also proved that sufficient executable SKR04 row-to-account mapping
authority is not yet present in the repository.

The next authorized work is source inventory and mapping-contract creation,
not runtime SKR04 implementation.
