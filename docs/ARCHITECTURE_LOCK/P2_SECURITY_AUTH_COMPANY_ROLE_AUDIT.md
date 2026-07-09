# P2 Security / Auth / Company / Role Route Guard Audit — SmartAccounting

Date: 2026-07-09  
Status: PASS WITH REGISTERED WARNINGS  
Scope: Security, authentication, company isolation, role boundaries, disabled high-risk routes, AI route governance.

## 1. Purpose

This document locks the P2 security truth after runtime and static validation.

P2 confirms that the current SmartAccounting runtime has a working security baseline before moving into accounting-core certification and deeper product phases.

No route, AI execution, accounting mutation, or system-admin feature work should bypass this lock.

---

## 2. Validation checkpoints completed

P2 included the following checkpoints:

- P2 general security / route guard scan
- P2-A route mount and guard matrix scan
- P2-B runtime authenticated security smoke matrix
- P2-C AI route contract diagnostics
- P2-D enterprise / system route role boundary smoke
- P2-D-FIX corrected enterprise / system role smoke

No code patch was made during P2.

---

## 3. Repository and runtime baseline

Final verified status:

- Git status: clean
- Branch: `main`
- Remote sync: `main...origin/main`
- Lint: PASS
- Backend app require inside Docker: PASS
- Runtime API health: PASS

Known successful signal:

- `APP_REQUIRE_OK function true`

---

## 4. Authentication truth

Unauthenticated requests to protected routes returned `401 AUTH_MISSING`.

Confirmed protected examples:

- `/api/companies`
- `/api/invoices`
- `/api/expenses`
- `/api/bank-statements`
- `/api/ai/insights`
- `/api/enterprise/observability/health`
- `/api/enterprise/graph/full`
- `/api/ai/reasoning/chain`

Decision:

- Core protected routes are not public.
- Missing Bearer token is rejected correctly.

---

## 5. Demo role login truth

Runtime login worked for all demo roles:

- `demo-admin@demo.com`
- `demo-accountant@demo.com`
- `demo-auditor@demo.com`
- `demo-viewer@demo.com`

All returned valid tokens and `companyId: 1`.

Decision:

- Demo runtime auth is functional.
- Future smoke tests may use these roles carefully.
- Do not paste live JWT tokens into docs.

---

## 6. Company isolation truth

Wrong company header checks returned:

- `403 COMPANY_CONTEXT_INVALID`

Confirmed with wrong `x-company-id` on:

- `/api/invoices`
- `/api/expenses`
- `/api/dashboard/stats`

Decision:

- Tenant/company mismatch protection is active for the tested core routes.
- Service-level company scoping still requires deeper module-by-module certification in later phases.

---

## 7. Role boundary truth

Viewer and auditor write attempts were rejected:

- `viewer POST /api/invoices` → `403`
- `auditor POST /api/invoices` → `403`

Decision:

- Basic write boundary is active.
- Read/write permissions must continue to be validated module-by-module during P3 and later phases.

---

## 8. High-risk German tax / ELSTER truth

High-risk direct filing routes are disabled:

- `/api/german-tax/submit` → `501`
- `/api/german-tax-compliance/ustva/submit` → `501`
- `/api/tax-reports` → `501`

Decision:

- Direct German tax / ELSTER submission remains disabled.
- Preparation, readiness, export, and Steuerberater package flows may be developed later.
- No official filing behavior is allowed before the dedicated legal/tax integration phase.

---

## 9. AI route governance truth

AI routes are protected by auth, company context, permission checks, and governance requirements.

Confirmed behavior:

- `GET /api/ai/insights` without AI purpose/policyVersion returns `400 AI_PURPOSE_REQUIRED`.
- `POST /api/ai/insights` returns `403 PERMISSION_DENIED`.
- `/api/ai/suggest` returns `403 PERMISSION_DENIED` for tested non-authorized access.
- `GET /api/ai/reasoning/chain` as tenant admin returns `400 AI_PURPOSE_REQUIRED`.
- accountant/viewer access to AI reasoning returns `403 PERMISSION_DENIED`.

