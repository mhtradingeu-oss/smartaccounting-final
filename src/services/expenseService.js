const { Expense, FileAttachment, sequelize } = require('../models');
const AuditLogService = require('./auditLogService');
const {
  enforceCurrencyIsEur,
  ensureVatTotalsMatch,
  assertProvidedMatches,
} = require('../utils/vatIntegrity');
const { buildCompanyFilter } = require('../utils/companyFilter');
const {
  resolveExpenseAttachmentSupport,
  applyEmptyExpenseAttachments,
  applyEmptyExpenseAttachment,
} = require('../utils/expenseAttachmentSupport');

const expenseIncludes = [{ model: FileAttachment, as: 'attachments' }];

const normalizeExpenseStatus = (status) => {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'pending' || normalized === 'draft') {
    return 'pending';
  }
  if (normalized === 'booked' || normalized === 'posted') {
    return 'booked';
  }
  if (normalized === 'archived') {
    return 'archived';
  }
  return null;
};

const normalizeExpenseForResponse = (expense) => {
  if (!expense) {
    return expense;
  }
  const status = normalizeExpenseStatus(expense.status) || 'pending';
  if (typeof expense.setDataValue === 'function') {
    expense.setDataValue('status', status);
  } else {
    expense.status = status;
  }
  return expense;
};

const listExpenses = async (companyId) => {
  const where = buildCompanyFilter(companyId);
  const supportsAttachments = await resolveExpenseAttachmentSupport();
  const expenses = await Expense.findAll({
    where,
    order: [['expenseDate', 'DESC']],
    ...(supportsAttachments ? { include: expenseIncludes } : {}),
  });
  if (!supportsAttachments) {
    applyEmptyExpenseAttachments(expenses);
  }
  return expenses.map(normalizeExpenseForResponse);
};

const getExpenseById = async (expenseId, companyId) => {
  const where = { id: expenseId, ...buildCompanyFilter(companyId) };
  const supportsAttachments = await resolveExpenseAttachmentSupport();
  const expense = await Expense.findOne({
    where,
    ...(supportsAttachments ? { include: expenseIncludes } : {}),
  });
  if (expense && !supportsAttachments) {
    applyEmptyExpenseAttachment(expense);
  }
  return normalizeExpenseForResponse(expense);
};

const { withAuditLog } = require('./withAuditLog');

