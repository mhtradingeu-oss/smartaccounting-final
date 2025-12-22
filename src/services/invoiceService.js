const { Invoice, InvoiceItem, FileAttachment, sequelize } = require('../models');
const { enforceCurrencyIsEur, ensureVatTotalsMatch, assertProvidedMatches } = require('../utils/vatIntegrity');

const VALID_STATUS = ['DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED'];
const STATUS_TRANSITIONS = {
  DRAFT: ['SENT'],
  SENT: ['PAID', 'OVERDUE', 'CANCELLED'],
  OVERDUE: ['PAID', 'CANCELLED'],
  PAID: [],
  CANCELLED: [],
};

const normalizeStatus = (value, fallback = '') => {
  if (!value || typeof value !== 'string') {
    return fallback;
  }
  const normalized = value.trim().toUpperCase();
  if (!normalized) {
    return fallback;
  }
  if (normalized === 'PENDING') {
    return 'DRAFT';
  }
  return VALID_STATUS.includes(normalized) ? normalized : fallback;
};


const listInvoices = async (companyId) => {
  return Invoice.findAll({
    where: { companyId },
    order: [['createdAt', 'DESC']],
    include: [
      { model: InvoiceItem, as: 'items' },
      { model: FileAttachment, as: 'attachments' },
    ],
  });
};

const getInvoiceById = async (invoiceId, companyId) => {
  return Invoice.findOne({
    where: { id: invoiceId, companyId },
    include: [
      { model: InvoiceItem, as: 'items' },
      { model: FileAttachment, as: 'attachments' },
    ],
  });
};

// Transactional creation of invoice, items, and attachments
const PROHIBITED_DERIVED_FIELDS = new Set(['subtotal', 'total', 'amount']);

const createInvoice = async (data, userId, companyId) => {
  const currency = enforceCurrencyIsEur(data.currency);
  // Validate at least one item
  if (!Array.isArray(data.items) || data.items.length === 0) {
    const err = new Error('At least one invoice item is required');
    err.status = 400;
    throw err;
  }

  // Calculate line and invoice totals
  // eslint-disable-next-line no-unused-vars -- reserved for tax engine Phase 10
  let invoiceSubtotal = 0, invoiceVat = 0, invoiceGross = 0;
  const items = data.items.map(item => {
    const quantity = parseFloat(item.quantity);
    const unitPrice = parseFloat(item.unitPrice ?? item.price);
    const vatRate = parseFloat(item.vatRate);
    const lineNet = +(quantity * unitPrice).toFixed(2);
    const lineVat = +((lineNet * vatRate) / 100).toFixed(2);
    const lineGross = +(lineNet + lineVat).toFixed(2);
    invoiceSubtotal += lineNet;
    invoiceVat += lineVat;
    invoiceGross += lineGross;
    ensureVatTotalsMatch({
      net: lineNet,
      vat: lineVat,
      gross: lineGross,
      vatRate,
      currency,
    });
    return {
      description: item.description,
      quantity,
      unitPrice,
      vatRate,
      lineNet,
      lineVat,
      lineGross,
    };
  });

  const status = normalizeStatus(data.status, 'DRAFT');
  assertProvidedMatches(data.subtotal, invoiceSubtotal, 'subtotal');
  assertProvidedMatches(data.total, invoiceGross, 'total');
  assertProvidedMatches(data.amount, invoiceGross, 'amount');
  const invoicePayload = {
    invoiceNumber: data.invoiceNumber,
    subtotal: invoiceSubtotal,
    total: invoiceGross,
    amount: invoiceGross,
    currency,
    status,
    date: data.date || data.issueDate,
    dueDate: data.dueDate,
    clientName: data.clientName,
    userId,
    companyId,
    notes: data.notes || null,
  };

  return await sequelize.transaction(async (t) => {
    const invoice = await Invoice.create(invoicePayload, { transaction: t });
    // Attach items
    for (const item of items) {
      await InvoiceItem.create({ ...item, invoiceId: invoice.id }, { transaction: t });
    }
    // Attach files if provided
    if (Array.isArray(data.attachments) && data.attachments.length > 0) {
      for (const fileId of data.attachments) {
        await FileAttachment.update(
          { invoiceId: invoice.id },
          { where: { id: fileId, companyId }, transaction: t },
        );
      }
    }
    return await getInvoiceById(invoice.id, companyId);
  });
};


const updateInvoice = async (invoiceId, changes, companyId) => {
  const forbiddenFields = Object.keys(changes || {}).filter(field => PROHIBITED_DERIVED_FIELDS.has(field));
  if (forbiddenFields.length > 0) {
    const err = new Error('Derived invoice totals cannot be changed directly.');
    err.status = 400;
    throw err;
  }
  if (Object.prototype.hasOwnProperty.call(changes, 'currency')) {
    changes.currency = enforceCurrencyIsEur(changes.currency);
  }
  const invoice = await Invoice.findOne({ where: { id: invoiceId, companyId } });
  if (!invoice) {return null;}
  await invoice.update(changes);
  return await getInvoiceById(invoiceId, companyId);
};

const updateInvoiceStatus = async (invoiceId, newStatus, companyId) => {
  const invoice = await Invoice.findOne({ where: { id: invoiceId, companyId } });
  if (!invoice) {return null;}
  const current = normalizeStatus(invoice.status);
  const next = normalizeStatus(newStatus);
  if (!next || !STATUS_TRANSITIONS[current]?.includes(next)) {
    return null;
  }
  invoice.status = next;
  await invoice.save();
  return await getInvoiceById(invoiceId, companyId);
};

module.exports = {
  listInvoices,
  getInvoiceById,
  createInvoice,
  updateInvoice,
  updateInvoiceStatus,
};
