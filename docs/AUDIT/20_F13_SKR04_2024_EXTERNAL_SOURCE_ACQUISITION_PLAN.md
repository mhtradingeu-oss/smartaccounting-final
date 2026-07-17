# F13 — SKR04 2024 External Source Acquisition Plan

## Status

APPLICABLE YEAR SELECTED — AUTHORITATIVE ROW MAPPING STILL REQUIRED

## Purpose

This document selects the first target year for the future versioned SKR04 BWA
definition and defines the exact source artifacts required before any account
mapping or runtime implementation.

This document performs no download, code change, test change, migration,
registration, or compatibility claim.

## Selected Applicable Year

The first target year is:

```text
2024
```

This choice is approved because:

- the supplied DATEV BWA reference reports are from 2024
- DATEV provides an official SKR04 account framework valid for 2024
- DATEV documents BWA-Form 1 changes for the 2023/2024 year transition
- the existing golden presentation contract was derived from 2024 reports

This selection does not imply that the current repository supports SKR04 2024.

## Official Source Inventory

### Source A — DATEV SKR04 Account Framework 2024

Required artifact:

- DATEV standard chart of accounts SKR04
- article number 11175
- valid for 2024
- source revision or publication state preserved
- original file hash recorded after acquisition

Purpose:

- authoritative account-code vocabulary
- standard account descriptions
- account functions and tax-key context

Limitation:

The chart of accounts alone does not prove the BWA row assignment for every
account.

### Source B — DATEV BWA-Form 1 Schema for SKR04 2024

Required artifact:

- BWA-Form 1
- DATEV-BWA
- SKR04
- applicable year 2024
- complete account or account-purpose assignment by BWA row
- schema export, printout, or equivalent authoritative evidence
- source revision and extraction date

Purpose:

- authoritative row-to-account grouping
- distinction between operating, neutral, interest, tax, and residual rows
- explicit treatment of Kontenklasse unbesetzt
- proof of account inclusion and exclusion

Current status:

```text
NOT ACQUIRED
```

This is the blocking source for executable mapping.

### Source C — DATEV BWA Change Documentation for 2023/2024

Required artifact:

- official DATEV BWA-Schema change documentation
- SKR04
- transition 2023/2024
- BWA-Form 1 changes identified separately from other BWA forms

Purpose:

- preserve year-transition changes
- prevent use of a stale prior-year assignment
- identify accounts introduced, moved, or removed for 2024

Limitation:

Change documentation records deltas and does not replace the full BWA schema.

### Source D — Supplied 2024 BWA Reference Reports

Existing artifacts:

- BWA through April 2024
- BWA through July 2024

Purpose:

- presentation order
- labels
- monthly and cumulative behavior
- preliminary-result wording
- historical recalculation evidence
- golden output fixtures

Limitation:

The reports do not expose all source-account assignments.

## Required Acquisition Package

Before F13-R11-C2, the review package must contain:

1. official SKR04 2024 account framework
2. full BWA-Form 1 SKR04 2024 schema or equivalent authoritative assignment
3. official 2023/2024 BWA change documentation
4. supplied April and July 2024 reports
5. SHA-256 for each acquired file
6. source title and publisher
7. source document number where available
8. source revision or publication date
9. acquisition date
10. reviewer identity
11. copyright and redistribution decision
12. repository-storage decision

## Repository Storage Decision

External source files must not be committed automatically.

For each source, decide explicitly between metadata-only storage and an
approved reference copy.

The default for DATEV material is metadata-only unless legal and repository
review approves a committed reference copy.

## Source Evidence Record

Each acquired source must produce a record containing:

```text
sourceId
sourceType
title
publisher
documentNumber
articleNumber
applicableYear
revision
publicationDate
acquiredAt
acquiredBy
sourceLocation
localSecurePath
sha256
redistributionStatus
repositoryStorageDecision
reviewStatus
reviewedBy
reviewedAt
notes
```

## BWA Schema Acquisition Method

The preferred evidence is a complete BWA-Schema export or printout from an
authorized DATEV Rechnungswesen environment configured for:

- SKR04
- BWA-Form 1
- year 2024
- standard schema without undocumented customer customization

The extraction must preserve:

- BWA row identifiers or labels
- assigned accounts or account purposes
- inclusion and exclusion rules
- applicable year
- schema modification state
- evidence that the schema is standard rather than customized

Screenshots alone are insufficient when they omit assignments.

Manual transcription must be independently reviewed.

## Customization Guard

A customer-specific DATEV BWA schema must not be treated as the standard
SKR04 BWA-Form 1 mapping.

The acquisition review must identify whether the schema is:

- DATEV standard
- customer customized
- industry-package specific
- migrated from an earlier year
- based on account purposes
- based on direct account assignment

Any customization must remain separate from the standard definition.

## Account-Purpose Boundary

DATEV documentation indicates that BWA assignment may be managed through
account purposes in newer workflows.

The source review must therefore distinguish:

- direct account-code assignment
- account-purpose assignment
- automatic inclusion of newly introduced account purposes
- year-specific BWA schema changes

SmartAccounting must not collapse those concepts without a reviewed mapping
decision.

## Review Gates

The source package passes only when:

- the year is explicitly 2024
- SKR04 is explicit
- BWA-Form 1 is explicit
- source revision is known
- the full row assignment is available
- standard versus customized state is known
- no required page or assignment section is missing
- source hashes are recorded
- reviewer signs off the package

## Blocking Conditions

F13-R11-C2 remains blocked when any of the following is true:

- only the SKR04 account chart is available
- only sample BWA reports are available
- only year-change deltas are available
- the BWA schema is incomplete
- the schema is customer customized without a standard baseline
- the applicable year is missing
- the source revision is unknown
- redistribution or storage status is unresolved
- account assignments require guessing

## Approved Next Step After Acquisition

### F13-R11-C2 — Reviewed SKR04 2024 Mapping Table

For every direct-mapping row:

- record approved accounts and ranges
- record account-purpose mappings where applicable
- record sign convention
- record source references
- record review status
- detect overlaps
- retain unresolved rows as PENDING_SOURCE

No executable definition is authorized until this reviewed table is complete.

## Mandatory Governance Rules

- 2024 is the first selected year.
- No timeless SKR04 mapping.
- The account chart is not sufficient row-assignment authority.
- A full standard BWA-Form 1 schema is required.
- Customer customization must remain separate.
- Source hashes and revisions are mandatory.
- No external file is committed automatically.
- No account assignment is inferred from labels.
- No runtime SKR04 definition before reviewed mapping.
- No DATEV certification or branding claim.
- No direct DATEV upload or ELSTER submission.

## Final Decision

The official SKR04 2024 account framework is available as an account-source
artifact.

The complete standard BWA-Form 1 SKR04 2024 row-assignment source is still
required.

F13-R11-C2 remains blocked until that source is acquired and reviewed.
