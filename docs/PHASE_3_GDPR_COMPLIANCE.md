# PHASE 3 GDPR COMPLIANCE

## Overview
Implements GDPR core compliance for user data export and anonymization, with strict RBAC, audit logging, and no weakening of accounting or business logic.

## Endpoints

### Export User Data
- **GET /api/gdpr/export-user-data?userId=**
  - `userId` (optional): If omitted, exports data for the authenticated user.
  - **RBAC:**
    - User can export their own data.
    - Admin can export data for users in their company.
    - Forbidden for users to export data of users from other companies.
  - **Response:**
    - `user`: PII included only if self or admin.
    - `company`: Company membership.
    - `invoices`: Invoices created/owned by user.
    - `expenses`: Expenses created by user.
    - `attachments`: File attachments linked to those records.
    - `auditLogs`: Only if self or admin.

### Anonymize User
- **POST /api/gdpr/anonymize-user**
  - Body: `{ userId (optional), reason (required) }`
  - **RBAC:**
    - User can anonymize self.
    - Admin can anonymize users in their company.
    - Forbidden for users to anonymize other-company users.
  - **Behavior:**
    - PII fields (`email`, `firstName`, `lastName`) are anonymized.
    - `isAnonymized` set to true, `anonymizedAt` timestamped.
    - User cannot log in after anonymization.
    - No invoices/expenses/transactions are deleted or modified.
    - All foreign keys and referential integrity are preserved.
    - **Audit log entry** is created (action: `GDPR_ANONYMIZE_USER`).
    - If audit log write fails, operation fails.
    - Missing reason returns 400.

## What is Anonymized
- `email`: Replaced with `anonymized+<userId>@example.invalid` (unique, deterministic).
- `firstName`, `lastName`: Set to `Anonymized`/`User`.
- `isAnonymized`: Set to true.
- `anonymizedAt`: Timestamped.

## What is Preserved
- All accounting records (invoices, expenses, transactions, etc.) remain.
- All foreign keys and relations remain intact.
- No destructive changes to business logic or schema.

## Audit Behavior
- Every GDPR action (export, anonymize) writes an immutable, append-only audit log entry using GoBD-compliant audit log service.
- If audit log write fails, the GDPR operation fails.
- Audit log entries do NOT expose PII.

## Error Responses
- Consistent with existing API error format: `{ error: string }`, with appropriate status codes (400, 403, 404, 500).

## Security
- RBAC and company isolation strictly enforced.
- No weakening of validation, RBAC, or test strictness.
- All endpoints require authentication.

---
Prepared: 2025-12-15
By: GitHub Copilot (GPT-4.1)
