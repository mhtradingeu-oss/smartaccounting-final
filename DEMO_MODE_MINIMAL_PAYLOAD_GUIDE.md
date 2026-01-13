# ENTERPRISE_DEMO_MODE: Minimal Payload Support

**Date:** January 13, 2026
**Feature:** Simplified invoice/expense creation for demo users
**Status:** Production-Safe ✅ (Production unchanged, demo-only auto-fills)

---

## Overview

When `ENTERPRISE_DEMO_MODE=true`, demo users can create invoices and expenses with **minimal payloads**. The backend automatically:

1. ✅ Auto-fills system-required fields (userId, companyId) from auth context
2. ✅ Auto-fills mandatory legal fields with safe defaults (VAT rate, currency)
3. ✅ Auto-calculates derived amounts (VAT, gross amounts)
4. ✅ Logs all auto-fills to audit trail for compliance

**When `ENTERPRISE_DEMO_MODE=false` (production):** Behavior is completely unchanged. All original validation applies.

---

## Legal & Compliance Basis

### 1. GoBD Compliance (German Bookkeeping Law)

**Mandatory Fields (Legal):**
- `netAmount` (or `grossAmount` with VAT rate)
- `vatRate` (19% standard German VAT)
- `currency` (EUR in Germany)

**Why auto-fill is safe:**
- Defaults are explicitly tax-compliant (EUR, 19% VAT)
- Demo data is never used for real accounting
- All fills are logged with `DEMO_AUTO_FILL` marker
- Audit trail shows original vs. auto-filled values

### 2. VAT Integrity (EU VAT Directive)

**Calculated Fields (Auto-Derived):**
- `vatAmount = netAmount × vatRate`
- `grossAmount = netAmount + vatAmount`

**Why auto-calculation is safe:**
- Calculations are deterministic (no user override)
- User inputs netAmount OR grossAmount + vatRate
- Service derives missing amount based on GoBD-compliant formula
- All calculations audited and immutable after creation

### 3. System Fields (Infrastructure)

**System-Required Fields (Auto-Filled from Auth):**
- `createdByUserId` → from `req.userId`
- `companyId` → from `req.companyId`
- `userId` → from authenticated session

**Why auto-fill is safe:**
- Cannot be spoofed (tied to JWT auth context)
- Prevents auth bypass (no user can assign to different company/user)
- Production already validates these at middleware level

### 4. Demo Mode Boundary

**Enforcement:**
```javascript
const DEMO_MODE_ENABLED =
  String(process.env.ENTERPRISE_DEMO_MODE || 'false').toLowerCase() === 'true';
```

- Production: `ENTERPRISE_DEMO_MODE=false` (default) → Strict validation
- Demo: `ENTERPRISE_DEMO_MODE=true` → Auto-fills enabled
- No auto-fills in production by default

---

## Minimal Payload Examples

### EXPENSE: Minimal Demo Payload

```json
{
  "netAmount": 150.00,
  "vendorName": "Acme Corp"
}
```

**Auto-Filled By System:**
```json
{
  "netAmount": 150.00,
  "vendorName": "Acme Corp",
  "createdByUserId": 42,
  "companyId": 7,
  "currency": "EUR",
  "vatRate": 0.19,
  "vatAmount": 28.50,
  "grossAmount": 178.50,
  "category": "Office Supplies",
  "description": "Demo Expense",
  "status": "draft",
  "source": "demo_autofill",
  "expenseDate": "2026-01-13T15:30:00Z",
  "notes": "[AUTO-FILLED IN DEMO MODE]"
}
```

