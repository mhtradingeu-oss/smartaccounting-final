# ENTERPRISE_DEMO_MODE Quick Reference

**TL;DR:** Demo users can create minimal expenses/invoices. Backend auto-fills with tax-compliant defaults. Production unchanged.

---

## What Changed

### Before (Strict)
```bash
POST /api/expenses
{
  "vendorName": "Acme",
  "category": "Travel",
  "netAmount": 100.00,
  "vatRate": 0.19,
  "currency": "EUR",
  "expenseDate": "2026-01-13",
  "status": "draft",
  "createdByUserId": 42,
  "companyId": 7
}
→ 201 Created
```

### After (Demo + Simple)
```bash
POST /api/expenses
{
  "vendorName": "Acme",
  "netAmount": 100.00
}
→ 201 Created + demoFills: [
    {field: "currency", reason: "MANDATORY_FIELD_MISSING", value: "EUR"},
    {field: "vatRate", reason: "MANDATORY_FIELD_MISSING", value: 0.19},
    {field: "createdByUserId", reason: "SYSTEM_REQUIRED_FROM_AUTH_CONTEXT", value: 42},
    {field: "companyId", reason: "SYSTEM_REQUIRED_FROM_AUTH_CONTEXT", value: 7},
    ...
  ]
```

---

## Enable/Disable

```bash
# Demo Mode (Auto-Fill ON)
export ENTERPRISE_DEMO_MODE=true
npm start

# Production (Auto-Fill OFF) - DEFAULT
export ENTERPRISE_DEMO_MODE=false
npm start
# or just don't set it
npm start
```

---

## Field Auto-Fill Rules

### Expense Auto-Fill Matrix

| Field | Type | Auto-Fill? | Why | Demo Default |
|-------|------|-----------|-----|--------------|
| netAmount | Mandatory | ❌ | User decides amount | - |
| vatRate | Mandatory | ✅ | Safe tax default | 0.19 (19%) |
| currency | Mandatory | ✅ | Safe default | EUR |
| vatAmount | Calculated | ✅ | Auto-derived | net × rate |
| grossAmount | Calculated | ✅ | Auto-derived | net + vat |
| createdByUserId | System | ✅ | From JWT | auth.userId |
| companyId | System | ✅ | From auth | auth.company |
| vendorName | Required | ❌ | User provides | - |
| category | Optional | ✅ | UX default | "Office Supplies" |
| description | Optional | ✅ | UX default | "Demo Expense" |
| status | Optional | ✅ | Safe default | "draft" |
| expenseDate | Optional | ✅ | Safe default | today |

### Invoice Auto-Fill Matrix

| Field | Type | Auto-Fill? | Why | Demo Default |
|-------|------|-----------|-----|--------------|
| items[] | Mandatory | ❌ | User must define | - |
| items[].vatRate | Mandatory | ✅ | Safe tax default | 0.19 (19%) |
| currency | Mandatory | ✅ | Safe default | EUR |
| items[].lineNet | Calculated | ✅ | qty × price | - |
| items[].lineVat | Calculated | ✅ | lineNet × rate | - |
| items[].lineGross | Calculated | ✅ | lineNet + lineVat | - |
| subtotal | Calculated | ✅ | Sum of nets | - |
| total | Calculated | ✅ | Sum of grosses | - |
| userId | System | ✅ | From JWT | auth.userId |
| companyId | System | ✅ | From auth | auth.company |
| clientName | Optional | ✅ | UX default | "Demo Client" |
| status | Optional | ✅ | Safe default | "DRAFT" |
| dueDate | Optional | ✅ | Safe default | today + 30d |

---

## Minimal Payload Examples

### Example 1: Expense (Minimal)
```bash
curl -X POST http://localhost:5000/api/expenses \
  -H "Authorization: Bearer <token>" \
  -d '{
    "netAmount": 100,
    "vendorName": "My Vendor"
  }'

# Response: 201 Created
{
  "success": true,
  "expense": {
    "id": 123,
    "netAmount": 100,
    "vatAmount": 19,  // AUTO-FILLED
    "grossAmount": 119,  // AUTO-FILLED
    "vendorName": "My Vendor",
    "currency": "EUR",  // AUTO-FILLED
    "vatRate": 0.19,  // AUTO-FILLED
    "category": "Office Supplies",  // AUTO-FILLED
    "status": "draft",  // AUTO-FILLED
    "notes": "[AUTO-FILLED IN DEMO MODE]",
    // ... etc
  },
  "demoFills": [
    {field: "currency", reason: "MANDATORY_FIELD_MISSING", value: "EUR"},
    {field: "vatRate", reason: "MANDATORY_FIELD_MISSING", value: 0.19},
    // ... more fills ...
  ]
}
```

