# AI Demo Quick Reference

**Enterprise AI Assistant - Example Prompts & Expected Outputs**

---

## Invoice Analysis

### Prompt 1: "Check this invoice for compliance"

**API Call:**
```bash
GET /api/ai/read/invoice-summary?invoiceId=INV-001
```

**Expected Output:**
```json
{
  "aiSummary": {
    "executiveSummary": "Invoice €1,785 fully paid. VAT compliant (19% standard rate).",
    "complianceStatus": "COMPLIANT",
    "complianceChecks": {
      "vatCalculation": {
        "status": "PASS",
        "confidence": 0.95,
        "legalContext": "UStG §12 Abs. 1"
      }
    },
    "riskAssessment": {
      "overallRisk": "LOW",
      "riskScore": 0.15
    }
  },
  "_aiMetadata": {
    "policyVersion": "10.0.0",
    "disclaimer": "AI analysis is advisory only. GoBD/GDPR enforced."
  }
}
```

**Demo Value:**
- ✅ Instant compliance verification
- ✅ GoBD-ready documentation
- ✅ Risk scoring (0-1 scale)
- ✅ Legal citations included

---

### Prompt 2: "Is the VAT calculated correctly?"

**API Call:**
```bash
GET /api/ai/read/invoice-summary?invoiceId=INV-002
```

**Expected Output:**
```json
{
  "aiSummary": {
    "complianceChecks": {
      "vatCalculation": {
        "status": "PASS",
        "confidence": 0.97,
        "explanation": "All line items use 19% standard rate. Total VAT €285 verified against line items.",
        "legalContext": "UStG §12 Abs. 1 (German VAT Act - Standard Rate)"
      }
    }
  }
}
```

**Demo Value:**
- ✅ Line-by-line VAT verification
- ✅ Confidence score (0.97 = 97%)
- ✅ Legal reference to UStG §12

---

### Prompt 3: "Why is this invoice late?"

**API Call:**
```bash
GET /api/ai/read/invoice-summary?invoiceId=INV-003
```

**Expected Output:**
```json
{
  "aiSummary": {
    "riskAssessment": {
      "factors": [
        {
          "category": "Payment Delay",
          "severity": "LOW",
          "description": "Final payment received 40 days after issue (10 days past due date).",
          "recommendation": "No action required. Monitor for pattern."
        }
      ]
    },
    "recommendations": [
      {
        "priority": "LOW",
        "category": "Process Optimization",
        "suggestion": "Consider payment reminders at 20 days to reduce late payments."
      }
    ]
  }
}
```

**Demo Value:**
- ✅ Root cause analysis
- ✅ Actionable recommendations
- ✅ Priority-based suggestions

---

## Reconciliation Analysis

### Prompt 4: "Reconcile this month's accounts"

**API Call:**
```bash
GET /api/ai/read/reconciliation-summary?range=2026-01-01_to_2026-01-31
```

**Expected Output:**
```json
{
  "aiAnalysis": {
    "executiveSummary": "Minor discrepancy of €50 (outstanding check). VAT liability €605 due Feb 10.",
    "reconciliationStatus": "REQUIRES_ATTENTION",
    "keyFindings": [
      {
        "area": "Bank Reconciliation",
        "status": "MINOR_ISSUE",
        "confidence": 0.94,
        "finding": "Bank balance differs by €50 (0.4% variance).",
        "recommendation": "Follow up if check not cleared within 14 days.",
        "priority": "MEDIUM"
      },
      {
        "area": "VAT Reconciliation",
        "status": "COMPLIANT",
        "confidence": 0.96,
        "finding": "Net VAT liability correctly calculated at €1,805.",
        "recommendation": "Submit UVA and remit €605 by Feb 10.",
        "priority": "HIGH",
        "deadline": "2026-02-10"
      }
    ],
    "automatedChecks": {
      "duplicateTransactions": { "status": "PASS", "duplicatesFound": 0 },
      "missingDocumentation": { "status": "PASS", "missingCount": 0 }
    }
  }
}
```

**Demo Value:**
- ✅ Multi-area analysis (bank, VAT, payroll)
- ✅ Automated duplicate detection
- ✅ Deadline tracking
- ✅ Priority-based action items

---

### Prompt 5: "Are there any outstanding items?"

**API Call:**
```bash
GET /api/ai/read/reconciliation-summary?range=2026-01-01_to_2026-01-31
```

**Expected Output:**
```json
{
  "bankAccount": {
    "outstandingItems": [
      {
        "date": "2026-01-03",
        "description": "[DEMO] Outstanding check #1234",
        "amount": 50,
        "status": "pending"
      }
    ]
  },
  "aiAnalysis": {
    "keyFindings": [
      {
        "area": "Bank Reconciliation",
        "finding": "One outstanding check identified (Check #1234, issued 10 days ago).",
        "recommendation": "Follow up with payee if check not cleared within 14 days."
      }
    ]
  }
}
```

