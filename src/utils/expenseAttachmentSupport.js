const { FileAttachment } = require('../models');

let cachedSupport = null;
let cachedSupportChecked = false;
let cachedSupportPromise = null;

const resolveExpenseAttachmentSupport = async () => {
  if (cachedSupportChecked) {
    return cachedSupport;
  }
  if (cachedSupportPromise) {
    return cachedSupportPromise;
  }
  cachedSupportPromise = (async () => {
    try {
      const queryInterface = FileAttachment.sequelize.getQueryInterface();
      const table = await queryInterface.describeTable('file_attachments');
      const column = table?.expense_id || table?.expenseId || null;
      if (!column || !column.type) {
        cachedSupport = false;
        cachedSupportChecked = true;
        return cachedSupport;
      }
      const normalizedType = String(column.type).toLowerCase();
      cachedSupport = !normalizedType.includes('uuid');
      cachedSupportChecked = true;
      return cachedSupport;
    } catch (error) {
      cachedSupport = false;
      cachedSupportChecked = true;
      return cachedSupport;
    } finally {
      cachedSupportPromise = null;
    }
  })();
  return cachedSupportPromise;
};

const applyEmptyExpenseAttachments = (expenses) => {
  if (!Array.isArray(expenses)) {
    return;
  }
  for (const expense of expenses) {
    if (expense && typeof expense.setDataValue === 'function') {
      expense.setDataValue('attachments', []);
    }
  }
};

const applyEmptyExpenseAttachment = (expense) => {
  if (expense && typeof expense.setDataValue === 'function') {
    expense.setDataValue('attachments', []);
  }
};

module.exports = {
  resolveExpenseAttachmentSupport,
  applyEmptyExpenseAttachments,
  applyEmptyExpenseAttachment,
};
