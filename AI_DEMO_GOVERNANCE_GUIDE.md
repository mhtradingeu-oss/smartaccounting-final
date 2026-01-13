# AI Demo Governance Guide

**SmartAccounting™ Enterprise Demo Mode - AI Read-Only Assistant**

---

## Executive Summary

This document describes the AI governance architecture for demo mode, showcasing enterprise-level AI capabilities while maintaining strict read-only compliance. All AI features respect German accounting law (GoBD, UStG) and data protection (GDPR).

### Key Principles

✅ **Read-Only AI** - No data modifications, ever
✅ **Advisory Only** - All suggestions require human review
✅ **Compliance First** - German tax law disclaimers on all outputs
✅ **Policy Versioning** - All responses include policyVersion: 10.0.0
✅ **Audit Trail** - Every AI interaction logged with requestId

---

## AI Capabilities (Demo Mode)

### 1. Invoice Summary & Risk Analysis

**Endpoint:** `GET /api/ai/read/invoice-summary?invoiceId=INV-001`

**What It Does:**
- Analyzes invoice completeness and VAT calculations
- Assesses compliance with GoBD requirements
- Identifies payment delays and risks
- Provides actionable recommendations

**Example Response:**

```json
{
  "summary": {
    "invoiceId": "DEMO-INV-001",
    "status": "PAID",
    "total": 1785,
    "aiSummary": {
      "executiveSummary": "[DEMO AI] This invoice for professional services totaling €1,785 has been fully paid. Standard 19% VAT applied correctly across all line items.",
      "complianceStatus": "COMPLIANT",
      "complianceChecks": {
        "vatCalculation": {
          "status": "PASS",
          "confidence": 0.95,
          "explanation": "All line items correctly apply German standard VAT rate (19%). Total VAT of €285 verified.",
          "legalContext": "UStG §12 Abs. 1 (German VAT Act - Standard Rate)"
        },
        "invoiceCompleteness": {
          "status": "PASS",
          "confidence": 0.92,
          "explanation": "Invoice contains all mandatory fields: client details, issue date, payment terms, itemized services, VAT breakdown.",
          "legalContext": "GoBD 2019 - Invoice Requirements"
        }
      },
      "riskAssessment": {
        "overallRisk": "LOW",
        "riskScore": 0.15,
        "factors": [
          {
            "category": "Payment Delay",
            "severity": "LOW",
            "description": "Final payment received 40 days after issue (10 days past due date).",
            "recommendation": "No action required. Monitor for pattern."
          }
        ]
      }
    },
    "_aiMetadata": {
      "policyVersion": "10.0.0",
      "modelVersion": "demo-simulation-v1",
      "disclaimer": "AI analysis is advisory only. All suggestions require human review and approval. No data is modified automatically. GoBD/GDPR compliance enforced.",
      "purposeLimitation": "READ_ONLY_ANALYSIS",
      "confidenceThreshold": 0.85
    }
  },
  "requestId": "req_abc123",
  "demo": true,
  "_simulated": true,
  "message": "Simulated invoice summary (AI unavailable in demo)"
}
```

**Business Value:**
- **Time Savings:** Instant compliance check vs. manual review (5-10 minutes saved per invoice)
- **Risk Mitigation:** Early detection of VAT errors, missing documentation
- **Audit Readiness:** GoBD-compliant explanations ready for Betriebsprüfung (tax audit)

---

### 2. Reconciliation Analysis

**Endpoint:** `GET /api/ai/read/reconciliation-summary?range=2026-01-01_to_2026-01-31`

**What It Does:**
- Analyzes bank/accounting balance variances
- Validates VAT liability calculations
- Verifies payroll reconciliation
- Flags outstanding items and deadlines

**Example Response:**