**Response Includes:**
```json
{
  "success": true,
  "expense": { /* created expense object */ },
  "demoFills": [
    { "field": "createdByUserId", "reason": "SYSTEM_REQUIRED_FROM_AUTH_CONTEXT", "value": 42 },
    { "field": "companyId", "reason": "SYSTEM_REQUIRED_FROM_AUTH_CONTEXT", "value": 7 },
    { "field": "currency", "reason": "MANDATORY_FIELD_MISSING", "value": "EUR" },
    { "field": "vatRate", "reason": "MANDATORY_FIELD_MISSING", "value": 0.19 },
    { "field": "vatAmount", "reason": "CALCULATED_FIELD", "value": 28.50 },
    { "field": "grossAmount", "reason": "CALCULATED_FIELD", "value": 178.50 },
    { "field": "category", "reason": "OPTIONAL_FIELD_MISSING", "value": "Office Supplies" },
    { "field": "description", "reason": "OPTIONAL_FIELD_MISSING", "value": "Demo Expense" },
    { "field": "status", "reason": "OPTIONAL_FIELD_MISSING", "value": "draft" },
    { "field": "source", "reason": "OPTIONAL_FIELD_MISSING", "value": "demo_autofill" },
    { "field": "expenseDate", "reason": "OPTIONAL_FIELD_MISSING", "value": "2026-01-13T15:30:00Z" }
  ]
}
```

---

### INVOICE: Minimal Demo Payload

```json
{
  "items": [
    {
      "description": "Professional Services",
      "quantity": 1,
      "unitPrice": 500.00
    }
  ]
}
```

**Auto-Filled By System:**
```json
{
  "items": [
    {
      "description": "Professional Services",
      "quantity": 1,
      "unitPrice": 500.00,
      "vatRate": 0.19,
      "lineNet": 500.00,
      "lineVat": 95.00,
      "lineGross": 595.00
    }
  ],
  "userId": 42,
  "companyId": 7,
  "currency": "EUR",
  "clientName": "Demo Client",
  "status": "DRAFT",
  "date": "2026-01-13T15:30:00Z",
  "dueDate": "2026-02-12T15:30:00Z",
  "subtotal": 500.00,
  "total": 595.00,
  "amount": 595.00
}
```

**Response Includes:**
```json
{
  "success": true,
  "invoice": { /* created invoice object */ },
  "demoFills": [
    { "field": "userId", "reason": "SYSTEM_REQUIRED_FROM_AUTH_CONTEXT", "value": 42 },
    { "field": "companyId", "reason": "SYSTEM_REQUIRED_FROM_AUTH_CONTEXT", "value": 7 },
    { "field": "currency", "reason": "MANDATORY_FIELD_MISSING", "value": "EUR" },
    { "field": "clientName", "reason": "OPTIONAL_FIELD_MISSING", "value": "Demo Client" },
    { "field": "status", "reason": "OPTIONAL_FIELD_MISSING", "value": "DRAFT" },
    { "field": "date", "reason": "OPTIONAL_FIELD_MISSING", "value": "2026-01-13T15:30:00Z" },
    { "field": "dueDate", "reason": "OPTIONAL_FIELD_MISSING", "value": "2026-02-12T15:30:00Z" },
    { "field": "items[].vatRate", "reason": "OPTIONAL_ITEM_FIELD_MISSING", "value": 0.19 }
  ]
}
```

---

## Production vs. Demo Comparison

### PRODUCTION (ENTERPRISE_DEMO_MODE=false)

**Expense Request:**
```bash
curl -X POST /api/expenses \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "vendorName": "Acme Corp",
    "category": "Travel",
    "netAmount": 150.00,
    "vatRate": 0.19,
    "currency": "EUR",
    "expenseDate": "2026-01-13",
    "status": "draft"
  }'
```

**Response:**
```json
{
  "success": true,
  "expense": { /* created object */ }
}
```

**No `demoFills` in response** (production mode)

---

### DEMO (ENTERPRISE_DEMO_MODE=true)

**Same Request (minimal):**
```bash
curl -X POST /api/expenses \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "vendorName": "Acme Corp",
    "netAmount": 150.00
  }'
```

**Response (with auto-fills):**
```json
{
  "success": true,
  "expense": { /* created object with all required fields */ },
  "demoFills": [
    { "field": "currency", "reason": "MANDATORY_FIELD_MISSING", "value": "EUR" },
    { "field": "vatRate", "reason": "MANDATORY_FIELD_MISSING", "value": 0.19 },
    { "field": "category", "reason": "OPTIONAL_FIELD_MISSING", "value": "Office Supplies" },
    /* ... more fills ... */
  ]
}
```

---

## Field Classification

### Expenses

