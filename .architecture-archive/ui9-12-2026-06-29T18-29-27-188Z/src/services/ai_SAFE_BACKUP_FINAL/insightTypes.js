// AI insight types and explainable output templates
const { buildExplainability } = require('./explainability');

/**
 * Expense categorization suggestion
 */
function suggestExpenseCategory(expense, rules) {
  // Example: deterministic rule
  const category = rules[expense.vendor] || 'Uncategorized';
  const confidence = category !== 'Uncategorized' ? 0.9 : 0.5;
  return {
    type: 'expense_categorization',
    suggestion: category,
    explainability: buildExplainability({
      why: `Vendor matched rule: ${expense.vendor}`,
      dataPoints: ['vendor', 'amount', 'date'],
      ruleOrModel: 'ExpenseCategoryRuleV1',
      confidence,
      legalContext: 'GoBD §146, §147; HGB §238',
    }),
  };
}

/**
 * Invoice anomaly detection (duplicates, outliers)
 */
function detectInvoiceAnomaly(invoice, allInvoices) {
  // Duplicate check
  const duplicate = allInvoices.find(i => i.number === invoice.number && i.id !== invoice.id);
  if (duplicate) {
    return {
      type: 'invoice_anomaly',
      anomaly: 'duplicate',
      explainability: buildExplainability({
        why: `Duplicate invoice number: ${invoice.number}`,
        dataPoints: ['number', 'date', 'amount'],
        ruleOrModel: 'InvoiceDuplicateRuleV1',
        confidence: 1.0,
        legalContext: 'GoBD §146',
      }),
    };
  }
  // Outlier check (simple z-score)
  const amounts = allInvoices.map(i => i.amount);
  const mean = amounts.reduce((a, b) => a + b, 0) / amounts.length;
  const std = Math.sqrt(amounts.map(a => (a - mean) ** 2).reduce((a, b) => a + b, 0) / amounts.length);
  if (std > 0 && Math.abs(invoice.amount - mean) / std > 3) {
    return {
      type: 'invoice_anomaly',
      anomaly: 'outlier',
      explainability: buildExplainability({
        why: `Invoice amount ${invoice.amount} is a statistical outlier (z > 3).`,
        dataPoints: ['amount', 'date'],
        ruleOrModel: 'InvoiceOutlierRuleV1',
        confidence: 0.8,
        legalContext: 'GoBD §146',
      }),
    };
  }
  return null;
}

/**
 * VAT risk detection (rate mismatch, rounding risk)
 */
function detectVATRisk(invoice, vatRates) {
  const expectedRate = vatRates[invoice.country] || vatRates['default'];
  if (invoice.vatRate !== expectedRate) {
    return {
      type: 'vat_risk',
      risk: 'rate_mismatch',
      explainability: buildExplainability({
        why: `VAT rate ${invoice.vatRate} does not match expected ${expectedRate} for ${invoice.country}.`,
        dataPoints: ['vatRate', 'country', 'amount'],
        ruleOrModel: 'VATRiskRuleV1',
        confidence: 0.95,
        legalContext: 'UStG §14, §15',
      }),
    };
  }
  // Rounding risk
  if (Math.abs(invoice.vat + invoice.net - invoice.gross) > 0.01) {
    return {
      type: 'vat_risk',
      risk: 'rounding',
      explainability: buildExplainability({
        why: 'VAT calculation rounding risk detected.',
        dataPoints: ['net', 'vat', 'gross'],
        ruleOrModel: 'VATRoundingRuleV1',
        confidence: 0.7,
        legalContext: 'UStG §14',
      }),
    };
  }
  return null;
}

/**
 * Missing document detection
 */
function detectMissingDocument(entity) {
  if (!entity.attachmentId) {
    return {
      type: 'missing_document',
      explainability: buildExplainability({
        why: 'No supporting document attached.',
        dataPoints: ['id', 'date', 'amount'],
        ruleOrModel: 'MissingDocumentRuleV1',
        confidence: 0.99,
        legalContext: 'GoBD §146, §147',
      }),
    };
  }
  return null;
}

/**
 * Compliance risk scoring (LOW / MEDIUM / HIGH)
 */
function complianceRiskScore(company, anomalies) {
  // Simple: count anomalies
  const count = anomalies.length;
  let score = 'LOW';
  if (count > 5) { score = 'MEDIUM'; }
  if (count > 15) { score = 'HIGH'; }
  return {
    type: 'compliance_risk',
    score,
    explainability: buildExplainability({
      why: `Detected ${count} anomalies in recent period.`,
      dataPoints: ['anomalyCount'],
      ruleOrModel: 'ComplianceRiskScoreV1',
      confidence: count > 15 ? 0.95 : count > 5 ? 0.8 : 0.6,
      legalContext: 'GoBD §146, §147; HGB §238',
    }),
  };
}

module.exports = {
  suggestExpenseCategory,
  detectInvoiceAnomaly,
  detectVATRisk,
  detectMissingDocument,
  complianceRiskScore,
};