**Demo Value:**
- ✅ Outstanding item tracking
- ✅ Time-based recommendations
- ✅ Follow-up guidance

---

## VAT Analysis

### Prompt 6: "Calculate VAT due this month"

**API Call:**
```bash
GET /api/exports/vat-summaries?month=2026-01
```

**Expected Output:**
```json
{
  "summaries": [{
    "netVatLiability": 2755,
    "currentDue": 1255,
    "aiAnalysis": {
      "vatComplianceStatus": "COMPLIANT",
      "keyFindings": [
        {
          "area": "VAT Calculation Accuracy",
          "status": "COMPLIANT",
          "confidence": 0.97,
          "finding": "All VAT calculations verified. Standard rate (19%) applied consistently across 12 invoices.",
          "legalContext": "UStG §12 - Standard VAT Rate"
        }
      ],
      "recommendations": [
        {
          "priority": "HIGH",
          "category": "UVA Submission",
          "suggestion": "Submit UVA via ELSTER and remit €1,255.",
          "requiredBy": "2026-02-10",
          "actionSteps": [
            "Log in to ELSTER portal",
            "Select UVA form for current period",
            "Verify amounts",
            "Submit electronically",
            "Initiate bank transfer"
          ]
        }
      ]
    }
  }]
}
```

**Demo Value:**
- ✅ Precise VAT calculation
- ✅ UVA submission checklist
- ✅ ELSTER integration guidance
- ✅ Deadline enforcement

---

### Prompt 7: "Can I save money on VAT?"

**API Call:**
```bash
GET /api/exports/vat-summaries?month=2026-01
```

**Expected Output:**
```json
{
  "aiAnalysis": {
    "keyFindings": [
      {
        "area": "Reduced Rate Eligibility",
        "status": "OPPORTUNITY",
        "confidence": 0.82,
        "finding": "Potential savings available if reduced rates (7%) applicable.",
        "explanation": "German VAT law provides 7% reduced rate for books, newspapers, food, medical equipment.",
        "legalContext": "UStG §12 Abs. 2 - Reduced Rate",
        "recommendation": "Review expense categories. Estimated annual savings: €200-500."
      }
    ]
  }
}
```

**Demo Value:**
- ✅ Tax optimization opportunities
- ✅ Savings quantification
- ✅ Legal references (UStG §12 Abs. 2)

---

### Prompt 8: "Check for VAT errors"

**API Call:**
```bash
GET /api/exports/vat-summaries?month=2026-01
```

**Expected Output:**
```json
{
  "aiAnalysis": {
    "automatedChecks": {
      "vatRateConsistency": {
        "checked": true,
        "inconsistenciesFound": 0,
        "confidence": 0.99,
        "status": "PASS",
        "details": "All 30 transactions use correct 19% standard rate."
      },
      "invoiceCompleteness": {
        "checked": true,
        "missingVatIds": 0,
        "confidence": 0.96,
        "status": "PASS",
        "details": "All B2B invoices include valid VAT-ID numbers."
      }
    }
  }
}
```

**Demo Value:**
- ✅ Automated error detection
- ✅ Consistency checking
- ✅ B2B compliance verification

---

## Confidence Interpretation

| Confidence Score | Meaning | Action Required |
|-----------------|---------|-----------------|
| **0.95 - 1.00** | Very High Confidence | Accept with minimal review |
| **0.85 - 0.94** | High Confidence | Quick verification recommended |
| **0.70 - 0.84** | Moderate Confidence | Detailed review required |
| **< 0.70** | Low Confidence | Manual verification mandatory |

---

## Risk Score Interpretation

| Risk Score | Level | Description | Response Time |
|-----------|-------|-------------|---------------|
| **0.00 - 0.20** | LOW | No critical issues | Review within 7 days |
| **0.21 - 0.50** | MEDIUM | Minor issues identified | Review within 3 days |
| **0.51 - 0.75** | HIGH | Significant issues | Review within 24 hours |
| **0.76 - 1.00** | CRITICAL | Urgent action required | Immediate review |

---

## Priority Levels

### HIGH Priority
- VAT payment deadlines
- Missing documentation for audit
- Calculation errors
- **Action:** Address within 24 hours

### MEDIUM Priority
- Outstanding reconciliation items
- Payment delays
- Process optimization
- **Action:** Address within 1 week

### LOW Priority
- Process improvements
- Potential savings opportunities
- Documentation enhancements
- **Action:** Review in monthly planning

---

## Response Flags

### `demo: true`
- Response generated in demo mode
- Uses simulated data
- No real AI model called

### `_simulated: true`
- Data object is simulated
- Not from real database
- For demo purposes only

### `_demo: true`
- Individual data item is simulated
- Marked for easy filtering
- Example: `{ "id": "demo_payment_1", "_demo": true }`