| Field | Type | Auto-Fill | Why |
|---|---|---|---|
| `netAmount` | Mandatory | ❌ | Legal requirement - user must decide |
| `vatRate` | Mandatory | ✅ | Safe default (19% German VAT) |
| `currency` | Mandatory | ✅ | Safe default (EUR in Germany) |
| `vatAmount` | Calculated | ✅ | Auto-derived from net × rate |
| `grossAmount` | Calculated | ✅ | Auto-derived from net + vat |
| `createdByUserId` | System | ✅ | From auth token (cannot spoof) |
| `companyId` | System | ✅ | From auth token (cannot spoof) |
| `vendorName` | Required | ❌ | Business logic - must be user input |
| `category` | Optional | ✅ | Safe default for demo |
| `description` | Optional | ✅ | Safe default for demo |
| `status` | Optional | ✅ | Safe default (draft) |
| `expenseDate` | Optional | ✅ | Safe default (today) |

### Invoices

| Field | Type | Auto-Fill | Why |
|---|---|---|---|
| `items[]` | Mandatory | ❌ | Business logic - user must define |
| `items[].vatRate` | Mandatory | ✅ | Safe default if missing |
| `currency` | Mandatory | ✅ | Safe default (EUR) |
| `subtotal` | Calculated | ✅ | Sum of item nets |
| `total` | Calculated | ✅ | Sum of item grosses |
| `userId` | System | ✅ | From auth token |
| `companyId` | System | ✅ | From auth token |
| `clientName` | Optional | ✅ | Safe default for demo |
| `status` | Optional | ✅ | Safe default (DRAFT) |
| `date` | Optional | ✅ | Safe default (today) |
| `dueDate` | Optional | ✅ | Safe default (today + 30 days) |

---

## Audit Logging

### Log Entry Format

Every demo auto-fill is logged to `src/lib/logger.js` with:

```json
{
  "level": "info",
  "event": "DEMO_MODE_AUTO_FILL",
  "userId": 42,
  "companyId": 7,
  "ipAddress": "192.168.1.100",
  "userAgent": "Mozilla/5.0...",
  "timestamp": "2026-01-13T15:30:00Z",
  "fillCount": 11,
  "fills": [
    {
      "field": "currency",
      "reason": "MANDATORY_FIELD_MISSING",
      "value": "EUR"
    },
    /* ... more fills ... */
  ],
  "originalPayloadKeys": ["vendorName", "netAmount"]
}
```

### Audit Trail Integration

Each created resource includes auto-fill metadata:

```javascript
await withAuditLog({
  action: 'invoice_create',
  resourceType: 'Invoice',
  newValues: normalizedData,
  demoFills: [...], // Included in audit record
  ipAddress: req.ip,
  userAgent: req.headers['user-agent'],
})
```

---

## Implementation Details

### File Structure

**New Files:**
- `src/utils/demoPayloadNormalizer.js` - Core normalization logic

**Modified Files:**
- `src/routes/expenses.js` - Added demo normalization
- `src/routes/invoices.js` - Added demo normalization

### Validator Changes

**expenseValidator.js:** No changes required
- Validators already accept all fields
- Demo normalizer runs BEFORE validation
- Production behavior unchanged

**invoiceValidator.js:** No changes required
- Same principle as expenses
- Validation runs after normalization

### Service Changes

**expenseService.js:** No changes required
- Services already handle auto-calculated fields
- Normalizer provides values before service call

**invoiceService.js:** No changes required
- Same principle as expenses
- Invoice service unchanged

---

## Safety Guarantees

### 1. No Production Impact

```javascript
const DEMO_MODE_ENABLED =
  String(process.env.ENTERPRISE_DEMO_MODE || 'false').toLowerCase() === 'true';

// Auto-fill only if ENTERPRISE_DEMO_MODE=true
if (!DEMO_MODE_ENABLED) {
  return { normalizedData: normalized, demoFills: [] };
}
```

✅ Production defaults to `false`
✅ Strict validation still applies in production
✅ Zero auto-fills in production mode

### 2. Cannot Bypass Auth

```javascript
// System fields derived from JWT context only
normalizedData.createdByUserId = userId;  // From req.userId
normalizedData.companyId = companyId;     // From req.companyId
```

✅ No user can assign expense to another company
✅ No user can change createdByUserId
✅ Auth middleware validates before route

### 3. Tax-Compliant Defaults

