# Test Coverage: Runtime Guards & Core Flows

This document summarizes integration test coverage for runtime guard logic and core flows, as implemented in tests/integration/runtimeGuards.test.js.

## A) Core Auth Flow with AI Disabled

- **Scenario:** Company created with `aiEnabled=false`.
- **Tests:**
  - Login endpoint works (token issued)
  - Company endpoints work (company data returned)
  - AI endpoint returns fail-closed error ("AI disabled"), not a crash

## B) Demo Seeder Guarding

- **Scenario:** Running `scripts/seed-demo-prod.js` with/without required flags.
- **Tests:**
  - Seeder aborts (non-zero exit) if `DEMO_MODE` or `ALLOW_DEMO_SEED` is not set
  - Seeder passes only if both flags are set and schema verification passes

## C) Audit Logging Behavior

- **Scenario:** Audit log table exists.
- **Tests:**
  - Audited action (e.g., login) inserts a row in `audit_logs`
  - (Optional, not implemented): Simulate audit log write failure and assert parent operation fails

## Implementation Notes

- All tests use supertest against the Express app (no external network required)
- Seeder tests use child_process to invoke scripts
- Test file: `tests/integration/runtimeGuards.test.js`

## Gaps / TODO

- Audit log failure simulation (mocking) not implemented
- Additional negative/failure-path tests can be added as needed

---

**Status:** All critical runtime guard and core flow paths are covered by integration tests.