```json
{
  "summary": {
    "range": "2026-01-01 to 2026-01-31",
    "aiAnalysis": {
      "executiveSummary": "[DEMO AI] Reconciliation analysis shows minor discrepancy of €50 due to outstanding check. VAT liability of €605 currently due.",
      "reconciliationStatus": "REQUIRES_ATTENTION",
      "keyFindings": [
        {
          "area": "Bank Reconciliation",
          "status": "MINOR_ISSUE",
          "confidence": 0.94,
          "finding": "Bank balance differs from accounting balance by €50 (0.4% variance).",
          "explanation": "One outstanding check identified (Check #1234, issued 10 days ago).",
          "legalContext": "GoBD - Bank Reconciliation Requirements",
          "recommendation": "Follow up with payee if check not cleared within 14 days.",
          "priority": "MEDIUM"
        },
        {
          "area": "VAT Reconciliation",
          "status": "COMPLIANT",
          "confidence": 0.96,
          "finding": "Net VAT liability correctly calculated at €1,805.",
          "legalContext": "UStG - VAT Reporting & Payment",
          "recommendation": "Submit UVA and remit €605 by statutory deadline.",
          "priority": "HIGH",
          "actionRequired": "VAT payment due",
          "deadline": "2026-02-10"
        }
      ],
      "riskAssessment": {
        "overallRisk": "LOW",
        "riskScore": 0.22,
        "criticalIssues": 0,
        "warningIssues": 1
      },
      "automatedChecks": {
        "duplicateTransactions": { "status": "PASS", "confidence": 0.99 },
        "missingDocumentation": { "status": "PASS", "confidence": 0.91 },
        "categorization": { "status": "PASS", "confidence": 0.88 }
      }
    },
    "_aiMetadata": {
      "policyVersion": "10.0.0",
      "disclaimer": "AI reconciliation analysis is advisory only. Tax obligations must be verified by qualified tax advisor (Steuerberater).",
      "legalNotice": "This analysis does not constitute tax or legal advice."
    }
  },
  "requestId": "req_def456",
  "demo": true
}
```

**Business Value:**
- **Deadline Management:** Automatic VAT deadline tracking prevents penalties (1% per month)
- **Variance Detection:** AI identifies reconciliation issues humans might miss
- **Compliance Confidence:** GoBD-ready reconciliation documentation

---

### 3. VAT Analysis & Optimization

**Endpoint:** `GET /api/exports/vat-summaries?month=2026-01`

**What It Does:**
- Validates VAT rate consistency across all transactions
- Identifies reduced-rate eligibility opportunities
- Checks cross-border transaction compliance
- Calculates UVA submission amounts

**Example Response:**

```json
{
  "summaries": [
    {
      "period": "2026-01-01",
      "netVatLiability": 2755,
      "currentDue": 1255,
      "aiAnalysis": {
        "vatComplianceStatus": "COMPLIANT",
        "keyFindings": [
          {
            "area": "VAT Calculation Accuracy",
            "status": "COMPLIANT",
            "confidence": 0.97,
            "finding": "All VAT calculations verified. Standard rate (19%) applied consistently.",
            "legalContext": "UStG §12 - Standard VAT Rate"
          },
          {
            "area": "Reduced Rate Eligibility",
            "status": "OPPORTUNITY",
            "confidence": 0.82,
            "finding": "Potential savings available if reduced rates (7%) applicable.",
            "explanation": "Review transaction categories for books, food, medical equipment eligibility.",
            "legalContext": "UStG §12 Abs. 2 - Reduced Rate",
            "recommendation": "Estimated potential annual savings: €200-500"
          }
        ],
        "automatedChecks": {
          "vatRateConsistency": {
            "status": "PASS",
            "confidence": 0.99,
            "details": "All 30 transactions use correct 19% standard rate."
          },
          "invoiceCompleteness": {
            "status": "PASS",
            "confidence": 0.96,
            "details": "All B2B invoices include valid VAT-ID numbers."
          }
        },
        "recommendations": [
          {
            "priority": "HIGH",
            "category": "UVA Submission",
            "suggestion": "Submit Umsatzsteuervoranmeldung (UVA) via ELSTER and remit €1,255.",
            "requiredBy": "2026-02-10",
            "actionSteps": [
              "Log in to ELSTER portal",
              "Select UVA form for current period",
              "Verify amounts: €2,755 liability, €1,500 previous payment, €1,255 due",
              "Submit electronically",
              "Initiate bank transfer with UVA reference"
            ]
          }
        ]
      },
      "_aiMetadata": {
        "policyVersion": "10.0.0",
        "disclaimer": "AI VAT analysis is advisory only. Tax calculations must be verified by qualified Steuerberater.",
        "legalNotice": "This analysis does not constitute tax advice."
      }
    }
  ],
  "demo": true,
  "_simulated": true
}
```

**Business Value:**
- **Tax Optimization:** Identifies potential VAT savings (€200-500/year)
- **Penalty Avoidance:** Deadline tracking prevents late payment fees
- **ELSTER Ready:** Step-by-step UVA submission guidance

---

## Compliance & Safety Guarantees

### 1. Read-Only Enforcement

**Code Evidence:**
```javascript
// src/routes/aiReadOnly.js - Line 26
const isAssistantFeatureEnabled = normalizeFlag(process.env.AI_ASSISTANT_ENABLED ?? 'true');

// All AI routes are GET-only
router.get('/invoice-summary', async (req, res, next) => { /* ... */ });
router.get('/reconciliation-summary', async (req, res, next) => { /* ... */ });
```

