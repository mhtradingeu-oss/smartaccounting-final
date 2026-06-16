const { Invoice, Expense } = require('../../models');

/**
 * Aggregates VAT from LOCKED invoices & expenses only
 */
async function aggregateVAT({ companyId, periodFrom, periodTo }) {
  // Fetch locked invoices and expenses for the period
  const invoices = await Invoice.findAll({
    where: {
      companyId,
      locked: true,
      date: { $gte: periodFrom, $lte: periodTo },
    },
  });
  const expenses = await Expense.findAll({
    where: {
      companyId,
      locked: true,
      date: { $gte: periodFrom, $lte: periodTo },
    },
  });

  // Initialize VAT totals
  const totals = {
    outputVAT: { 19: 0, 7: 0, reverseCharge: 0, eu: 0 },
    inputVAT: { 19: 0, 7: 0, reverseCharge: 0, eu: 0 },
  };
  const breakdown = [];

  // Helper to add VAT by rate
  function addVAT(type, rate, amount) {
    if (totals[type][rate] !== undefined) {
      totals[type][rate] += amount;
    }
  }

  // Aggregate output VAT from invoices
  for (const inv of invoices) {
    // Assume inv.vatRate is one of: 19, 7, 'reverseCharge', 'eu'
    const rate = inv.vatRate;
    addVAT('outputVAT', rate, Number(inv.vatAmount || 0));
    breakdown.push({ type: 'invoice', id: inv.id, rate, vat: inv.vatAmount });
  }

  // Aggregate input VAT from expenses
  for (const exp of expenses) {
    const rate = exp.vatRate;
    addVAT('inputVAT', rate, Number(exp.vatAmount || 0));
    breakdown.push({ type: 'expense', id: exp.id, rate, vat: exp.vatAmount });
  }

  // Round totals to 2 decimals
  Object.keys(totals.outputVAT).forEach((r) => {
    totals.outputVAT[r] = Math.round(totals.outputVAT[r] * 100) / 100;
    totals.inputVAT[r] = Math.round(totals.inputVAT[r] * 100) / 100;
  });

  return { totals, breakdown };
}

module.exports = { aggregateVAT };
