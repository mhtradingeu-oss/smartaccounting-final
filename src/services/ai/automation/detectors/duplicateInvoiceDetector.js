// duplicateInvoiceDetector.js
// Detects possible duplicate invoices (read-only, explainable).

/**
 * Detects duplicate invoices by invoiceNumber, amount, date, and client
 * @param {Object} params - { companyId, invoices }
 * @returns {Array} findings
 */
async function detectDuplicateInvoices({ companyId, invoices }) {
  if (!Array.isArray(invoices)) {
    return [];
  }
  const findings = [];
  const seen = new Map();
  for (const invoice of invoices) {
    if (!invoice.invoiceNumber || !invoice.amount || !invoice.date || !invoice.clientName) {
      continue;
    }
    const key = `${invoice.invoiceNumber}|${invoice.amount}|${invoice.clientName}`;
    if (seen.has(key)) {
      findings.push({
        id: `dup-${invoice.id}`,
        type: 'duplicate_invoice',
        severity: 'medium',
        confidence: 0.87,
        title: 'Potential duplicate invoice',
        explanation: `Invoice #${invoice.invoiceNumber} for ${invoice.amount} and client ${invoice.clientName} appears more than once.`,
        evidence: [
          { id: invoice.id, type: 'invoice', summary: `Invoice #${invoice.invoiceNumber}, ${invoice.amount}, ${invoice.clientName}` },
          { id: seen.get(key).id, type: 'invoice', summary: `Invoice #${seen.get(key).invoiceNumber}, ${seen.get(key).amount}, ${seen.get(key).clientName}` },
        ],
        relatedEntities: [
          { entityType: 'Invoice', entityId: invoice.id },
          { entityType: 'Invoice', entityId: seen.get(key).id },
        ],
      });
    } else {
      seen.set(key, invoice);
    }
  }
  return findings;
}

module.exports = { detectDuplicateInvoices };
