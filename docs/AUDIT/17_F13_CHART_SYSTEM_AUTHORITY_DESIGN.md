# F13 — Chart-System Authority Design Contract

## Status

ARCHITECTURE DECISION — RUNTIME IMPLEMENTATION NOT YET CERTIFIED

## Purpose

This document defines the authoritative source and governance rules for
selecting and using a German chart of accounts in SmartAccounting.

The supported chart-system vocabulary for the current design is:

- SKR03
- SKR04

This document does not implement a database field, migration, route, service,
permission, user interface, or runtime behavior.

## Preceding Authority

This design follows:

- 16_F13_DATEV_BWA_GOLDEN_REFERENCE_CONTRACT.md

That contract established that:

- the current BWA implementation is SKR03
- the supplied DATEV BWA reference is SKR04
- the existing SKR04 mapping documentation is incomplete
- the current DATEV export may accept SKR04 without a certified SKR04 schema
- no certified company-level chart-system authority currently exists

## Current Runtime Truth

The current runtime uses several non-authoritative signals:

- a fixed SKR03 BWA definition
- ChartAccount metadata containing kontenrahmen
- a DATEV export query parameter accepting skr03 or skr04
- a default chart-of-accounts service that creates SKR03 accounts

None of these individually represents a certified company-level authority.

## Authority Decision

The company accounting configuration must be the authoritative source for the
active chart system.

The conceptual authority chain is:

Company
→ Company Accounting Configuration
→ authoritative chart system
→ ChartAccount validation
→ BWA definition selection
→ DATEV export mapping
→ accounting and export evidence

The authoritative value must be backend-controlled and company-scoped.

## Recommended Runtime Field

The preferred conceptual field is:

accountingChartSystem

Allowed values:

- SKR03
- SKR04

The exact persistence location remains undecided.

The next runtime-location truth scan must choose exactly one authority:

- a Company field
- a one-to-one company accounting settings record

Duplicate sources of truth are forbidden.

## Authority Precedence

The future precedence order must be:

1. authenticated company context
2. authoritative company accounting chart setting
3. validated ChartAccount metadata
4. selected versioned BWA definition
5. selected DATEV export schema

Client query parameters must not override the authoritative company setting.

ChartAccount metadata may support consistency validation but must not silently
replace the company-level authority.

## No Client-Controlled Selection

The following pattern is not an acceptable accounting authority:

```text
GET /api/exports/datev?kontenrahmen=skr04
```

A client may request a format or report period.

A client must not redefine the company accounting framework for an individual
request.

Conflicting client input must fail closed or follow a separately certified
contract.

Silent override is forbidden.

## No Silent Fallback

The following failure mode is forbidden:

- company authority indicates SKR04
- the SKR04 schema is unavailable or incomplete
- runtime silently exports SKR03 accounts
- metadata, response, or filename indicates SKR04

The runtime must fail closed with a stable error code.

A possible conceptual error is:

```text
ACCOUNTING_CHART_SYSTEM_UNSUPPORTED
```

The final error vocabulary remains deferred to runtime implementation.

## Defaulting Decision

Legacy defaulting must be explicit, documented, migration-backed, and
auditable.

SKR03 is the recommended legacy default only because:

- the current default chart service creates SKR03 accounts
- the current certified BWA definition is SKR03
- existing runtime tests use SKR03 accounts

A company must not be classified blindly as SKR03 when its existing accounts
indicate a different framework.

Legacy classification requires a separate detection and migration contract.

## ChartAccount Metadata Relationship

ChartAccount metadata may contain:

```text
kontenrahmen
role
source
```

The metadata supports consistency validation but is not the company authority.

Validation may detect:

- accounts conflicting with company authority
- mixed SKR03 and SKR04 account sets
- missing mapping origin
- imported-account inconsistencies

Conflicts must produce warnings or fail-closed behavior according to the
affected accounting operation.

Metadata must not mutate company authority.

## BWA Definition Selection

The future BWA selection contract must be:

```text
company accounting chart system
→ registered BWA definition
```

Examples:

```text
SKR03 → de-bwa-01-skr03
SKR04 → de-bwa-01-skr04
```

A definition ID may be accepted only when:

- the definition is registered
- its chart system matches company authority
- the caller cannot bypass company authority
- mismatch fails closed

A client-selected definition must never authorize another chart system.

## DATEV Export Selection

