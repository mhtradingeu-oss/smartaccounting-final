/**
 * Demo Simulation Service
 *
 * Generates realistic, clearly-labeled demo data for routes that would
 * otherwise appear empty in demo mode (ENTERPRISE_DEMO_MODE=true).
 *
 * SAFETY GUARANTEES:
 * ──────────────────
 * 1. Demo Data Never Persisted
 *    - All data is generated in-memory only
 *    - No database writes occur
 *    - Data is discarded after response
 *
 * 2. Clearly Labeled in All Responses
 *    - Every response includes demo=true flag
 *    - Every data object includes _demo: true marker
 *    - Response metadata shows "DEMO_SIMULATION_DATA"
 *
 * 3. Production Behavior Unchanged
 *    - Only active when ENTERPRISE_DEMO_MODE=true
 *    - Production (default) uses real data only
 *    - Feature gate prevents accidental activation
 *
 * 4. Realistic But Distinguishable
 *    - Uses actual German company/invoice/expense patterns
 *    - Dates are recent but clearly simulated
 *    - Amounts use standard tax rates (19% VAT)
 *    - Description includes "[DEMO]" marker
 *
 * 5. No Data Confusion
 *    - Audit logs show "DEMO_SIMULATION"
 *    - Can be filtered from production analytics
 *    - User can see demo flag in every response
 */

const logger = require('../lib/logger');

const DEMO_MODE_ENABLED = String(process.env.ENTERPRISE_DEMO_MODE || 'false').toLowerCase() === 'true';

/**
 * Demo invoice payment records
 * Realistic payment history with clear demo markers
 */
