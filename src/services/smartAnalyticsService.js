const { Invoice, sequelize } = require('../models');

const parseNumber = (value) => {
  const num = Number(value);
  return Number.isNaN(num) ? 0 : num;
};

const formatLatestInvoice = (invoice) => {
  if (!invoice) {
    return null;
  }

  const amount = invoice.total || invoice.amount || 0;
  return {
    id: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    status: invoice.status || 'unknown',
    amount: parseNumber(amount),
    currency: invoice.currency || null,
    createdAt: invoice.createdAt || null,
  };
};

const getInvoiceStats = async (companyId) => {
  const baseWhere = { companyId };

  const totalRevenueExpr = sequelize.fn(
    'SUM',
    sequelize.fn('COALESCE', sequelize.col('total'), sequelize.col('amount'), 0),
  );

  const aggregate = await Invoice.findOne({
    where: baseWhere,
    attributes: [
      [sequelize.fn('COUNT', sequelize.col('id')), 'invoiceCount'],
      [totalRevenueExpr, 'totalRevenue'],
    ],
    raw: true,
  });

  const statusRows = await Invoice.findAll({
    where: baseWhere,
    attributes: [
      'status',
      [sequelize.fn('COUNT', sequelize.col('status')), 'count'],
    ],
    group: ['status'],
    raw: true,
  });

  const latestInvoice = await Invoice.findOne({
    where: baseWhere,
    order: [['createdAt', 'DESC']],
    attributes: ['id', 'invoiceNumber', 'status', 'total', 'amount', 'currency', 'createdAt'],
    raw: true,
  });

  const totalRevenue = parseNumber(aggregate?.totalRevenue);
  const invoiceCount = parseNumber(aggregate?.invoiceCount);

  const statusBreakdown = statusRows.reduce((acc, row) => {
    const status = row.status || 'unknown';
    acc[status] = parseNumber(row.count);
    return acc;
  }, {});

  return {
    totalRevenue,
    invoiceCount,
    statusBreakdown,
    latestInvoice: formatLatestInvoice(latestInvoice),
  };
};

module.exports = {
  getInvoiceStats,
};