async function createExpense(data, userId, companyId, context = {}) {
  const currency = enforceCurrencyIsEur(data.currency);
  // Validate required fields (pre-service, no audit log on fail)
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

  try {
    assertProvidedMatches(data.vatAmount, vat, 'vatAmount');
    assertProvidedMatches(data.grossAmount, gross, 'grossAmount');
    assertProvidedMatches(data.amount, gross, 'amount');
    ensureVatTotalsMatch({ net, vat, gross, vatRate, currency });
  } catch (validationErr) {
    // Always throw as status 400 with clear message
    validationErr.status = 400;
    validationErr.statusCode = 400;
    validationErr.code = validationErr.code || 'VAT_INTEGRITY_ERROR';
    validationErr.message = validationErr.message || 'VAT/Gross validation error';
    throw validationErr;
  }

  const expenseDate = data.expenseDate || data.date || new Date();
  const expensePayload = {
    vendorName: data.vendorName,
    description: data.description,
    category: data.category,
    netAmount: net,
    vatAmount: vat,
    grossAmount: gross,
    amount: gross,
    vatRate,
    status: normalizeExpenseStatus(data.status) || 'pending',
    expenseDate,
    date: expenseDate,
    createdByUserId: userId,
    userId,
    companyId,
    notes: data.notes || null,
    currency,
    source: data.source || 'manual',
  };

  let createdExpense;
  const supportsAttachments = await resolveExpenseAttachmentSupport();
  await sequelize.transaction(async (t) => {
    createdExpense = await Expense.create(expensePayload, { transaction: t });
    // Attach files if provided
    if (Array.isArray(data.attachments) && data.attachments.length > 0) {
      for (const fileId of data.attachments) {
        const existingAttachment = await FileAttachment.findOne({
          where: { id: fileId, companyId },
          transaction: t,
        });
        if (!existingAttachment) {
          continue;
        }
        const oldAttachmentValues = supportsAttachments
          ? { expenseId: existingAttachment.expenseId || null }
          : {
              attachedToType: existingAttachment.attachedToType || null,
              extractedData: existingAttachment.extractedData || null,
            };
        const linkPatch = supportsAttachments
          ? { expenseId: createdExpense.id }
          : {
              attachedToType: 'Expense',
              extractedData: {
                ...(existingAttachment.extractedData || {}),
                linkedExpenseId: createdExpense.id,
                linkedVia: 'ai_document_intake_confirmed_draft',
              },
            };
        await existingAttachment.update(linkPatch, { transaction: t });
        await AuditLogService.appendEntry({
          action: 'EXPENSE_ATTACHMENT_ADD',
          resourceType: 'FileAttachment',
          resourceId: String(fileId),
          companyId,
          userId,
          oldValues: oldAttachmentValues,
          newValues: linkPatch,
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
          reason: context.reason || 'Attachment added to expense',
          transaction: t,
        });
      }
    }
  });

  await withAuditLog(
    {
      action: 'EXPENSE_CREATE',
      resourceType: 'Expense',
      resourceId: createdExpense.id,
      companyId,
      userId,
      oldValues: null,
      newValues: expensePayload,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      reason: context.reason || 'Expense created',
      status: 'SUCCESS',
    },
    async () => Promise.resolve(),
  );

  const finalizedExpense = await getExpenseById(createdExpense.id, companyId);
  if (finalizedExpense) {
    return finalizedExpense;
  }
  const fallback = await Expense.findByPk(
    createdExpense.id,
    supportsAttachments ? { include: expenseIncludes } : {},
  );
  if (fallback && !supportsAttachments) {
    applyEmptyExpenseAttachment(fallback);
  }
  return fallback;
}

const VALID_STATUS = ['pending', 'booked', 'archived'];
const STATUS_TRANSITIONS = {
  pending: ['booked', 'archived'],
  booked: ['archived'],
  archived: [],
};

async function updateExpenseStatus(expenseId, newStatus, companyId, context = {}) {
  const where = { id: expenseId, ...buildCompanyFilter(companyId) };
  const expense = await Expense.findOne({ where });
  if (!expense) {
    // Only log denied if service is reached (not for 404)
    const err = new Error('Expense not found');
    err.status = 404;
    err.code = 'EXPENSE_NOT_FOUND';
    throw err;
  }
  const current = normalizeExpenseStatus(expense.status);
  const next = normalizeExpenseStatus(newStatus);
  if (!VALID_STATUS.includes(next) || !STATUS_TRANSITIONS[current]?.includes(next)) {
    await withAuditLog(
      {
        action: 'EXPENSE_STATUS_CHANGE_DENIED',
        resourceType: 'Expense',
        resourceId: expenseId,
        companyId,
        userId: context.userId,
        oldValues: { status: current },
        newValues: { status: newStatus },
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        reason: 'Illegal status transition',
        status: 'DENIED',
      },
      async () => Promise.resolve(),
    );
    const err = new Error('Illegal status transition');
    err.status = 409;
    err.code = 'INVALID_STATUS_TRANSITION';
    throw err;
  }
  const oldStatus = expense.status;
  expense.status = next;
  await expense.save();
  await withAuditLog(
    {
      action: 'EXPENSE_STATUS_CHANGE',
      resourceType: 'Expense',
      resourceId: expenseId,
      companyId,
      userId: context.userId,
      oldValues: { status: oldStatus },
      newValues: { status: newStatus },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      reason: 'Status changed',
      status: 'SUCCESS',
    },
    async () => Promise.resolve(),
  );
  return await getExpenseById(expenseId, companyId);
}

module.exports = {
  listExpenses,
  getExpenseById,
  createExpense,
  updateExpenseStatus,
};
