# P8-A — AI Approval Decisions Certification

## Status

**P8-A STATUS: PASS / LOCKED**

## Scope

This certification covers the AI approval decision layer across:

- Persisted AI approval queue items
- Approval queue read access
- Approve decision
- Reject decision
- Mandatory reject reason
- Role-based decision permissions
- Company-scoped decision isolation
- Decision persistence
- Runtime behavior
- Execution-disabled boundary
- Temporary runtime test cleanup

## Certified Endpoints

The following decision endpoints are enabled:

- `POST /api/ai/approval-queue/approve`
- `POST /api/ai/approval-queue/reject`

The following endpoint remains intentionally disabled:

- `POST /api/ai/approval-queue/execute`

## Approval Behavior

A pending approval item can be approved by an authorized role.

Certified transition:

`pending -> approved`

The approved item persists:

- `status: approved`
- `decision: approve`
- `decidedByUserId`
- `decidedAt`

Approval does not execute the underlying AI proposal.

## Rejection Behavior

A pending approval item can be rejected by an authorized role only when a decision reason is supplied.

Certified transition:

`pending -> rejected`

The rejected item persists:

- `status: rejected`
- `decision: reject`
- `decisionReason`
- `decidedByUserId`
- `decidedAt`

A rejection request without a reason returns `400`.

## Role Permissions

Runtime and automated tests confirmed:

- Admin can approve and reject
- Accountant can approve and reject
- Auditor cannot approve or reject
- Viewer cannot approve or reject

Unauthorized decision attempts return `403` or remain inaccessible according to route protection.

## Company Isolation

Approval decisions remain scoped to the authenticated company.

Cross-company decision attempts:

- Do not modify the target approval item
- Return a protected not-found/conflict response
- Leave the original item in `pending` state

## Automated Test Validation

Targeted backend test:

- File: `tests/routes/aiApprovalQueue.test.js`
- Test suites: 1 passed
- Tests: 7 passed

The test suite verified:

- Empty persisted queue behavior
- Company-scoped queue visibility
- Approve without execution
- Reject with mandatory reason
- Viewer and auditor decision protection
- Cross-company decision protection
- Execute endpoint disabled

## Runtime Validation

Live runtime validation confirmed:

- Backend health: `200`
- PostgreSQL: connected
- Redis: ready
- Admin login: `200`
- Accountant login: `200`
- Auditor login: `200`
- Viewer login: `200`

Runtime decision results:

- Accountant approve: `200`
- Approve response contract: PASS
- Admin reject without reason: `400`
- Admin reject with reason: `200`
- Reject response contract: PASS
- Viewer approval attempt: `403`
- Auditor approval attempt: `403`
- Execute endpoint: `405`

Runtime summary:

- `PASS_COUNT=9`
- `FAIL_COUNT=0`
- Database decision state: PASS
- Fatal backend errors detected: NO

## Execution Boundary

The execution endpoint remains disabled.

Certified state:

- `executionEnabled: false`
- Approval decisions enabled
- Proposal execution disabled

This phase does not certify or enable:

- Expense draft execution
- Invoice draft execution
- Ledger posting
- Journal entry posting
- Journal entry reversal
- Payment execution
- Bank transfer
- Direct DATEV upload
- ELSTER or UStVA submission
- Tax filing
- Record deletion

## AI Tool Governance

High-risk and forbidden tools remain blocked.

Examples include:

- Ledger posting
- Journal reversal
- Tax or ELSTER submission
- Payment or fund movement
- Direct DATEV upload
- Unknown tools

Unknown tools are treated as forbidden by default.

## Temporary Runtime Data Cleanup

Three temporary certification records were created for runtime validation.

Cleanup result:

- Temporary records before cleanup: 3
- Temporary records deleted: 3
- Temporary records after cleanup: 0
- Cleanup status: PASS

No runtime certification records remain in the database.

## Security Conclusion

The approval decision layer safely records human decisions without executing financial or external actions.

The following boundaries remain intact:

- No AI execution after approval
- No automatic ledger posting
- No automatic draft creation through the execute endpoint
- No payment execution
- No direct DATEV upload
- No ELSTER submission
- No cross-company decision access
- No viewer or auditor approval authority

## Repository State

At certification time:

- Branch: `main`
- Remote: `origin/main`
- Local/remote divergence: `0 0`
- Working tree: clean
- Code patch required: no
- Runtime data cleanup completed: yes

## Final Certification

- Phase: P8-A — AI Approval Decisions
- Result: **PASS**
- State: **LOCKED**
- Approve decision certified: **YES**
- Reject decision certified: **YES**
- Reject reason enforcement certified: **YES**
- Role protection certified: **YES**
- Company isolation certified: **YES**
- Runtime persistence certified: **YES**
- Execution enabled: **NO**
- Safe draft execution certified: **NO**
- Security regression detected: **NO**
