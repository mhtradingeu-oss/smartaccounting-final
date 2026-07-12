# F10-A5 — PostgreSQL Test Safety and Repeatability Certification

## 1. Certification Identity

- Project: SmartAccounting
- Phase: F10-A5
- Scope: PostgreSQL test database safety and repeatable fixture cleanup
- Certified commit: `758b58c8cad07c037c96cb766e7ad8f671e77a7c`
- Commit title: `test: guard postgres test database and clean approval fixtures`
- Branch: `main`
- Remote: `origin/main`

## 2. Certification Verdict

F10-A3B and F10-A4 are certified as complete for their approved scope.

The PostgreSQL test environment now has:

- Explicit database target allowlisting.
- Permanent rejection of development and unsafe database names.
- Runtime database identity verification before migrations or tests.
- A fixed Docker Compose project identity.
- Centralized cleanup of AI approval queue fixtures.
- Repeatable PostgreSQL regression execution on the same persistent volume.
- No production accounting behavior changes.

## 3. Original Safety Risk

The truth scan identified a risk where Docker Compose commands could target a
different Compose project if `up`, `exec`, and `down` did not use the same
explicit project name.

That mismatch could allow a PostgreSQL test command to target the wrong backend
container or database environment.

The approved solution uses one fixed Compose command contract:

```bash
docker compose -p smartaccounting_test -f docker-compose.test.yml
```

The same contract is used for startup, status inspection, command execution,
logs, and cleanup.

## 4. Environment Isolation

### Development Environment

- Compose environment: development
- Database: `smartaccounting`
- Database user: `smart`
- Database container: `smartaccounting-db-dev`
- Backend container: `smartaccounting-backend-dev`
- Redis container: `smartaccounting-redis-dev`
- PostgreSQL host port: `5441`

### PostgreSQL Test Environment

- Compose project: `smartaccounting_test`
- Database: `smartaccounting_test`
- Database user: `postgres`
- Database container: `smartaccounting-db-test`
- Backend container: `smartaccounting-backend-test`
- PostgreSQL host port: `5442`

Development and test environments use separate:

- Containers
- Database names
- Database users
- Docker volumes
- Compose project identity
- Host ports

## 5. PostgreSQL Test Database Safety Policy

The canonical policy is implemented in:

```text
src/config/testDatabaseSafety.js
```

The guard applies only when:

```text
NODE_ENV=test
USE_SQLITE=false
```

The guard requires:

- A valid `DATABASE_URL`.
- PostgreSQL protocol.
- A non-empty target database name.
- A non-empty `TEST_DATABASE_ALLOWED_NAMES`.
- Exact membership of the database name in the explicit allowlist.

The guard does not rely on a naming suffix such as `_test`.

## 6. Permanently Forbidden Database Targets

The following database names are rejected even if accidentally included in the
allowlist:

```text
smartaccounting
postgres
template0
template1
```

Production-like database names are also rejected.

This protects the development database `smartaccounting` from destructive test
cleanup and test migrations.

## 7. Safety Error Contract

Safety violations use:

```text
name = TestDatabaseSafetyError
code = TEST_DATABASE_SAFETY_VIOLATION
```

Error messages are designed not to expose:

- Database passwords
- Full database URLs
- Credentials
- Application secrets

## 8. Database Configuration Integration

The safety guard is integrated into:

```text
src/config/database.js
```

It executes before creation of a PostgreSQL Sequelize connection in test mode.

This protects consumers of the canonical database configuration, including:

- Jest model loading
- Sequelize runtime initialization
- Sequelize CLI migrations
- PostgreSQL test scripts

The safety policy is centralized and not duplicated across separate
configuration files.

## 9. Runtime Identity Preflight

The runtime identity preflight is implemented in:

```text
scripts/assert-test-database.js
```

It performs a live PostgreSQL query:

```sql
SELECT current_database(), current_user;
```

The certified identity is:

```text
database=smartaccounting_test
user=postgres
dialect=postgres
```

It also verifies:

```text
NODE_ENV=test
USE_SQLITE=false
```

The preflight executes before migrations and PostgreSQL tests.

## 10. CI PostgreSQL Test Contract

The canonical PostgreSQL test script is:

```text
scripts/ci-postgres-test.sh
```

It:

1. Uses the fixed Compose project `smartaccounting_test`.
2. Builds and starts only the test database and test backend.
3. Waits for PostgreSQL readiness.
4. Verifies that the test backend is running.
5. Executes the runtime database identity preflight.
6. Runs migrations only after identity verification.
7. Runs the selected PostgreSQL test suite.
8. Removes the isolated environment and volume through a guaranteed exit trap.

## 11. SQLite Compatibility

