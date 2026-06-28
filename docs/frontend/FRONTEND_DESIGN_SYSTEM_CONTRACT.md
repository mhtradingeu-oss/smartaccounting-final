# SmartAccounting Frontend Design System Contract

## Status

UI-1A baseline contract for final frontend polish.

This document defines how SmartAccounting pages should be upgraded page by page without breaking the certified backend, AI, security, accounting, OCR, and compliance behavior.

## Goal

The frontend must feel like a modern international accounting SaaS platform:

- clean
- professional
- consistent
- responsive
- role-aware
- company-scoped
- AI-assisted
- accounting-safe
- compliance-aware

## Page Structure Standard

Every authenticated page should follow this structure where applicable:

1. Page header
2. Primary action area
3. Key metrics or summary
4. Main content
5. Empty/loading/error state
6. Permission/read-only/plan state
7. Context-aware AI helper or trust note when useful

## Page Header Standard

Each page should clearly show:

- page title
- short business description
- current company context when relevant
- primary action
- secondary actions
- read-only or restricted status when relevant

Avoid showing technical implementation details to normal users.

## Button Hierarchy

Use a consistent hierarchy:

- Primary: main business action
- Secondary: safe navigation or supporting action
- Danger: destructive or reversal action
- Ghost/link: low-priority action
- Disabled: must include a clear reason or tooltip/state

No fake action should appear enabled.

## State Standard

Every page should handle:

- loading
- empty
- error
- no company selected
- no permission
- plan restricted
- read-only role
- success feedback
- backend unavailable where relevant

Prefer shared components:

- PageLoadingState
- PageEmptyState
- PageErrorState
- EmptyState
- ReadOnlyBanner
- PlanRestrictedState
- PermissionGuard
- FeatureGate
- AITrustBanner

## Table Standard

Tables should support where useful:

- clear headers
- readable spacing
- status badges
- currency/date formatting
- empty state
- row action hierarchy
- mobile fallback or horizontal scroll
- no hidden unsafe actions

## Form Standard

Forms should show:

- labels
- helper text
- validation errors
- disabled/read-only state
- submit loading state
- cancel/back action
- success or failure feedback

Accounting forms must not hide VAT, currency, or total validation errors.

## AI UX Standard

AI must be shown as a safe assistant, not an uncontrolled executor.

AI areas should communicate:

- read-only / advisory boundary
- what data was used
- what requires user review
- what action is blocked or gated
- next recommended safe step

AI must not imply that it posted, reconciled, exported, deleted, approved, or submitted anything unless that action was explicitly completed by the owning backend workflow and audited.

## Compliance UX Standard

German accounting, GoBD, VAT, DATEV, audit, and GDPR areas must prioritize clarity:

- show what is final vs draft
- show what is locked
- show audit trail access
- show export status
- show compliance warnings calmly
- avoid overwhelming users with internal technical text

## Visual Direction

Use a premium accounting SaaS style:

- calm neutral background
- strong readable typography
- consistent spacing
- limited accent colors
- clear cards
- no noisy icons
- no random color usage
- good dark-mode behavior where existing styles support it

## Cleanup Rules

During page-by-page polish:

- do not change backend behavior
- do not change API contracts unless the phase explicitly requires it
- do not remove tests
- do not add fake functionality
- keep permissions and plan gates intact
- preserve AI read-only governance
- preserve company scoping
- run build and tests after each phase

## First Page Priority

Recommended sequence:

1. Dashboard
2. AI Assistant / Global AI Companion
3. Invoices
4. Expenses
5. Bank Statements / Reconciliation
6. Document Inbox / OCR Preview
7. Reports / German Tax / DATEV
8. Audit Logs / GDPR
9. Companies / Users / Settings
10. Billing / Pricing / Onboarding
11. Final responsive and CSS cleanup

## Final Acceptance

A page is considered complete only when:

- build passes
- relevant tests pass
- no unsafe UI action appears
- loading/empty/error/read-only states are clear
- AI guidance is helpful and safe
- visual layout is consistent with this contract
- browser QA confirms the page looks professional
