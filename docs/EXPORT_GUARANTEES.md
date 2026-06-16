# Export Guarantees

## What is Included

- All posted/locked invoices, expenses, payments, corrections
- Full audit log (all changes, before/after, who, when, requestId)
- All data is company-scoped and immutable

## What is Excluded

- Drafts, deleted, or unposted records
- Any data not legally required for GoBD/DATEV

## Locking Behavior

- Only locked/posted records are exported
- No export can bypass locks or mutate data

## Error Handling

- All export errors are logged and surfaced to the user
- Every export is audit-logged (EXPORT_DATEV, EXPORT_GOBD)

## Audit Trail

- Every export is traceable and immutable (GoBD §146, §147)