**Mutation Routes Disabled:**
```javascript
// src/routes/ai.js - Line 18-28
router.post('/insights/generate', (req, res) => {
  res.status(501).json({
    error: 'AI_INSIGHTS_DISABLED',
    message: 'AI insight generation is disabled. Use read-only endpoints.'
  });
});
```

**Database Protection:**
- AI service never imports Invoice, Expense, or TaxReport models for writes
- All generators are pure functions (no database connections)
- Demo simulation marked with `_demo: true` and `_simulated: true`

### 2. Policy Version Enforcement

**Every Response Includes:**
```json
{
  "_aiMetadata": {
    "policyVersion": "10.0.0",
    "modelVersion": "demo-simulation-v1",
    "generated": "2026-01-13T10:30:00.000Z",
    "purposeLimitation": "READ_ONLY_ANALYSIS",
    "confidenceThreshold": 0.85
  }
}
```

**Policy Version Validation:**
```javascript
// src/middleware/aiRouteGuard.js - Line 92-105
const resolvedPolicyVersion = resolvePolicyVersion(req, defaultPolicyVersion) || '10.0.0';

if (requirePolicyVersion && !resolvedPolicyVersion) {
  return next(new ApiError(400, 'AI_PURPOSE_REQUIRED',
    'AI calls require purpose and policyVersion'));
}

req.aiContext = { purpose, policyVersion: resolvedPolicyVersion };
```

### 3. Compliance Disclaimers

**Every AI Response Contains:**

| Disclaimer Type | Example Text | Legal Basis |
|----------------|--------------|-------------|
| **Advisory Notice** | "AI analysis is advisory only. All suggestions require human review and approval." | GoBD - Human-in-the-Loop |
| **No Automation** | "No data is modified automatically." | GoBD - Manual Control Requirement |
| **Tax Advice** | "This analysis does not constitute tax advice. Consult certified tax advisor (Steuerberater)." | StBerG - Tax Consulting Law |
| **Compliance** | "GoBD/GDPR/UStG compliance enforced." | German Accounting Law |

**Legal Context in Findings:**
- Every AI finding includes `legalContext` field
- References specific laws: UStG §12, GoBD 2019, EStG
- German-language legal references for domestic users

### 4. Audit Trail

**Every AI Request Logged:**
```javascript
// src/services/ai/aiAuditLogger.js
await auditLogger.logRequested({
  requestId: 'req_abc123',
  userId: 1,
  companyId: 1,
  prompt: '[REDACTED]',  // PII redacted
  policyVersion: '10.0.0',
  queryType: 'invoice_summary',
  route: '/api/ai/read/invoice-summary'
});
```

**Demo Simulations Separately Logged:**
```javascript
// src/services/demoSimulationService.js
demoSimulationService.logDemoSimulation('invoice_summary_fallback', {
  invoiceId: 'INV-001'
});
```

**Audit Log Filtering:**
- Real AI queries: `action !== 'DEMO_SIMULATION_DATA_GENERATED'`
- Demo simulations: `action === 'DEMO_SIMULATION_DATA_GENERATED'`
- Analytics can separate production from demo activity

---

## Configuration

### Enable/Disable AI Demo Mode

**Environment Variable:**
```bash
# Enable demo AI responses
ENTERPRISE_DEMO_MODE=true

# Production mode (real AI or empty responses)
ENTERPRISE_DEMO_MODE=false  # default
```

**Docker Compose:**
```yaml
services:
  backend:
    environment:
      ENTERPRISE_DEMO_MODE: "true"
      AI_ASSISTANT_ENABLED: "true"
      AI_POLICY_VERSION: "10.0.0"
```

**Feature Gate Logic:**
```javascript
// src/services/demoSimulationService.js - Line 33
const DEMO_MODE_ENABLED = String(process.env.ENTERPRISE_DEMO_MODE || 'false')
  .toLowerCase() === 'true';
```

---

## Testing Demo AI Features

### 1. Invoice Analysis

```bash
# Get demo invoice summary with AI analysis
curl -X GET "http://localhost:5000/api/ai/read/invoice-summary?invoiceId=INV-001" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"

# Expected: Full invoice with aiSummary, complianceChecks, riskAssessment
```

### 2. Reconciliation Analysis

```bash
# Get demo reconciliation with AI findings
curl -X GET "http://localhost:5000/api/ai/read/reconciliation-summary?range=2026-01-01_to_2026-01-31" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"

# Expected: Reconciliation with keyFindings, automatedChecks, recommendations
```

### 3. VAT Analysis