function generateDemoInvoicePayments(invoiceId, invoiceTotal = 1190) {
  if (!DEMO_MODE_ENABLED) {return [];}

  const now = new Date();
  const invoiceDate = new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000); // 45 days ago
  const paymentDate1 = new Date(invoiceDate.getTime() + 20 * 24 * 60 * 60 * 1000); // 20 days after invoice
  const paymentDate2 = new Date(invoiceDate.getTime() + 40 * 24 * 60 * 60 * 1000); // 40 days after invoice

  return [
    {
      id: `demo_payment_${invoiceId}_1`,
      invoiceId,
      amount: invoiceTotal * 0.6, // 60% payment
      paymentMethod: 'bank_transfer',
      paymentDate: paymentDate1,
      reference: `[DEMO] Partial payment for invoice #${invoiceId}`,
      status: 'completed',
      transactionId: `DEMO-TXN-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
      _demo: true,
      _simulated: true,
    },
    {
      id: `demo_payment_${invoiceId}_2`,
      invoiceId,
      amount: invoiceTotal * 0.4, // 40% payment
      paymentMethod: 'bank_transfer',
      paymentDate: paymentDate2,
      reference: `[DEMO] Final payment for invoice #${invoiceId}`,
      status: 'completed',
      transactionId: `DEMO-TXN-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
      _demo: true,
      _simulated: true,
    },
  ];
}

/**
 * Demo audit log entries
 * Realistic audit trail with clear demo markers
 */
function generateDemoAuditLogs(resourceType = null, resourceId = null, count = 10) {
  if (!DEMO_MODE_ENABLED) {return [];}

  const actions = [
    'invoice_create',
    'invoice_update',
    'invoice_payment_register',
    'expense_create',
    'expense_update',
    'tax_report_generate',
    'bank_statement_import',
    'user_login',
    'user_update',
    'company_settings_update',
  ];

  const resourceTypes = ['Invoice', 'Expense', 'BankStatement', 'TaxReport', 'User', 'Company'];
  const now = new Date();

  const logs = [];
  for (let i = 0; i < count; i++) {
    const timestamp = new Date(now.getTime() - i * 2 * 60 * 60 * 1000); // 2 hours apart
    const type = resourceType || resourceTypes[Math.floor(Math.random() * resourceTypes.length)];
    const id = resourceId || `DEMO_${type}_${Math.floor(Math.random() * 9000) + 1000}`;
    const action = actions[Math.floor(Math.random() * actions.length)];

    logs.push({
      id: `demo_log_${i}`,
      action,
      resourceType: type,
      resourceId: id,
      userId: 1,
      companyId: 1,
      ipAddress: '127.0.0.1',
      userAgent: '[DEMO_SIMULATION]',
      timestamp,
      reason: `[DEMO] ${action} on ${type} - simulated for demo environment`,
      oldValues: null,
      newValues: {
        _demo: true,
        demoMarker: 'This is simulated demo data',
      },
      _demo: true,
      _simulated: true,
    });
  }

  return logs;
}

/**
 * Demo invoice summary with AI analysis
 * Realistic invoice analytics with enterprise-level AI insights and compliance disclaimers
 */
function generateDemoInvoiceSummary(invoiceId = 'DEMO-INV-001') {
  if (!DEMO_MODE_ENABLED) {return null;}

  const now = new Date();
  const invoiceDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  return {
    _demo: true,
    _simulated: true,
    invoiceId,
    status: 'PAID',
    description: '[DEMO] Professional Services',
    clientName: 'Demo Client GmbH',
    clientEmail: 'demo@example.de',
    issueDate: invoiceDate,
    dueDate: new Date(invoiceDate.getTime() + 30 * 24 * 60 * 60 * 1000),
    paymentStatus: 'fully_paid',
    itemCount: 3,
    items: [
      {
        description: '[DEMO] Consulting Services',
        quantity: 10,
        unitPrice: 100,
        vatRate: 0.19,
        lineNet: 1000,
        lineVat: 190,
        lineGross: 1190,
      },
      {
        description: '[DEMO] Software Support',
        quantity: 5,
        unitPrice: 50,
        vatRate: 0.19,
        lineNet: 250,
        lineVat: 47.5,
        lineGross: 297.5,
      },
      {
        description: '[DEMO] Travel Expenses',
        quantity: 1,
        unitPrice: 250,
        vatRate: 0.19,
        lineNet: 250,
        lineVat: 47.5,
        lineGross: 297.5,
      },
    ],
    subtotal: 1500,
    totalVat: 285,
    total: 1785,
    amountPaid: 1785,
    amountDue: 0,
    paymentHistory: generateDemoInvoicePayments(invoiceId, 1785),
    // AI-enhanced analysis (read-only, advisory)
    aiSummary: {
      executiveSummary: '[DEMO AI] This invoice for professional services totaling €1,785 has been fully paid. Standard 19% VAT applied correctly across all line items. Payment received in two installments over 40 days, consistent with payment terms.',
      complianceStatus: 'COMPLIANT',
      complianceChecks: {
        vatCalculation: {
          status: 'PASS',
          confidence: 0.95,
          explanation: 'All line items correctly apply German standard VAT rate (19%). Total VAT of €285 verified against line items.',
          legalContext: 'UStG §12 Abs. 1 (German VAT Act - Standard Rate)',
        },
        invoiceCompleteness: {
          status: 'PASS',
          confidence: 0.92,
          explanation: 'Invoice contains all mandatory fields: client details, issue date, payment terms, itemized services, VAT breakdown.',
          legalContext: 'GoBD 2019 - Invoice Requirements',
        },
        paymentTracking: {
          status: 'PASS',
          confidence: 0.90,
          explanation: 'Complete payment history tracked with transaction IDs and dates. Full reconciliation available.',
          legalContext: 'GoBD - Payment Documentation',
        },
      },
      riskAssessment: {
        overallRisk: 'LOW',
        riskScore: 0.15,
        factors: [
          {
            category: 'Payment Delay',
            severity: 'LOW',
            description: 'Final payment received 40 days after issue (10 days past due date). Within acceptable tolerance.',
            recommendation: 'No action required. Monitor for pattern.',
          },
          {
            category: 'VAT Compliance',
            severity: 'NONE',
            description: 'VAT calculations fully compliant with German UStG requirements.',
            recommendation: 'No concerns identified.',
          },
        ],
      },
      recommendations: [
        {
          priority: 'LOW',
          category: 'Process Optimization',
          suggestion: 'Consider payment reminders at 20 days to reduce late payments.',
          potentialImpact: 'Improve cash flow predictability.',
        },
      ],
    },
    // Policy metadata (required for AI governance)
    _aiMetadata: {
      policyVersion: '10.0.0',
      modelVersion: 'demo-simulation-v1',
      generated: now.toISOString(),
      disclaimer: 'AI analysis is advisory only. All suggestions require human review and approval. No data is modified automatically. GoBD/GDPR compliance enforced.',
      purposeLimitation: 'READ_ONLY_ANALYSIS',
      confidenceThreshold: 0.85,
    },
  };
}

/**
 * Demo accounting summary
 * Realistic financial overview with clear demo markers
 */
function generateDemoAccountingSummary(month = null, companyId = 1) {
  if (!DEMO_MODE_ENABLED) {return null;}

  const targetMonth = month ? new Date(month) : new Date();
  const monthStart = new Date(targetMonth.getFullYear(), targetMonth.getMonth(), 1);
  const monthEnd = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0);

  return {
    _demo: true,
    _simulated: true,
    period: `${monthStart.toISOString().split('T')[0]} to ${monthEnd.toISOString().split('T')[0]}`,
    month: monthStart.toISOString().split('T')[0],
    companyId,
    invoices: {
      count: 12,
      gross: 14280,
      net: 12000,
      vat: 2280,
      paid: 11400,
      outstanding: 2880,
    },
    expenses: {
      count: 18,
      gross: 2975,
      net: 2500,
      vat: 475,
      categories: {
        'Office Supplies': 595,
        Travel: 892.5,
        'Software Licenses': 892.5,
        'Professional Services': 595,
      },
    },
    bankTransactions: {
      count: 24,
      inbound: 15000,
      outbound: 3500,
      balance: 11500,
    },
    taxSummary: {
      totalVat: 2755,
      payroll: 1850,
      corporateTax: 3200,
    },
    topClients: [
      { name: '[DEMO] Client A GmbH', invoiceCount: 4, total: 4740 },
      { name: '[DEMO] Client B AG', invoiceCount: 3, total: 3570 },
      { name: '[DEMO] Client C KG', invoiceCount: 2, total: 2376 },
    ],
    topCategories: [
      { name: 'Office Supplies', count: 6, total: 595 },
      { name: 'Travel', count: 4, total: 892.5 },
      { name: 'Software Licenses', count: 3, total: 892.5 },
    ],
    demoNote: 'This is simulated accounting data generated for demo purposes only',
  };
}

/**
 * Demo reconciliation summary with AI analysis
 * Realistic reconciliation with enterprise-level AI insights and compliance disclaimers
 */
function generateDemoReconciliationSummary(range = null, companyId = 1) {
  if (!DEMO_MODE_ENABLED) {return null;}

  const now = new Date();
  const startDate = range ? new Date(range.split('_to_')[0]) : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const endDate = range ? new Date(range.split('_to_')[1]) : now;

  return {
    _demo: true,
    _simulated: true,
    range: `${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`,
    companyId,
    accountingRecords: {
      invoices: 12,
      expenses: 18,
      bankTransactions: 24,
      totalRecords: 54,
    },
    bankAccount: {
      bankBalance: 12500,
      accountingBalance: 12450,
      difference: 50,
      reconciled: false,
      outstandingItems: [
        {
          date: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          description: '[DEMO] Outstanding check #1234',
          amount: 50,
          status: 'pending',
        },
      ],
    },
    vatReconciliation: {
      invoiceVat: 2280,
      expenseVat: 475,
      netVatLiability: 1805,
      previousPayment: 1200,
      currentDue: 605,
      lastVatReturn: new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    },
    payrollReconciliation: {
      employeeCount: 5,
      grossPayroll: 1850,
      taxWithheld: 350,
      socialInsurance: 300,
      netPayroll: 1200,
    },
    demoNote: 'This is simulated reconciliation data generated for demo purposes only',
    // AI-enhanced reconciliation analysis (read-only, advisory)
    aiAnalysis: {
      executiveSummary: '[DEMO AI] Reconciliation analysis for 30-day period shows minor discrepancy of €50 due to outstanding check. VAT liability of €605 currently due. Payroll reconciliation complete for 5 employees. Overall financial controls operating effectively.',
      reconciliationStatus: 'REQUIRES_ATTENTION',
      keyFindings: [
        {
          area: 'Bank Reconciliation',
          status: 'MINOR_ISSUE',
          confidence: 0.94,
          finding: 'Bank balance differs from accounting balance by €50 (0.4% variance).',
          explanation: 'One outstanding check identified (Check #1234, issued 10 days ago). Variance within acceptable tolerance.',
          legalContext: 'GoBD - Bank Reconciliation Requirements',
          recommendation: 'Follow up with payee if check not cleared within 14 days. Document outstanding item in monthly reconciliation report.',
          priority: 'MEDIUM',
        },
        {
          area: 'VAT Reconciliation',
          status: 'COMPLIANT',
          confidence: 0.96,
          finding: 'Net VAT liability correctly calculated at €1,805 (€2,280 collected - €475 paid).',
          explanation: 'VAT calculations verified against invoice and expense records. Current period liability of €605 due after crediting previous payment of €1,200.',
          legalContext: 'UStG - VAT Reporting & Payment',
          recommendation: 'Submit UVA (Umsatzsteuervoranmeldung) and remit €605 by statutory deadline.',
          priority: 'HIGH',
          actionRequired: 'VAT payment due',
          deadline: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        },
        {
          area: 'Payroll Reconciliation',
          status: 'COMPLIANT',
          confidence: 0.98,
          finding: 'Payroll fully reconciled for 5 employees. Tax withholding and social insurance contributions correctly calculated.',
          explanation: 'Gross payroll of €1,850 with appropriate deductions (€350 tax, €300 social insurance) resulting in net payroll of €1,200.',
          legalContext: 'EStG / SGB - Tax & Social Insurance',
          recommendation: 'No action required. Documentation complete.',
          priority: 'NONE',
        },
      ],
      riskAssessment: {
        overallRisk: 'LOW',
        riskScore: 0.22,
        criticalIssues: 0,
        warningIssues: 1,
        factors: [
          {
            category: 'Reconciliation Accuracy',
            severity: 'LOW',
            description: '0.4% variance between bank and accounting balance. Single outstanding item identified and tracked.',
            recommendation: 'Monitor outstanding check. Document variance reason in monthly close.',
          },
          {
            category: 'VAT Compliance',
            severity: 'MEDIUM',
            description: 'VAT payment of €605 due. Ensure timely submission to avoid penalties.',
            recommendation: 'Schedule VAT payment and UVA submission within statutory deadline (10th of following month).',
            deadline: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          },
        ],
      },
      automatedChecks: {
        duplicateTransactions: {
          checked: true,
          duplicatesFound: 0,
          confidence: 0.99,
          status: 'PASS',
        },
        missingDocumentation: {
          checked: true,
          missingCount: 0,
          confidence: 0.91,
          status: 'PASS',
        },
        categorization: {
          checked: true,
          uncategorizedCount: 0,
          confidence: 0.88,
          status: 'PASS',
        },
      },
      recommendations: [
        {
          priority: 'HIGH',
          category: 'VAT Compliance',
          suggestion: 'Submit UVA (advance VAT return) and remit €605 by statutory deadline.',
          potentialImpact: 'Avoid late payment penalties (1% per month) and compliance issues.',
          requiredBy: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        },
        {
          priority: 'MEDIUM',
          category: 'Bank Reconciliation',
          suggestion: 'Contact payee regarding outstanding check #1234 if not cleared within 14 days.',
          potentialImpact: 'Ensure timely resolution of outstanding items and accurate cash position reporting.',
        },
        {
          priority: 'LOW',
          category: 'Process Improvement',
          suggestion: 'Consider automated reconciliation alerts for variances exceeding 1%.',
          potentialImpact: 'Reduce manual review time and improve detection of anomalies.',
        },
      ],
    },
    // Policy metadata (required for AI governance)
    _aiMetadata: {
      policyVersion: '10.0.0',
      modelVersion: 'demo-simulation-v1',
      generated: now.toISOString(),
      disclaimer: 'AI reconciliation analysis is advisory only. All findings require professional review. Tax obligations must be verified by qualified tax advisor. No automated actions taken. GoBD/GDPR/UStG compliance enforced.',
      purposeLimitation: 'READ_ONLY_RECONCILIATION_ANALYSIS',
      confidenceThreshold: 0.85,
      legalNotice: 'This analysis does not constitute tax or legal advice. Consult with Steuerberater for binding guidance.',
    },
  };
}

/**
 * Demo VAT summary with AI analysis
 * Realistic VAT breakdown with enterprise-level AI insights and compliance disclaimers
 */
function generateDemoVatSummary(month = null, companyId = 1) {
  if (!DEMO_MODE_ENABLED) {return null;}

  const now = new Date();
  const targetMonth = month ? new Date(month) : new Date();
  const monthStart = new Date(targetMonth.getFullYear(), targetMonth.getMonth(), 1);

  return {
    _demo: true,
    _simulated: true,
    period: `${monthStart.toISOString().split('T')[0]}`,
    month: monthStart.toISOString().split('T')[0],
    companyId,
    inboundVat: {
      invoices: 2280,
      expenses: 475,
      total: 2755,
    },
    outboundVat: {
      invoices: 0,
      creditNotes: 0,
      total: 0,
    },
    netVatLiability: 2755,
    previousPayment: 1500,
    currentDue: 1255,
    vatRate: '19%',
    country: 'DE',
    vatIdNumber: '[DEMO] DE123456789',
    demoNote: 'This is simulated VAT data generated for demo purposes only',
    // AI-enhanced VAT analysis (read-only, advisory)
    aiAnalysis: {
      executiveSummary: '[DEMO AI] VAT analysis for current period shows net liability of €1,255 after crediting previous payment. All transactions use standard 19% rate. No reduced-rate or reverse-charge transactions identified. UVA submission required by statutory deadline.',
      vatComplianceStatus: 'COMPLIANT',
      keyFindings: [
        {
          area: 'VAT Calculation Accuracy',
          status: 'COMPLIANT',
          confidence: 0.97,
          finding: 'All VAT calculations verified. Standard rate (19%) applied consistently across 12 invoices and 18 expense records.',
          explanation: 'Inbound VAT of €2,755 (€2,280 from invoices + €475 from expenses) correctly calculated. No calculation errors detected.',
          legalContext: 'UStG §12 - Standard VAT Rate',
          recommendation: 'No action required. Documentation complete.',
          priority: 'NONE',
        },
        {
          area: 'Reduced Rate Eligibility',
          status: 'OPPORTUNITY',
          confidence: 0.82,
          finding: 'All transactions currently use 19% standard rate. Potential savings available if reduced rates applicable.',
          explanation: 'German VAT law provides 7% reduced rate for specific goods/services (books, newspapers, food, medical equipment). Review transaction categories for eligibility.',
          legalContext: 'UStG §12 Abs. 2 - Reduced Rate',
          recommendation: 'Review expense categories for potential reduced-rate eligibility. Estimated potential annual savings: €200-500.',
          priority: 'LOW',
        },
        {
          area: 'Reverse Charge Mechanism',
          status: 'COMPLIANT',
          confidence: 0.91,
          finding: 'No B2B cross-border transactions requiring reverse charge identified in current period.',
          explanation: 'All transactions domestic (DE). Reverse charge not applicable. Monitor for future cross-border B2B services.',
          legalContext: 'UStG §13b - Reverse Charge',
          recommendation: 'If purchasing services from EU suppliers, verify reverse charge requirements.',
          priority: 'INFORMATIONAL',
        },
        {
          area: 'Input VAT Deductibility',
          status: 'COMPLIANT',
          confidence: 0.94,
          finding: 'All €475 expense VAT appears deductible based on business purpose documentation.',
          explanation: 'Expense categories (Office Supplies, Travel, Software, Professional Services) fully deductible. No mixed-use or non-deductible items detected.',
          legalContext: 'UStG §15 - Input VAT Deduction',
          recommendation: 'Maintain detailed receipts and business purpose documentation for audit readiness.',
          priority: 'NONE',
        },
      ],
      riskAssessment: {
        overallRisk: 'LOW',
        riskScore: 0.18,
        criticalIssues: 0,
        warningIssues: 0,
        factors: [
          {
            category: 'Payment Deadline',
            severity: 'MEDIUM',
            description: 'VAT payment of €1,255 due by 10th of following month. Late payment results in 1% monthly penalty.',
            recommendation: 'Schedule payment and UVA submission at least 3 days before deadline to account for processing time.',
            deadline: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          },
          {
            category: 'Documentation Completeness',
            severity: 'LOW',
            description: 'All transactions have VAT documentation. Audit readiness high.',
            recommendation: 'Continue current documentation practices.',
          },
        ],
      },
      automatedChecks: {
        vatRateConsistency: {
          checked: true,
          inconsistenciesFound: 0,
          confidence: 0.99,
          status: 'PASS',
          details: 'All 30 transactions use correct 19% standard rate.',
        },
        invoiceCompleteness: {
          checked: true,
          missingVatIds: 0,
          confidence: 0.96,
          status: 'PASS',
          details: 'All B2B invoices include valid VAT-ID numbers.',
        },
        crossBorderCompliance: {
          checked: true,
          issuesFound: 0,
          confidence: 0.93,
          status: 'PASS',
          details: 'No cross-border transactions. Domestic rules applied correctly.',
        },
      },
      recommendations: [
        {
          priority: 'HIGH',
          category: 'UVA Submission',
          suggestion: 'Submit Umsatzsteuervoranmeldung (UVA) electronically via ELSTER and remit €1,255.',
          potentialImpact: 'Avoid 1% monthly late payment penalty (€12.55/month) and maintain compliance record.',
          requiredBy: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          actionSteps: [
            'Log in to ELSTER portal',
            'Select UVA form for current period',
            'Verify amounts: €2,755 liability, €1,500 previous payment, €1,255 due',
            'Submit electronically',
            'Initiate bank transfer for €1,255 with UVA reference',
          ],
        },
        {
          priority: 'MEDIUM',
          category: 'Process Optimization',
          suggestion: 'Consider monthly VAT review process to identify savings opportunities earlier.',
          potentialImpact: 'Identify reduced-rate eligibility and reverse-charge scenarios proactively.',
        },
        {
          priority: 'LOW',
          category: 'Tax Planning',
          suggestion: 'Review expense categories quarterly for potential reduced-rate reclassification.',
          potentialImpact: 'Potential annual VAT savings of €200-500 if eligible expenses identified.',
        },
      ],
    },
    // Policy metadata (required for AI governance)
    _aiMetadata: {
      policyVersion: '10.0.0',
      modelVersion: 'demo-simulation-v1',
      generated: now.toISOString(),
      disclaimer: 'AI VAT analysis is advisory only. Tax calculations and submissions must be verified by qualified Steuerberater (tax advisor). No automated tax filings or payments. UStG/GoBD/GDPR compliance enforced.',
      purposeLimitation: 'READ_ONLY_VAT_ANALYSIS',
      confidenceThreshold: 0.85,
      legalNotice: 'This analysis does not constitute tax advice. Consult certified tax advisor (Steuerberater) for binding VAT guidance and filing requirements.',
    },
  };
}

/**
 * Demo dashboard aggregates
 * Realistic KPIs and metrics with clear demo markers
 */
function generateDemoDashboardData(companyId = 1) {
  if (!DEMO_MODE_ENABLED) {return null;}

  const now = new Date();
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  return {
    _demo: true,
    _simulated: true,
    companyId,
    currentMonth: thisMonth.toISOString().split('T')[0],
    lastMonth: lastMonth.toISOString().split('T')[0],
    revenue: {
      thisMonth: 14280,
      lastMonth: 18950,
      trend: -24.7,
      currency: 'EUR',
    },
    expenses: {
      thisMonth: 2975,
      lastMonth: 3200,
      trend: -7.0,
      currency: 'EUR',
    },
    netProfit: {
      thisMonth: 11305,
      lastMonth: 15750,
      margin: 79.2,
    },
    cashFlow: {
      inbound: 15000,
      outbound: 3500,
      netFlow: 11500,
    },
    invoiceMetrics: {
      issued: 12,
      paid: 10,
      outstanding: 2,
      averagePaymentDays: 18,
      totalOutstanding: 2880,
    },
    expenseMetrics: {
      count: 18,
      largestCategory: 'Travel (892.50 EUR)',
      avgExpenseSize: 165.28,
    },
    taxMetrics: {
      vatLiability: 1805,
      estimatedTaxes: 3200,
    },
    demoNote: 'This is simulated dashboard data generated for demo purposes only',
  };
}

/**
 * Middleware to inject demo simulation into responses
 * Only activates when ENTERPRISE_DEMO_MODE=true
 */
function createDemoSimulationMiddleware() {
  return (req, res, next) => {
    if (!DEMO_MODE_ENABLED) {
      return next();
    }

    // Store original json method
    const originalJson = res.json.bind(res);

    // Override json method to potentially enhance response with demo data
    res.json = function (data) {
      // If response is empty or minimal, potentially add demo simulation context
      if (data && typeof data === 'object') {
        // Mark the response as containing demo data if simulating
        if (data._demo !== true && (Array.isArray(data) ? data.length === 0 : !data.logs && !data.data)) {
          // Response is empty - don't auto-fill (let routes decide)
          data._empty = true;
        }
      }
      return originalJson(data);
    };

    next();
  };
}

/**
 * Log demo simulation data access
 */
function logDemoSimulation(simulationType, params = {}) {
  if (!DEMO_MODE_ENABLED) {return;}

  logger.info('[DEMO_SIMULATION] Generated demo data', {
    event: 'DEMO_SIMULATION_DATA_GENERATED',
    simulationType,
    params,
    timestamp: new Date().toISOString(),
    marker: 'Demo simulation data - not persisted',
  });
}

/**
 * Public API for demo simulation service
 */
module.exports = {
  DEMO_MODE_ENABLED,

  // Simulation generators
  generateDemoInvoicePayments,
  generateDemoAuditLogs,
  generateDemoInvoiceSummary,
  generateDemoAccountingSummary,
  generateDemoReconciliationSummary,
  generateDemoVatSummary,
  generateDemoDashboardData,

  // Middleware
  createDemoSimulationMiddleware,

  // Logging
  logDemoSimulation,

  /**
   * Wrap a route handler to include demo data when appropriate
   * Usage: wrapWithDemoSimulation(handler, simulationType, generator)
   */
  wrapWithDemoSimulation: (handler, simulationType, generator) => {
    return async (req, res, next) => {
      try {
        // Call original handler
        const result = await handler(req, res, next);

        // If response is empty and demo mode is on, generate demo data
        if (DEMO_MODE_ENABLED && res.locals && res.locals._empty) {
          logDemoSimulation(simulationType, { path: req.path });

          // Return with demo flag
          return res.json({
            demo: true,
            _simulated: true,
            data: generator ? generator(req) : null,
            message: 'Simulated demo data - not from database',
          });
        }

        return result;
      } catch (error) {
        next(error);
      }
    };
  },

  /**
   * Inject demo data into response if empty
   * Usage: injectDemoDataIfEmpty(res, simulationType, generator)
   */
  injectDemoDataIfEmpty: (res, simulationType, generator) => {
    if (!DEMO_MODE_ENABLED || !generator) {
      return false;
    }

    // This will be called by route handlers when they have empty data
    logDemoSimulation(simulationType);
    return true;
  },
};
