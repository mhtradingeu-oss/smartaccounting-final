// aiInsightsMappers.js
// Helper functions to map real API data to explainable AI insight objects

import { formatCurrency, formatDate } from '../lib/utils/formatting';

// Example: Map an invoice to an AI insight (advisory, explainable, field-referenced)
export function mapInvoiceToAIInsight(invoice) {
  const threshold = 10000; // EUR
  if (invoice.amount >= threshold) {
    return {
      id: `invoice-${invoice.id}`,
      type: 'High-Value Invoice',
      summary: `Invoice #${invoice.number} for ${formatCurrency(invoice.amount)} exceeds the advisory threshold.`,
      confidence: 'high',
      why: {
        text: `Invoice amount (<b>amount</b>: ${formatCurrency(invoice.amount)}) is above the typical threshold.`,
        legal: 'Large invoices may require additional documentation (GoBD §153).',
        hint: `Review invoice <b>number</b>: ${invoice.number}, <b>date</b>: ${formatDate(invoice.date)}, <b>amount</b>: ${formatCurrency(invoice.amount)} for supporting documents.`,
      },
    };
  }
  return null;
}

// Example: Map audit log to AI insight (advisory, explainable, field-referenced)
export function mapAuditLogToAIInsight(log) {
  if (log.action === 'DELETE') {
    return {
      id: `audit-${log.id}`,
      type: 'Audit Log Deletion',
      summary: `A record (ID: ${log.recordId || 'unknown'}) was deleted by user ${log.user}.`,
      confidence: 'medium',
      why: {
        text: `Record with <b>recordId</b>: ${log.recordId || 'unknown'} deleted by <b>user</b>: ${log.user} on <b>timestamp</b>: ${formatDate(log.timestamp)}.`,
        legal: 'Deletion of records must be justified and documented (GoBD §146).',
        hint: 'Ensure deletion reason is documented for audit trail. Reference: <b>recordId</b>, <b>user</b>, <b>timestamp</b>.',
      },
    };
  }
  return null;
}

// Add more mappers as needed for expenses, VAT, etc.
