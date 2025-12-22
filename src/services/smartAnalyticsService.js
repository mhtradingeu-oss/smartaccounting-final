const { Invoice } = require('../models');

const parseAmount = (value) => (value ? Number(value) : 0);

const getInvoiceStats = async (companyId) => {
  const invoices = await Invoice.findAll({ where: { companyId } });
  const totalRevenue = invoices.reduce((sum, invoice) => sum + parseAmount(invoice.total || invoice.amount), 0);
  const invoiceCount = invoices.length;

  const statusBreakdown = invoices.reduce((acc, invoice) => {
    const status = invoice.status || 'unknown';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  const latestInvoice = invoices.sort((a, b) => b.createdAt - a.createdAt)[0] || null;

  return {
    totalRevenue,
    invoiceCount,
    statusBreakdown,
    latestInvoice: latestInvoice ? {
      id: latestInvoice.id,
      invoiceNumber: latestInvoice.invoiceNumber,
      status: latestInvoice.status,
      amount: latestInvoice.amount,
    } : null,
  };
};

module.exports = {
  getInvoiceStats,
};