```bash
# Get demo VAT summary with optimization suggestions
curl -X GET "http://localhost:5000/api/exports/vat-summaries?month=2026-01" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"

# Expected: VAT analysis with compliance checks and UVA submission steps
```

### 4. Verify Policy Version

```bash
# Check that all responses include policyVersion: 10.0.0
curl -X GET "http://localhost:5000/api/ai/read/invoice-summary?invoiceId=INV-001" \
  -H "Authorization: Bearer YOUR_TOKEN" | jq '.summary._aiMetadata.policyVersion'

# Expected: "10.0.0"
```

---

## Prohibited Actions (Enforced)

### ❌ AI Cannot Do (By Design)

1. **Modify Financial Records**
   - ❌ Create, update, or delete invoices
   - ❌ Modify expenses or transactions
   - ❌ Submit VAT returns automatically
   - **Enforcement:** No POST/PUT/DELETE routes exist in aiReadOnly.js

2. **Execute Automated Workflows**
   - ❌ Auto-categorize expenses
   - ❌ Auto-apply VAT rules
   - ❌ Auto-approve payments
   - **Enforcement:** `/api/ai/insights/generate` returns 501

3. **Access Sensitive Data Without Context**
   - ❌ Cross-company data access
   - ❌ PII exposure in prompts
   - ❌ Unredacted financial details in logs
   - **Enforcement:** `redactPII()` function in governance.js

4. **Provide Tax/Legal Advice**
   - ❌ Binding tax recommendations
   - ❌ Legal compliance guarantees
   - ❌ Regulatory filing submissions
   - **Enforcement:** Disclaimers on every response

---

## Enterprise Demo Prompts

### Showcase Scenario 1: Invoice Risk Detection

**User Prompt:**
*"Analyze this invoice for compliance and payment risks."*

**AI Response Highlights:**
- ✅ VAT calculation verified (19% standard rate)
- ✅ Invoice completeness check (GoBD requirements)
- ⚠️ Payment delay detected (10 days overdue)
- 📊 Risk score: 0.15 (LOW)
- 💡 Recommendation: Send payment reminder

**Business Impact:**
- Manual review time: 10 minutes → AI analysis: Instant
- Compliance confidence: 95%+ verified
- Early warning system for payment delays

### Showcase Scenario 2: Month-End Reconciliation

**User Prompt:**
*"Reconcile January accounts and identify any issues."*

**AI Response Highlights:**
- ✅ Bank balance reconciled (0.4% variance)
- ⚠️ Outstanding check identified (€50)
- ✅ VAT liability calculated (€605 due Feb 10)
- ✅ Payroll reconciled (5 employees)
- 📊 Overall risk: LOW (0.22)

**Business Impact:**
- Manual reconciliation: 2-3 hours → AI analysis: Instant
- Deadline tracking: Automatic VAT due date flagged
- Audit readiness: GoBD-compliant documentation

### Showcase Scenario 3: VAT Optimization

**User Prompt:**
*"Review VAT calculations and suggest optimization opportunities."*

**AI Response Highlights:**
- ✅ All VAT rates verified (19% standard)
- 💡 Potential savings: €200-500/year (reduced rate eligibility)
- ✅ Input VAT fully deductible
- 📋 UVA submission checklist provided
- ⏰ Deadline: February 10, 2026

**Business Impact:**
- Tax optimization identified proactively
- ELSTER submission guidance (step-by-step)
- Penalty avoidance (1% late fee = €12.55/month)

---

## Governance Architecture

### Request Flow

```
User Request
    ↓
[aiRouteGuard] → Validate purpose, policyVersion, methods (GET only)
    ↓
[requirePlanFeature] → Check if AI feature enabled for plan
    ↓
[rateLimit] → Enforce rate limits (prevent abuse)
    ↓
[aiReadGateway] →
    • Redact PII from prompt
    • Validate policy version (10.0.0)
    • Check if AI service available
    • If unavailable + DEMO_MODE → generateDemo*()
    ↓
[demoSimulationService] →
    • Generate realistic data
    • Add AI analysis with:
      - executiveSummary
      - complianceChecks
      - riskAssessment
      - recommendations
    • Attach _aiMetadata with disclaimers
    ↓
Response with:
    • demo: true
    • _simulated: true
    • policyVersion: "10.0.0"
    • Legal disclaimers
```

### Safety Layers

1. **Route Guard** - Only GET/HEAD methods allowed
2. **Plan Guard** - AI feature must be enabled for tenant
3. **Rate Limit** - Prevent AI abuse (100 requests/hour)
4. **Policy Validation** - Every request must include policyVersion
5. **PII Redaction** - GDPR-compliant prompt sanitization
6. **Audit Logging** - Every request logged with requestId
7. **Demo Marker** - All simulations flagged with `_demo: true`

