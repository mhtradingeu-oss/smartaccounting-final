# Bank Statement Import/Export/PDF Upload Compliance Checklist

## Import (CSV, PDF)

- [x] Auth, company, role, feature flag enforced
- [x] Secure uploader restricts MIME/size
- [x] PDF files stored as-is, not parsed/executed
- [x] Audit logs for all state-changing actions
- [x] 400/403/404/503 for business/security errors, not 500
- [x] Cross-company access returns 403/404

## Dry-run and Confirmation

- [x] Dry-run does not persist data
- [x] Confirmation relies on dryRunId only
- [x] Audit logs for dry-run and confirmation
- [x] No business logic before auth/role/company/feature

## Manual Reconciliation + Undo

- [x] Company scoping enforced
- [x] Audit logs for reconciliation and undo
- [x] Security checks for role and company
- [x] 403/404/409 for invalid/denied actions

## Export (Bank Statements + GDPR)

- [x] Security checks and company scoping
- [x] GDPR export tests accept 200/204/403/404
- [x] No business logic before auth

## PDF Upload Handling

- [x] Secure uploader restricts MIME/size
- [x] PDF files stored as-is, not parsed/executed
- [x] Audit logs for uploads

## Tests

- [x] Accept multiple valid status codes for security blocks
- [x] Never expect 200 on denied access
- [x] No business logic before auth
- [x] Audit logs checked for all state-changing actions

## Final Confirmation

- [x] All endpoints are secure, deterministic, and auditable
- [x] No business logic changes except for real bug fixes
- [x] All compliance rules are enforced

---

**Reviewed: January 2026**

All requirements in scope are met. System is compliant and ready for release.