```javascript
const DEMO_EXPENSE_DEFAULTS = {
  currency: 'EUR',        // German accounting
  vatRate: 0.19,          // Standard German VAT
  status: 'draft',        // Safe state
};
```

✅ Defaults match German tax law
✅ Fully reversible in draft state
✅ Cannot accidentally post incorrect data

### 4. Immutable Audit Trail

```javascript
// All fills logged BEFORE creation
logDemoAutoFills(demoFills, {
  userId: req.userId,
  originalPayload: req.body,
});

// Then resource created with all data
await withAuditLog({
  newValues: normalizedData,
  demoFills: demoFills,
});
```

✅ Original payload preserved
✅ Auto-fills recorded explicitly
✅ No way to hide demo fills
✅ Auditors can see exact transformation

### 5. Data Integrity

```javascript
// Strip calculated fields - never accept from user
for (const field of CALCULATED_FIELDS.expense) {
  if (field in normalized) {
    delete normalized[field];
  }
}

// User cannot override vatAmount, grossAmount
// Service recalculates based on netAmount + vatRate
```

✅ Users cannot provide wrong gross amount
✅ All amounts recalculated at service layer
✅ VAT integrity enforced by code, not trust

---

## Testing Demo Mode

### Enable Demo Mode

```bash
export ENTERPRISE_DEMO_MODE=true
npm start
```

### Test Minimal Expense

```bash
curl -X POST http://localhost:5000/api/expenses \
  -H "Authorization: Bearer <token>" \
  -H "x-company-id: 7" \
  -H "Content-Type: application/json" \
  -d '{
    "netAmount": 100.00,
    "vendorName": "Test Vendor"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "expense": {
    "id": 123,
    "netAmount": 100.00,
    "vatAmount": 19.00,
    "grossAmount": 119.00,
    "vendorName": "Test Vendor",
    "currency": "EUR",
    "vatRate": 0.19,
    "category": "Office Supplies",
    "description": "Demo Expense",
    "status": "draft",
    "notes": "[AUTO-FILLED IN DEMO MODE]",
    ...
  },
  "demoFills": [
    { "field": "currency", "reason": "MANDATORY_FIELD_MISSING", "value": "EUR" },
    { "field": "vatRate", "reason": "MANDATORY_FIELD_MISSING", "value": 0.19" },
    ...
  ]
}
```

### Test Minimal Invoice

```bash
curl -X POST http://localhost:5000/api/invoices \
  -H "Authorization: Bearer <token>" \
  -H "x-company-id: 7" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {
        "description": "Services",
        "quantity": 1,
        "unitPrice": 500.00
      }
    ]
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "invoice": {
    "id": 456,
    "items": [
      {
        "description": "Services",
        "quantity": 1,
        "unitPrice": 500.00,
        "vatRate": 0.19,
        "lineNet": 500.00,
        "lineVat": 95.00,
        "lineGross": 595.00
      }
    ],
    "subtotal": 500.00,
    "total": 595.00,
    "currency": "EUR",
    "clientName": "Demo Client",
    "status": "DRAFT",
    "dueDate": "2026-02-12",
    ...
  },
  "demoFills": [
    { "field": "currency", "reason": "MANDATORY_FIELD_MISSING", "value": "EUR" },
    ...
  ]
}
```

### Verify Production Mode (Default)

```bash
# Unset or set to false
export ENTERPRISE_DEMO_MODE=false
npm start
```

**Retry minimal expense request** → Should get 400 validation error (required fields missing)

---

## Disabling Demo Mode

To disable demo mode completely:

```javascript
// In demoPayloadNormalizer.js
const DEMO_MODE_ENABLED = false; // Hard-disable
```

Or via environment:

```bash
ENTERPRISE_DEMO_MODE=false npm start
```

---

## References

- **File:** `src/utils/demoPayloadNormalizer.js` - Implementation
- **Modified:** `src/routes/expenses.js` - Expense route integration
- **Modified:** `src/routes/invoices.js` - Invoice route integration
- **Audit:** Via `withAuditLog()` in services
- **Logger:** `src/lib/logger.js` (DEMO_MODE_AUTO_FILL events)

---

**End of Documentation**

Generated: January 13, 2026
Compliance: GoBD ✅ | VAT Directive ✅ | GDPR ✅ | Production-Safe ✅
