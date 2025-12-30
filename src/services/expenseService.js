
const { Expense, FileAttachment, sequelize } = require('../models');
const { enforceCurrencyIsEur, ensureVatTotalsMatch, assertProvidedMatches } = require('../utils/vatIntegrity');
const { buildCompanyFilter } = require('../utils/companyFilter');

const expenseIncludes = [
  { model: FileAttachment, as: 'attachments' },
];

const listExpenses = async (companyId) => {
  const where = buildCompanyFilter(companyId);
  return Expense.findAll({
    where,
    order: [['expenseDate', 'DESC']],
    include: expenseIncludes,
  });
};

const getExpenseById = async (expenseId, companyId) => {
  const where = { id: expenseId, ...buildCompanyFilter(companyId) };
  return Expense.findOne({
    where,
    include: expenseIncludes,
  });
};

const createExpense = async (data, userId, companyId) => {
  const currency = enforceCurrencyIsEur(data.currency);
  // Validate required fields
  if (!data.vendorName || !data.category || (!data.netAmount && !data.grossAmount)) {
    const err = new Error('vendorName, category, and netAmount or grossAmount are required');
    err.status = 400;
    throw err;
  }

  // Calculate VAT and gross/net
  let net = parseFloat(data.netAmount ?? 0);
  const vatRate = parseFloat(data.vatRate ?? 0);
  let vat = +(net * vatRate).toFixed(2);
  let gross = +(net + vat).toFixed(2);
  if (!net && data.grossAmount && vatRate) {
    gross = parseFloat(data.grossAmount);
    net = +(gross / (1 + vatRate)).toFixed(2);
    vat = +(gross - net).toFixed(2);
  }

  assertProvidedMatches(data.vatAmount, vat, 'vatAmount');
  assertProvidedMatches(data.grossAmount, gross, 'grossAmount');

  ensureVatTotalsMatch({
    net,
    vat,
    gross,
    vatRate,
    currency,
  });

  const expensePayload = {
    vendorName: data.vendorName,
    description: data.description,
    category: data.category,
    netAmount: net,
    vatAmount: vat,
    grossAmount: gross,
    vatRate,
    status: data.status ?? 'draft',
    expenseDate: data.expenseDate || data.date || new Date(),
    createdByUserId: userId,
    companyId,
    notes: data.notes || null,
    currency,
    source: data.source || 'manual',
  };

  const createdExpense = await sequelize.transaction(async (t) => {
    const expense = await Expense.create(expensePayload, { transaction: t });
    // Attach files if provided
    if (Array.isArray(data.attachments) && data.attachments.length > 0) {
      for (const fileId of data.attachments) {
        await FileAttachment.update(
          { expenseId: expense.id },
          { where: { id: fileId, companyId }, transaction: t },
        );
      }
    }
    return expense;
  });

  const finalizedExpense = await getExpenseById(createdExpense.id, companyId);
  if (finalizedExpense) {
    return finalizedExpense;
  }
  const fallback = await Expense.findByPk(createdExpense.id, { include: expenseIncludes });
  if (!fallback) {
    const err = new Error('Expense created but could not be retrieved');
    err.status = 500;
    throw err;
  }
  return fallback;
};

const VALID_STATUS = ['draft', 'booked', 'archived'];
const STATUS_TRANSITIONS = {
  draft: ['booked', 'archived'],
  booked: ['archived'],
  archived: [],
};

const updateExpenseStatus = async (expenseId, newStatus, companyId) => {
  const where = { id: expenseId, ...buildCompanyFilter(companyId) };
  const expense = await Expense.findOne({ where });
  if (!expense) {return null;}
  const current = expense.status;
  if (!VALID_STATUS.includes(newStatus) || !STATUS_TRANSITIONS[current]?.includes(newStatus)) {
    return null;
  }
  expense.status = newStatus;
  await expense.save();
  return await getExpenseById(expenseId, companyId);
};

module.exports = {
  listExpenses,
  getExpenseById,
  createExpense,
  updateExpenseStatus,
};
