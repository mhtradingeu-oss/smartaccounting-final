// aiDataService: strictly read-only, safe projections, no PII


// eslint-disable-next-line no-unused-vars -- reserved for AI explainability / audit
const { Invoice, Company, BankTransaction } = require('../../models');

const ALLOWED_QUERIES = [
  'invoice_summary',
  'monthly_overview',
  'cashflow_insights',
  'anomaly_flags',
  'reconciliation_summary',
];

function isAllowedQuery(queryType) {
  return ALLOWED_QUERIES.includes(queryType);
}

module.exports = {
  ALLOWED_QUERIES,
  isAllowedQuery,
  // Invoice summary (no PII)
  async getInvoiceSummary(companyId, invoiceId) {
    const invoice = await Invoice.findOne({
      where: { id: invoiceId, companyId },
      attributes: ['id', 'status', 'total', 'currency', 'date', 'dueDate', 'createdAt', 'updatedAt'],
    });
    if (!invoice) {
      return null;
    }
    return {
      id: invoice.id,
      status: invoice.status,
      total: invoice.total,
      currency: invoice.currency,
      date: invoice.date,
      dueDate: invoice.dueDate,
      createdAt: invoice.createdAt,
      updatedAt: invoice.updatedAt,
    };
  },
  async getMonthlyOverview(companyId, month) {
    const start = new Date(`${month}-01`);
    const end = new Date(start);
    end.setMonth(end.getMonth() + 1);
    const invoices = await Invoice.findAll({
      where: {
        companyId,
        date: { $gte: start, $lt: end },
      },
      attributes: ['status', 'total'],
    });
    const total = invoices.reduce((sum, inv) => sum + parseFloat(inv.total), 0);
    const count = invoices.length;
    return { month, total, count, statusBreakdown: invoices.reduce((acc, inv) => {
      acc[inv.status] = (acc[inv.status] || 0) + 1;
      return acc;
    }, {}) };
  },
  async getReconciliationSummary(companyId, range) {
    const [from, to] = range.split('_to_');
    const txs = await BankTransaction.findAll({
      where: {
        companyId,
        transactionDate: { $gte: new Date(from), $lte: new Date(to) },
      },
      attributes: ['id', 'amount', 'isReconciled'],
    });
    const total = txs.reduce((sum, t) => sum + parseFloat(t.amount), 0);
    const reconciled = txs.filter(t => t.isReconciled).length;
    return { range, total, count: txs.length, reconciled };
  },
};
