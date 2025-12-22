// cashFlowRiskDetector.js
// Detects cash-flow risks (read-only, explainable).

/**
 * Detects cash flow risk
 * @param {Object} params - { companyId, invoices, bankBalance }
 * @returns {Array} findings
 */
async function detectCashFlowRisk({ companyId, invoices, bankBalance }) {
  if (!Array.isArray(invoices) || typeof bankBalance !== 'number') { return []; }
  const unpaid = invoices.filter(inv => inv.status !== 'paid');
  const totalDue = unpaid.reduce((sum, inv) => sum + (Number(inv.amount) || 0), 0);
  if (totalDue === 0) { return []; }
  const riskLevel = totalDue > bankBalance ? 'high' : (totalDue > bankBalance * 0.5 ? 'medium' : 'low');
  const confidence = riskLevel === 'high' ? 0.95 : riskLevel === 'medium' ? 0.8 : 0.6;
  return [{
    id: `cashflow-risk-${companyId}`,
    type: 'cash_flow_risk',
    severity: riskLevel,
    confidence,
    title: 'Cash flow risk detected',
    explanation: `Unpaid invoices total ${totalDue}, bank balance is ${bankBalance}. Risk level: ${riskLevel}.`,
    evidence: unpaid.slice(0, 3).map(inv => ({ id: inv.id, type: 'invoice', summary: `Invoice #${inv.invoiceNumber}, amount: ${inv.amount}` })),
    relatedEntities: unpaid.slice(0, 3).map(inv => ({ entityType: 'Invoice', entityId: inv.id })),
  }];
}

module.exports = { detectCashFlowRisk };