Future DATEV exports must derive the account schema from company authority.

A client-supplied kontenrahmen must not be the source of truth.

Export evidence should preserve:

- company ID
- authoritative chart system
- mapping version
- generated timestamp
- requested period
- exported record count
- disclaimer
- audit or evidence reference

Until SKR04 mappings are separately certified, SKR04 DATEV export must not be
represented as supported.

## Change Governance

Changing the accounting chart system is a governed accounting operation.

It is not an ordinary editable company preference.

The workflow must consider:

- ChartAccounts
- posted JournalEntries
- draft JournalEntries
- invoices
- expenses
- tax mappings
- VAT mappings
- BWA definitions
- DATEV mappings
- historical reports
- exports
- accounting periods

## Lock After Accounting Use

Direct chart-system change must be blocked after accounting evidence exists.

Accounting evidence includes at least:

- a posted JournalEntry
- a JournalEntryLine
- an accounting export
- a frozen report artifact
- a locked accounting period

The exact blocking query remains deferred to implementation certification.

## Pre-Use Change

Before accounting evidence exists, a controlled setup change may be allowed.

It must:

- require an authorized role
- validate the target chart system
- safely rebuild or replace default accounts
- avoid duplicates
- preserve company isolation
- create audit evidence
- remain idempotent

## Migration Between SKR03 and SKR04

Changing one field is not sufficient for a company with accounting evidence.

A future migration requires:

- account-by-account mapping
- unmapped-account review
- tax-code review
- open-entry review
- historical-report decision
- effective date
- human approval
- immutable migration evidence
- recovery or rollback design

Automatic framework migration remains outside the initial authority phase.

## Role and Permission Boundary

Recommended future setup roles are:

- admin
- accountant with an explicit configuration permission

Auditor and viewer roles remain read-only.

A narrow accounting-configuration permission is preferred over broad wildcard
authority.

## Audit Evidence

Creating or changing the authority must preserve:

- company ID
- old value
- new value
- acting user
- reason
- timestamp
- whether accounting evidence existed
- mapping or migration reference
- request correlation ID when available

Production database mutation without audit evidence is forbidden.

## Company Isolation

All authority reads and mutations must use backend-derived company context.

The client must not provide an arbitrary company ID.

Cross-company reads and writes must fail closed.

## Compatibility Rules

The first runtime implementation must preserve:

- existing SKR03 BWA behavior
- current default SKR03 chart behavior
- current reporting contracts
- company isolation
- the DATEV disclaimer
- JSON and CSV report behavior

No SKR04 compatibility claim is allowed before separate certification.

## Required Implementation Sequence

### F13-R10-C1 — Runtime Location and Migration Truth Scan

Choose between:

- a Company field
- a one-to-one company accounting settings record

Review model associations, migration safety, defaults, and API conventions.

### F13-R10-C2 — Authority Contract Tests

Add failing tests for:

- valid values
- invalid values
- backend company scope
- read permissions
- change permissions
- audit evidence
- accounting-use lock
- client override rejection

### F13-R10-C3 — Narrow Runtime Implementation

Implement the chosen authority source with the minimum migration, service, and
route surface.

### F13-R10-C4 — Consumer Alignment

Make BWA and DATEV consumers read the authority without adding unsupported
SKR04 claims.

### F13-R10-C5 — Runtime and Migration Certification

Validate PostgreSQL, SQLite test behavior, company isolation, audit evidence,
and backward compatibility.

## Deferred Capabilities

The following remain deferred:

- executable SKR04 BWA definition
- complete SKR04 DATEV export schema
- automatic SKR03-to-SKR04 migration
- period locking
- frozen BWA artifacts
- PDF and XLSX
- direct DATEV upload
- ELSTER submission

## Mandatory Governance Rules

- One authoritative chart-system source per company.
- A query parameter is not accounting authority.
- No silent SKR04-to-SKR03 fallback.
- No BWA definition conflicting with company authority.
- No direct change after accounting use.
- No migration without human review and evidence.
- No SKR04 compatibility claim before separate certification.
- No cross-company authority access.
- No production mutation without audit evidence.
- No implementation before contract tests.

## Final Decision

Company-scoped accounting configuration is the approved authority boundary for
SKR03 and SKR04 selection.

The exact persistence location remains subject to the next runtime-location
truth scan.

This document authorizes design and testing work only.

It does not authorize a migration or production runtime patch.
