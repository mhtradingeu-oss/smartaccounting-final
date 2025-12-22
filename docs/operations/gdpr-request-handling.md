# GDPR Request Handling

## Overview
Handle subject access, rectification, and erasure requests while keeping GoBD compliance documentation intact.

## Step-by-step
1. Verify the requester using their registered email plus an additional token or identity proof.
2. Identify the company and user account referenced in the request; log the request in the GDPR tracker.
3. For **data access**, use internal search endpoints (e.g., `/api/gdpr/user-data` if available) and supplement with exports such as `/api/exports/accounting-records` filtered to that company.
4. For **data correction**, act per the existing business rules (no forced mutation of immutable invoices) and document why certain fields cannot be changed.
5. For **erasure**, ensure metadata (audit logs, AI decisions) keep a masked record rather than deleting them completely; mark user as `isAnonymized` and record the action in the audit log via the standard service.
6. Provide a signed confirmation of the request resolution and the list of exported files or sanitized records delivered to the subject.

## Command examples
```bash
# Fetch user data to confirm what is stored
curl -H "Authorization: Bearer $TOKEN" "https://mydomain/api/users/me"

# Export accounting capture for GDPR review
curl -H "Authorization: Bearer $TOKEN" -G "https://mydomain/api/exports/accounting-records" \
  --data-urlencode "format=json" \
  --data-urlencode "from=2025-01-01" \
  --data-urlencode "to=2025-02-01" \
  > gdpr-accounting.json
```

## Notes
- Always annotate the audit trail when you fulfill a GDPR request to leave an immutable record of the handling.
- Never expose `BACKUP_PASSPHRASE` or other secrets during export delivery; use secure channels and encryption at rest.
