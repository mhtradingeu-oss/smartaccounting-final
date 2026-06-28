const { Op } = require('sequelize');
const { Invoice, Expense } = require('../../models');

/**
 * Aggregates VAT from company-scoped invoices and expenses in a period.
 *
 * This utility is used by the demo UStVA endpoint. It must not depend on
 * obsolete model columns such as `locked`; period locking is handled separately
 * by the VAT demo flow.
 */
async function aggregateVAT({ companyId, periodFrom, periodTo }) {
  const dateRange = {
    [Op.gte]: periodFrom,
    [Op.lte]: periodTo,
  };

  const invoices = await Invoice.findAll({
    where: {
      companyId,
      date: dateRange,
    },
  });

  const expenses = await Expense.findAll({
    where: {
      companyId,
      [Op.or]: [
        { expenseDate: dateRange },
        { date: dateRange },
      ],
    },
  });

  const totals = {
    outputVAT: { 19: 0, 7: 0, reverseCharge: 0, eu: 0 },
    inputVAT: { 19: 0, 7: 0, reverseCharge: 0, eu: 0 },
  };
  const breakdown = [];

  function normalizeRate(rate) {
    if (rate === 0.19 || rate === '0.19') return '19';
    if (rate === 0.07 || rate === '0.07') return '7';
    return String(rate);
  }

  function addVAT(type, rate, amount) {
    const normalizedRate = normalizeRate(rate);
    if (Object.prototype.hasOwnProperty.call(totals[type], normalizedRate)) {
      totals[type][normalizedRate] += Number(amount || 0);
    }
  }

  for (const invoice of invoices) {
    const rate = normalizeRate(invoice.vatRate ?? 19);
    const vatAmount = Number(invoice.vatAmount ?? invoice.taxAmount ?? 0);
    addVAT('outputVAT', rate, vatAmount);
    breakdown.push({ type: 'invoice', id: invoice.id, rate, vat: vatAmount });
  }

  for (const expense of expenses) {
    const rate = normalizeRate(expense.vatRate ?? 19);
    const vatAmount = Number(expense.vatAmount ?? 0);
    addVAT('inputVAT', rate, vatAmount);
    breakdown.push({ type: 'expense', id: expense.id, rate, vat: vatAmount });
  }

  Object.keys(totals.outputVAT).forEach((rate) => {
    totals.outputVAT[rate] = Math.round(totals.outputVAT[rate] * 100) / 100;
    totals.inputVAT[rate] = Math.round(totals.inputVAT[rate] * 100) / 100;
  });

  return { totals, breakdown };
}

module.exports = { aggregateVAT };