---

## Legal Context References

### Common Citations

| Citation | Meaning | Relevance |
|---------|---------|-----------|
| **UStG §12 Abs. 1** | German VAT Act - Standard Rate (19%) | VAT calculations |
| **UStG §12 Abs. 2** | German VAT Act - Reduced Rate (7%) | Tax optimization |
| **UStG §13b** | Reverse Charge Mechanism | Cross-border B2B |
| **UStG §15** | Input VAT Deduction | Expense VAT recovery |
| **GoBD 2019** | German Bookkeeping Principles | Compliance requirements |
| **EStG** | German Income Tax Act | Payroll, expenses |
| **SGB** | German Social Insurance Code | Payroll deductions |
| **StBerG** | Tax Consulting Law | Advisory disclaimers |

---

## Testing Checklist

### ✅ Verify Demo Mode Active
```bash
# Check environment variable
echo $ENTERPRISE_DEMO_MODE  # Should be "true"

# Test invoice summary
curl -X GET "http://localhost:5000/api/ai/read/invoice-summary?invoiceId=INV-001" \
  -H "Authorization: Bearer $TOKEN" | jq '.demo'
# Expected: true
```

### ✅ Verify Policy Version
```bash
# Check policy version in response
curl -X GET "http://localhost:5000/api/ai/read/invoice-summary?invoiceId=INV-001" \
  -H "Authorization: Bearer $TOKEN" | jq '.summary._aiMetadata.policyVersion'
# Expected: "10.0.0"
```

### ✅ Verify Disclaimers Present
```bash
# Check disclaimer field
curl -X GET "http://localhost:5000/api/ai/read/invoice-summary?invoiceId=INV-001" \
  -H "Authorization: Bearer $TOKEN" | jq '.summary._aiMetadata.disclaimer'
# Expected: "AI analysis is advisory only..."
```

### ✅ Verify Read-Only Enforcement
```bash
# Try mutation endpoint (should fail)
curl -X POST "http://localhost:5000/api/ai/insights/generate" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type": "expense_category"}'
# Expected: {"error": "AI_INSIGHTS_DISABLED", "status": 501}
```

---

## Common Issues & Solutions

### Issue: `demo: false` when expecting demo mode

**Cause:** ENTERPRISE_DEMO_MODE not set or set to "false"

**Solution:**
```bash
export ENTERPRISE_DEMO_MODE=true
npm start
```

### Issue: Missing `_aiMetadata` in response

**Cause:** Using old version of demoSimulationService

**Solution:**
```bash
git pull origin main
npm install
npm start
```

### Issue: policyVersion mismatch error

**Cause:** Client sending wrong policy version

**Solution:**
```javascript
// In client code
const AI_POLICY_VERSION = '10.0.0';  // Match server version
```

---

## Demo Script for Investors

### 1. Show Invoice Compliance (30 seconds)

```bash
# API call
GET /api/ai/read/invoice-summary?invoiceId=INV-001

# Highlight in response:
- complianceStatus: "COMPLIANT"
- confidence: 0.95
- legalContext: "UStG §12 Abs. 1"
- disclaimer: "AI analysis is advisory only..."
```

**Talking Points:**
- "AI verifies VAT calculations against German law (UStG)"
- "95% confidence means audit-ready documentation"
- "Notice the disclaimer - we never automate without approval"

### 2. Show Risk Detection (30 seconds)

```bash
# API call
GET /api/ai/read/invoice-summary?invoiceId=INV-003

# Highlight in response:
- riskScore: 0.15 (LOW)
- Payment delay detected (10 days overdue)
- Recommendation: "Send payment reminder"
```

**Talking Points:**
- "AI detects payment delays automatically"
- "Risk scoring helps prioritize attention"
- "Actionable recommendations, not just alerts"

### 3. Show Reconciliation Power (45 seconds)

```bash
# API call
GET /api/ai/read/reconciliation-summary?range=2026-01-01_to_2026-01-31

# Highlight in response:
- Outstanding check identified (€50)
- VAT deadline flagged (Feb 10)
- Automated duplicate detection (0 found)
```

**Talking Points:**
- "Multi-area reconciliation in seconds (bank, VAT, payroll)"
- "Automated checks catch duplicates and missing docs"
- "Deadline tracking prevents penalties (1% per month)"

### 4. Show VAT Optimization (30 seconds)

```bash
# API call
GET /api/exports/vat-summaries?month=2026-01

# Highlight in response:
- Potential savings: €200-500/year
- UVA submission checklist (ELSTER)
- Legal reference: UStG §12 Abs. 2
```

**Talking Points:**
- "AI identifies tax optimization opportunities"
- "Step-by-step ELSTER submission guidance"
- "Always includes legal references for Steuerberater review"

---

**Document Version:** 1.0.0
**Last Updated:** January 13, 2026
**Policy Version:** 10.0.0
