---
# AUDIT_TRAIL.md

## Every Action Logged
- Who: actorUserId
- What: action, entityType, entityId
- When: timestamp (UTC)
- Before/After: diff-safe
- Why: business, compliance, AI safety

## Example
{
  "entityType": "User",
  "entityId": "<userId>",
  "action": "ROLE_CHANGED",
  "before": { "role": "user" },
  "after": { "role": "admin" },
  "actorUserId": "<adminId>",
  "companyId": "<companyId>",
  "timestamp": "UTC"
}