---

## Monitoring & Analytics

### Key Metrics to Track

**AI Usage:**
- Total AI requests per day
- Demo vs. real AI queries
- Most-used AI features
- Average confidence scores

**Compliance:**
- Policy version distribution
- Disclaimer delivery rate: 100%
- PII redaction success rate
- Audit log completeness

**Performance:**
- AI response time (target: <500ms for demo)
- Error rate
- Rate limit violations
- Failed policy validations

**Business Impact:**
- Time saved per AI query
- Compliance issues detected
- VAT optimization opportunities identified
- Payment delays flagged

### Sample Analytics Query

```sql
-- Count AI requests by type (demo vs. real)
SELECT
  action,
  COUNT(*) as total_requests,
  COUNT(CASE WHEN meta LIKE '%demo%' THEN 1 END) as demo_requests,
  COUNT(CASE WHEN meta NOT LIKE '%demo%' THEN 1 END) as real_requests
FROM audit_logs
WHERE action IN ('AI_READ_REQUEST', 'DEMO_SIMULATION_DATA_GENERATED')
  AND createdAt >= NOW() - INTERVAL 30 DAY
GROUP BY action;
```

---

## Frequently Asked Questions

### Q: Can AI automatically submit VAT returns?
**A:** No. AI provides step-by-step guidance but requires human submission via ELSTER. This ensures compliance with German tax law requiring accountant/Steuerberater approval.

### Q: What happens if AI detects a compliance issue?
**A:** AI flags the issue with severity (LOW/MEDIUM/HIGH), provides explanation with legal context (e.g., "UStG §12"), and suggests corrective action. All suggestions are advisory only. No automatic corrections.

### Q: How is demo data different from real AI?
**A:** Demo data is:
- Marked with `_demo: true` and `_simulated: true`
- Logged separately (`DEMO_SIMULATION_DATA_GENERATED`)
- Uses hardcoded patterns (19% VAT, €1,785 invoices)
- Never persisted to database
- Real AI would call external LLM with actual company data

### Q: Can AI access other companies' data?
**A:** No. Every AI request is scoped to `req.companyId` via middleware. Tenant isolation enforced at database and API level. PII redaction prevents cross-contamination.

### Q: What's the confidence threshold for AI suggestions?
**A:** Default: 0.85 (85%). Suggestions below this threshold are marked "LOW_CONFIDENCE" and flagged for human review. This is configurable per analysis type.

### Q: How often is policyVersion updated?
**A:** Current: 10.0.0. Version increments when:
- Compliance rules change (GoBD updates)
- AI model updated
- Disclaimer language modified
All requests must include current version or receive 403.

---

## Legal Compliance Summary

| Regulation | Compliance Mechanism | Evidence |
|-----------|---------------------|----------|
| **GoBD** (German Bookkeeping) | - Immutable audit logs<br>- Human-in-the-loop<br>- Complete documentation | `src/services/ai/aiAuditLogger.js`<br>`_aiMetadata.disclaimer` |
| **UStG** (German VAT Act) | - VAT rate validation<br>- Legal context citations<br>- UVA submission guidance | `aiAnalysis.keyFindings[].legalContext`<br>`"UStG §12"` references |
| **GDPR** (Data Protection) | - PII redaction<br>- Purpose limitation<br>- Data minimization | `src/services/ai/governance.js:redactPII()`<br>`_aiMetadata.purposeLimitation` |
| **StBerG** (Tax Consulting Law) | - Tax advice disclaimer<br>- Steuerberater recommendation<br>- Advisory-only | `_aiMetadata.legalNotice`<br>`"Consult certified tax advisor"` |

---

## Support & Resources

### Internal Documentation
- **AI Governance Contract:** `docs/ai/AI_GOVERNANCE.md`
- **Prompt Registry:** `src/services/ai/promptRegistry.js`
- **Policy Version History:** `AI_COMPLIANCE_REPORT.md`

### External Resources
- **German VAT Law (UStG):** https://www.gesetze-im-internet.de/ustg_1980/
- **GoBD Guidelines:** https://www.bundesfinanzministerium.de/gobd
- **ELSTER Portal:** https://www.elster.de

### Contact
- **Technical Support:** technical@smartaccounting.de
- **Compliance Questions:** compliance@smartaccounting.de
- **Tax Advisor Network:** steuerberater@smartaccounting.de

---

**Document Version:** 1.0.0
**Last Updated:** January 13, 2026
**Policy Version:** 10.0.0
**Compliance Status:** ✅ GoBD/UStG/GDPR Compliant