### Example 2: Invoice (Minimal)
```bash
curl -X POST http://localhost:5000/api/invoices \
  -H "Authorization: Bearer <token>" \
  -d '{
    "items": [
      {
        "description": "Services",
        "quantity": 1,
        "unitPrice": 500
      }
    ]
  }'

# Response: 201 Created
{
  "success": true,
  "invoice": {
    "id": 456,
    "items": [
      {
        "description": "Services",
        "quantity": 1,
        "unitPrice": 500,
        "vatRate": 0.19,  // AUTO-FILLED
        "lineNet": 500,  // AUTO-CALCULATED
        "lineVat": 95,  // AUTO-CALCULATED
        "lineGross": 595  // AUTO-CALCULATED
      }
    ],
    "subtotal": 500,  // AUTO-CALCULATED
    "total": 595,  // AUTO-CALCULATED
    "currency": "EUR",  // AUTO-FILLED
    "clientName": "Demo Client",  // AUTO-FILLED
    "status": "DRAFT",  // AUTO-FILLED
    // ... etc
  },
  "demoFills": [
    {field: "currency", reason: "MANDATORY_FIELD_MISSING", value: "EUR"},
    // ... more fills ...
  ]
}
```

---

## Safety Guarantees

### ✅ Production Unchanged
- Default: `ENTERPRISE_DEMO_MODE=false`
- No auto-fill in production
- Must set explicitly to enable

### ✅ Authentication Cannot Be Bypassed
- `createdByUserId` = from JWT token (immutable)
- `companyId` = from JWT token (immutable)
- User cannot assign to different company

### ✅ Tax Compliance Maintained
- `vatRate` defaults to German standard (19%)
- `currency` defaults to EUR (German requirement)
- Calculated fields auto-derived (not user-provided)

### ✅ Fully Auditable
- Every auto-fill logged with reason
- Original payload preserved
- demoFills array in response shows all fills

### ✅ Data Integrity
- Calculated fields stripped (user cannot override)
- Service recalculates all amounts
- VAT validation enforced by code

---

## Common Questions

### Q: Will this change production?
**A:** No. Default is `ENTERPRISE_DEMO_MODE=false`. To enable, explicitly set environment variable.

### Q: Can users hack the company assignment?
**A:** No. `createdByUserId` and `companyId` come from JWT auth token, not user input. Cannot spoof.

### Q: Are the VAT calculations correct?
**A:** Yes. Service recalculates: `vat = net × rate`, `gross = net + vat`. User cannot override.

### Q: Where are the auto-fills logged?
**A:** Two places:
1. Event log: `logger.info('DEMO_MODE_AUTO_FILL', {...})`
2. Audit trail: Included in resource audit log with `demoFills` field

### Q: Can demo data leak into production?
**A:** Highly unlikely. Audit logs clearly mark demo fills. Can be filtered out in analytics.

### Q: What if someone tries to provide invalid values?
**A:** Auto-fill overwrites with safe defaults. Invalid values are discarded.

---

## Deployment Checklist

- [x] Code merged to main
- [x] Syntax validated
- [x] No breaking changes
- [x] Tests pass
- [x] Documentation complete
- [x] Ready for production

**Status: ✅ READY TO DEPLOY**

---

## Support Links

- **Full Guide:** [DEMO_MODE_MINIMAL_PAYLOAD_GUIDE.md](DEMO_MODE_MINIMAL_PAYLOAD_GUIDE.md)
- **Implementation:** [DEMO_MODE_IMPLEMENTATION_SUMMARY.md](DEMO_MODE_IMPLEMENTATION_SUMMARY.md)
- **Verification:** [DEMO_MODE_FINAL_VERIFICATION.md](DEMO_MODE_FINAL_VERIFICATION.md)
- **Code:** [src/utils/demoPayloadNormalizer.js](src/utils/demoPayloadNormalizer.js)

---

**Last Updated:** January 13, 2026
**Status:** ✅ Production-Ready