Decision:

- AI calls cannot proceed without governance purpose/policyVersion.
- AI mutation / suggestion paths are not casually exposed.
- AI execution remains forbidden until later governance and approval phases.

---

## 10. Enterprise route boundary truth

Enterprise routes tested:

- `/api/enterprise/observability/health`
- `/api/enterprise/observability/events`
- `/api/enterprise/observability/dlq`
- `/api/enterprise/graph/full`
- `/api/enterprise/timeline`
- `/api/enterprise/audit-timeline`
- `/api/enterprise/replay`
- `/api/enterprise/replay/explain`
- `/api/ai/reasoning/chain`

Observed role boundary:

- admin allowed on several enterprise read routes
- accountant rejected with `403 PERMISSION_DENIED`
- viewer rejected with `403 PERMISSION_DENIED`

Decision:

- Enterprise routes are not available to normal accountant/viewer roles.
- Some enterprise runtime contract issues remain for P11.

---

## 11. System-admin boundary truth

System routes tested:

- `/api/system/version`
- `/api/system/info`
- `/api/system/overview`
- `/api/system/companies`
- `/api/system/users`
- `/api/monitoring/logs`

Observed:

- normal tenant admin is blocked from system-admin routes with `403 SYSTEM_ADMIN_REQUIRED`
- accountant and viewer are blocked with `403 PERMISSION_DENIED`
- `/api/system/version` returns `200` for tenant admin and `403` for accountant/viewer

Decision:

- System-admin boundary is active.
- Tenant admin is not system admin.
- `/api/system/version` is allowed for tenant admin and should remain documented.

---

## 12. Registered warnings

### P2-WARN-1 — Observability events admin runtime error

`GET /api/enterprise/observability/events?companyId=1` returned `500` for admin.

Security decision:

- Not a permission leak.
- accountant/viewer are rejected with `403`.

Owner phase:

- P11 Observability / Event / Queue phase.

### P2-WARN-2 — Audit timeline route contract mismatch

`GET /api/enterprise/audit-timeline?companyId=1` returned `404` for admin.

Security decision:

- Not a permission leak.
- accountant/viewer are rejected with `403`.

Owner phase:

- P11 route contract / enterprise timeline cleanup.

### P2-WARN-3 — Admin demo-data smoke method mismatch

`GET /api/admin/demo-data/load` returned `404` for admin.

Security decision:

- Not a permission leak.
- accountant/viewer are rejected with `403`.
- likely method mismatch because route may be POST-only.

Owner phase:

- Future admin route smoke refinement.

### P2-WARN-4 — AI purpose/policyVersion required

AI reasoning and insights returned `400 AI_PURPOSE_REQUIRED` without purpose/policyVersion.

Security decision:

- This is desired governance behavior.
- Future AI clients must send required purpose and policy version metadata.

Owner phase:

- P9 AI Governance / P10 Safe AI Execution.

---

## 13. P2 final decision

P2 is closed as:

- PASS WITH REGISTERED WARNINGS
- No immediate security patch required
- No route exposure requiring emergency correction found
- Continue with scan-first policy

---

## 14. Next allowed phase

Next phase:

- P3 — Accounting Core Certification

P3 must be scan-first and must validate:

- chart of accounts
- journal entries
- journal entry lines
- posting preview
- final posting
- reversal
- posted immutability
- invoice posting
- expense posting
- VAT logic
- audit log coverage
- company scoping inside accounting services

No AI execution may bypass P3.

---

## 15. Engineering rule

Before changing any part of the system:

1. Scan truth first.
2. Read relevant files.
3. Avoid duplicate logic.
4. Patch narrowly.
5. Validate syntax/lint/runtime.
6. Stage explicitly.
7. Commit separately.
8. Push.
9. Keep repo clean.

Never use:

- `git add .`
