// unmatchedBankTransactionDetector.js
// Detects bank transactions not linked to any invoice/payment (read-only)

/**
 * Detects unmatched bank transactions
 * @param {Object} params - { companyId, bankTransactions, invoicePayments }
 * @returns {Array} findings
 */
// eslint-disable-next-line no-unused-vars -- context reserved for AI explainability
async function detectUnmatchedBankTransactions({ companyId, bankTransactions = [], invoicePayments = [] }) {

  const matchedIds = new Set(invoicePayments.map(p => p.bankTransactionId));
  const findings = [];
  const transactions = Array.isArray(bankTransactions) ? bankTransactions : [];

  for (const tx of transactions) {
    if (!tx.id || matchedIds.has(tx.id)) {
      continue;
    }
    findings.push({
      id: `unmatched-tx-${tx.id}`,
      type: 'unmatched_bank_transaction',
      severity: 'medium',
      confidence: 0.8,
      title: 'Unmatched bank transaction',
      explanation: `Bank transaction ${tx.id} is not linked to any invoice/payment.`,
      evidence: [
        { id: tx.id, type: 'bank_transaction', summary: `Bank TX #${tx.id}, amount: ${tx.amount}` },
      ],
      relatedEntities: [
        { entityType: 'BankTransaction', entityId: tx.id },
      ],
    });
  }
  return findings;
}

module.exports = { detectUnmatchedBankTransactions };