The PostgreSQL database guard does not interfere with explicit SQLite tests.

When:

```text
USE_SQLITE=true
```

the PostgreSQL target guard is not applicable.

This preserves existing lightweight unit-test behavior while protecting real
PostgreSQL test execution.

## 12. Test Fixture Cleanup Contract

The centralized cleanup implementation is:

```text
tests/utils/testHelpers.js
```

`AIApprovalQueueItem` is deleted before users and companies:

```javascript
await AIApprovalQueueItem.destroy({
  where: {},
  force: true,
});
```

The deletion order respects foreign-key dependencies.

## 13. Approval Queue Route Repeatability

The route test suite:

```text
tests/routes/aiApprovalQueue.test.js
```

now invokes centralized cleanup:

```javascript
beforeEach(async () => {
  await global.testUtils.cleanDatabase();
});

afterAll(async () => {
  await global.testUtils.cleanDatabase();
});
```

This prevents fixed approval identifiers from surviving between repeated test
runs on the same PostgreSQL volume.

The unique `approvalId` constraint remains intact and was not weakened.

## 14. Stale Docker Image Operational Finding

The PostgreSQL test backend does not bind-mount the local repository source.

Therefore, source changes require rebuilding the test backend image before
runtime validation:

```bash
docker compose \
  -p smartaccounting_test \
  -f docker-compose.test.yml \
  up -d --build backend
```

A stale test image must not be interpreted as evidence that a current host-side
patch failed.

## 15. Runtime Cleanup Proof

Central cleanup was validated directly against PostgreSQL:

```text
before=76
after=0
cleanupWorked=true
```

This proved that approval queue cleanup was operational and not merely present
in source code.

## 16. Repeatability Proof

The approval queue route suite passed twice on the same PostgreSQL volume:

```text
Run 1: 20/20 tests passed
Run 2: 20/20 tests passed
```

The full selected PostgreSQL regression also passed twice on the same volume:

```text
Run 1:
6 suites passed
74 tests passed

Run 2:
6 suites passed
74 tests passed
```

The certified suites covered:

- Test database safety
- Database configuration safety
- AI approval queue routes
- Safe draft execution
- Atomic approval execution claim
- Post-draft recovery

## 17. Static Validation

The F10-A5 truth scan produced:

```text
LINT_EXIT=0
SAFETY_SYNTAX_EXIT=0
DATABASE_SYNTAX_EXIT=0
PREFLIGHT_SYNTAX_EXIT=0
SAFETY_TEST_SYNTAX_EXIT=0
CONFIG_TEST_SYNTAX_EXIT=0
ROUTE_TEST_SYNTAX_EXIT=0
HELPERS_SYNTAX_EXIT=0
SHELL_SYNTAX_EXIT=0
DIFF_CHECK_EXIT=0
```

## 18. Repository and Synchronization Proof

The certified commit is present locally and remotely:

```text
758b58c8cad07c037c96cb766e7ad8f671e77a7c
```

Repository synchronization was verified as:

```text
## main...origin/main
0 0
```

## 19. Protected Invariants

This certification locks the following invariants:

1. PostgreSQL tests must never target the development database.
2. `smartaccounting` must remain permanently forbidden in PostgreSQL test mode.
3. Test targets must use an explicit allowlist.
4. Runtime identity must be checked before migrations and database tests.
5. All Compose operations must use the same fixed test project.
6. Approval queue fixtures must be removed through centralized cleanup.
7. Repeated test runs must not depend on recreating the database volume.
8. Unique approval identifiers must remain protected by database constraints.
9. Test infrastructure changes must not alter production accounting behavior.
10. Test backend images must be rebuilt when source changes are not bind-mounted.

## 20. Explicit Non-Scope

F10-A5 did not modify or certify new behavior for:

- Production accounting routes
- Ledger posting
- Invoice posting
- Expense posting
- Approval decisions
- Safe draft execution behavior
- Audit timeline presentation
- DATEV submission
- ELSTER submission
- Payments
- Bank reconciliation
- Frontend behavior
- Production migrations

## 21. Next Phase Gate

F10-B may begin only after this certification document is:

1. Reviewed.
2. Statically validated.
3. Committed.
4. Pushed.
5. Verified at `0 0` divergence.

F10-B must begin with a new truth scan of existing execution and audit evidence.

No event graph or new timeline persistence table may be created before proving
that the existing approval, execution, recovery, request, document, draft,
fingerprint, and audit evidence is insufficient.

## 22. Final Certification

```text
F10-A3B PostgreSQL Test Database Safety Guard: PASS
F10-A4 PostgreSQL Test Fixture Cleanup Contract: PASS
F10-A5 Safety and Repeatability Certification: PASS
Production behavior changed: NO
```
