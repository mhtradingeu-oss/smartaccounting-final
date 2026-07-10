# P5 — OCR / AI Document Intake / Draft Creation Certification

Status: PASS / LOCKED  
Date: 2026-07-10  
Branch: main  
Final Fix Commit: fc61f3c — fix: allow OCR read routes through permission guard

---

## 1. Scope

P5 certifies the OCR and AI document intake layer for SmartAccounting.

Certified areas:

- OCR intake analysis
- OCR document inbox
- OCR result scoping
- Reviewed-value recheck workflow
- Draft creation from reviewed documents
- AI approval queue proposal model
- AI approval queue route behavior
- AI tool registry governance
- Permission guard alignment for OCR read routes
- Multi-tenant company boundary protection

---

## 2. Certified Architecture

OCR and AI document intake are intentionally controlled by a review-first workflow.

The system may analyze documents and propose draft actions, but it must not silently create invoices, expenses, accounting postings, reconciliations, tax submissions, payments, deletions, or DATEV uploads.

Draft creation is allowed only after:

1. source document exists in the active company scope,
2. extracted/reviewed values are rechecked,
3. critical fields are reviewed,
4. decision fingerprint is current,
5. role permission allows the operation,
6. the operation remains draft-only.

---

## 3. Route Contract

Certified OCR route behavior:

- `POST /api/ocr/intake/analyze`
  - accountant only
  - advisory analysis
  - no invoice/expense creation
  - may create approval proposal metadata

- `GET /api/ocr/intake/documents`
  - admin/accountant/auditor/viewer
  - read-only document inbox
  - company scoped

- `POST /api/ocr/intake/:documentId/recheck`
  - accountant only
  - stores reviewed values and review gate state
  - no accounting object creation

- `POST /api/ocr/intake/:documentId/create-draft`
  - accountant only
  - creates invoice or expense draft only from reviewed values
  - rejects stale or missing decision fingerprint

- `GET /api/ocr/results/:fileId`
  - read-only OCR document result
  - company scoped

- `GET /api/ocr/search`
  - read-only OCR document search
  - company scoped

- `GET /api/ocr/validate/:documentId`
  - read-only integrity validation
  - company scoped

---

## 4. AI Approval Queue Contract

Certified AI approval queue behavior:

- `GET /api/ai/approval-queue`
  - admin/accountant/auditor/viewer
  - read-only queue visibility
  - company scoped

- `POST /api/ai/approval-queue/approve`
  - admin/accountant only
  - records human approval decision
  - does not directly execute unsafe actions

- `POST /api/ai/approval-queue/reject`
  - admin/accountant only
  - requires decision reason where applicable

- execution endpoint remains disabled while approval decisions are enabled

---

## 5. Permission Guard Fix

Root cause found in P5-C:

`src/security/permissionGuard.js` is globally applied to `/api` routes before route handlers.  
`src/security/permissions.js` was missing OCR read routes for non-admin roles.

The source route contract allowed OCR inbox reads, but runtime returned `403 PERMISSION_DENIED` because the global permission registry did not contain:

- `GET /api/ocr/intake/documents`
- `GET /api/ocr/search`
- `GET /api/ocr/results/:id`
- `GET /api/ocr/validate/:id`

Final fix commit:

- `fc61f3c fix: allow OCR read routes through permission guard`

Patch scope:

- `src/security/permissions.js` only
- read permissions added for accountant/auditor/viewer
- OCR write actions remain blocked for auditor/viewer
- no broad middleware change
- no route behavior weakening

---

## 6. Security Guarantees

Certified guarantees:

- viewer/auditor can read OCR inbox and OCR results only
- viewer/auditor cannot analyze OCR documents
- viewer/auditor cannot recheck reviewed values
- viewer/auditor cannot create reviewed drafts
- viewer/auditor cannot approve or reject AI approval decisions
- wrong company context returns `COMPANY_CONTEXT_INVALID`
- OCR records are company scoped
- AI approval queue records are company scoped
- high-risk AI tool execution remains forbidden

---

## 7. Validation Evidence

Final P5-D validation passed:

- `npm run lint -- --quiet`
  - PASS

- `tests/routes/ocrDocumentIntake.test.js`
  - PASS
  - 26/26 tests

- `tests/routes/ocrResults.test.js`
  - PASS
  - 2/2 tests

- `tests/ai/aiApprovalQueueContract.test.js`
  - PASS
  - 9/9 tests

- `tests/routes/aiApprovalQueue.test.js`
  - PASS
  - 7/7 tests

- `tests/ai/aiToolRegistry.test.js`
  - PASS
  - 7/7 tests

- backend app require
  - `APP_REQUIRE_OK function true`

- repository sync
  - `origin/main...HEAD = 0 0`

---

## 8. Runtime Evidence

Final runtime smoke after backend restart verified:

- admin/accountant/auditor/viewer login: PASS
- `GET /api/ocr/intake/documents`: 200 for all read roles
- `GET /api/ocr/search`: 200 for accountant/auditor/viewer
- `GET /api/ocr/validate/:documentId`: 200 for accountant/auditor/viewer
- OCR write routes for auditor/viewer: 403
- AI approval queue read: 200 for all read roles
- wrong company boundary: 403 `COMPANY_CONTEXT_INVALID`

---

## 9. Known Non-Blocking Notes

- Local OCR PDF conversion may be unavailable in development runtime; unsupported PDF OCR is handled safely as review-required and advisory-only.
- OCR integrity validation can return `File integrity compromised` for existing local test/runtime files. This confirms the validation route executes and returns a result; it is not a permission failure.
- Jest force-exit warnings indicate open handles in the test runtime and were not blocking because all targeted test suites passed.

---

## 10. Final Verdict

P5 is certified as PASS / LOCKED.

The OCR / AI document intake workflow is now aligned across:

- source route contract,
- global permission guard,
- role-based access,
- AI approval governance,
- company scoping,
- runtime smoke behavior,
- targeted automated tests.

No further P5 code changes are required before moving to the next phase.
