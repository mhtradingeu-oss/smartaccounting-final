const AuditLogService = require('./auditLogService');
// Fetch audit log for a specific invoice
const getInvoiceAuditLog = async (invoiceId, companyId) => {
  // Only logs for this invoice and company
  return await AuditLogService.exportLogs({
    format: 'json',
    companyId,
    resourceId: invoiceId,
    resourceType: 'Invoice',
  });
};
// Create a credit note for an invoice (Korrekturrechnung)
const createCreditNoteForInvoice = async (invoiceId, data, userId, companyId) => {
  const where = { id: invoiceId, ...buildCompanyFilter(companyId) };
  const original = await Invoice.findOne({ where, include: [{ model: InvoiceItem, as: 'items' }] });
  if (!original) {
    const err = new Error('Original invoice not found');
    err.status = 404;
    throw err;
  }
  if (normalizeStatus(original.status) !== 'SENT' && normalizeStatus(original.status) !== 'PAID') {
    const err = new Error('Credit notes can only be issued for immutable invoices (SENT/PAID).');
    err.status = 409;
    throw err;
  }
  // Prepare negative items
  const negativeItems = original.items.map((item) => ({
    description: `[CREDIT] ${item.description}`,
    quantity: -Math.abs(item.quantity),
    unitPrice: -Math.abs(item.unitPrice),
    vatRate: item.vatRate,
    lineNet: -Math.abs(item.lineNet),
    lineVat: -Math.abs(item.lineVat),
    lineGross: -Math.abs(item.lineGross),
  }));
  // Calculate totals
  const subtotal = negativeItems.reduce((sum, i) => sum + (i.lineNet || 0), 0);
  const total = negativeItems.reduce((sum, i) => sum + (i.lineGross || 0), 0);
  // Generate new invoice number (simple example)
  const creditNoteNumber = `${original.invoiceNumber}-CN-${Date.now()}`;
  // Transaction: create credit note, lock original
  return await sequelize.transaction(async (t) => {
    const creditNote = await Invoice.create(
      {
        invoiceNumber: creditNoteNumber,
        subtotal,
        total,
        amount: total,
        currency: original.currency,
        status: 'SENT',
        date: new Date(),
        dueDate: new Date(),
        clientName: original.clientName,
        userId,
        companyId,
        notes: `[CREDIT NOTE] ${data.notes || ''}`,
        referenceInvoiceId: original.id,
      },
      { transaction: t },
    );
    for (const item of negativeItems) {
      await InvoiceItem.create({ ...item, invoiceId: creditNote.id }, { transaction: t });
    }
    // Lock original invoice (set status to CANCELLED_CREDITED or similar)
    await original.update({ status: 'CANCELLED' }, { transaction: t });
    // TODO: Audit-log credit note creation
    const updatedOriginal = await getInvoiceById(original.id, companyId);
    const finalizedCreditNote = await getInvoiceById(creditNote.id, companyId);
    return { creditNote: finalizedCreditNote, originalInvoice: updatedOriginal };
  });
};
const {
  Invoice,
  InvoiceItem,
  FileAttachment,
  sequelize,
  InvoicePayment,
  User,
} = require('../models');
// Register a payment for an invoice
const registerInvoicePayment = async (invoiceId, paymentData, userId, companyId) => {
  const where = { id: invoiceId, ...buildCompanyFilter(companyId) };
  let invoice;
  try {
    invoice = await Invoice.findOne({ where });
  } catch (err) {
    // DB or truly unexpected error
    err.status = 500;
    throw err;
  }
  if (!invoice) {
    const err = new Error('Invoice not found');
    err.status = 404;
    throw err;
  }
  const statusNorm = normalizeStatus(invoice.status);
  if (statusNorm !== 'SENT' && statusNorm !== 'PARTIALLY_PAID') {
    // State conflict: not eligible for payment
    const err = new Error('Payments can only be registered for SENT or PARTIALLY_PAID invoices.');
    err.status = 409;
    throw err;
  }
  // Validate payment amount
  const paymentAmount = parseFloat(paymentData.amount);
  if (!paymentAmount || paymentAmount <= 0) {
    const err = new Error('Payment amount must be positive.');
    err.status = 400;
    throw err;
  }
  // Calculate new paid/remaining amounts
  const newPaidAmount = parseFloat(invoice.paidAmount) + paymentAmount;
  if (newPaidAmount > parseFloat(invoice.total)) {
    // Overpayment is a business rule violation: 409
    const err = new Error('Payment exceeds invoice total.');
    err.status = 409;
    throw err;
  }
  const newRemainingAmount = parseFloat(invoice.total) - newPaidAmount;
  // Determine new status
  let newStatus = 'PARTIALLY_PAID';
  if (newPaidAmount === parseFloat(invoice.total)) {
    newStatus = 'PAID';
  }
  try {
    // Transaction: create payment, update invoice
    return await sequelize.transaction(async (t) => {
      const payment = await InvoicePayment.create(
        {
          invoiceId: invoice.id,
          amount: paymentAmount,
          date: paymentData.date,
          method: paymentData.method,
          reference: paymentData.reference,
          userId,
          createdAt: new Date(),
        },
        { transaction: t },
      );
      await invoice.update(
        {
          paidAmount: newPaidAmount,
          remainingAmount: newRemainingAmount,
          status: newStatus,
        },
        { transaction: t },
      );
      // TODO: Audit-log payment registration
      const updatedInvoice = await getInvoiceById(invoice.id, companyId);
      return { payment, invoice: updatedInvoice };
    });
  } catch (err) {
    // Only allow truly unexpected errors to bubble as 500
    err.status = 500;
    throw err;
  }
};
const {
  enforceCurrencyIsEur,
  ensureVatTotalsMatch,
  assertProvidedMatches,
} = require('../utils/vatIntegrity');
const { buildCompanyFilter } = require('../utils/companyFilter');

const VALID_STATUS = ['DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED', 'PARTIALLY_PAID'];
const STATUS_TRANSITIONS = {
  DRAFT: ['SENT'],
  SENT: ['PAID', 'OVERDUE', 'CANCELLED', 'PARTIALLY_PAID'],
  PARTIALLY_PAID: ['PAID', 'OVERDUE', 'CANCELLED'],
  OVERDUE: ['PAID', 'CANCELLED'],
  PAID: [],
  CANCELLED: [],
};

const invoiceIncludes = [
  { model: InvoiceItem, as: 'items' },
  { model: FileAttachment, as: 'attachments' },
];

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
  const where = buildCompanyFilter(companyId);
  return Invoice.findAll({
    where,
    order: [['createdAt', 'DESC']],
    include: invoiceIncludes,
  });
};

const getInvoiceById = async (invoiceId, companyId) => {
  const where = { id: invoiceId, ...buildCompanyFilter(companyId) };
  const invoice = await Invoice.findOne({
    where,
    include: invoiceIncludes,
  });
  if (!invoice) {
    return null;
  }
  // VAT summary breakdown
  const items = invoice.items || [];
  const vatGroups = {};
  let totalVat = 0;
  items.forEach((item) => {
    const rate = Number(item.vatRate) * 100; // e.g. 0.19 → 19
    if (!vatGroups[rate]) {
      vatGroups[rate] = { rate, net: 0, vat: 0, gross: 0 };
    }
    vatGroups[rate].net += Number(item.lineNet);
    vatGroups[rate].vat += Number(item.lineVat);
    vatGroups[rate].gross += Number(item.lineGross);
    totalVat += Number(item.lineVat);
  });
  invoice.vatSummary = {
    items: Object.values(vatGroups).map((vg) => ({
      rate: vg.rate,
      net: +vg.net.toFixed(2),
      vat: +vg.vat.toFixed(2),
      gross: +vg.gross.toFixed(2),
    })),
    totalVat: +totalVat.toFixed(2),
  };
  return invoice;
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
  let invoiceSubtotal = 0;
  let invoiceGross = 0;
  const items = data.items.map((item) => {
    const quantity = parseFloat(item.quantity);
    const unitPrice = parseFloat(item.unitPrice ?? item.price);
    const vatRate = parseFloat(item.vatRate);
    const lineNet = +(quantity * unitPrice).toFixed(2);
    const lineVat = +(lineNet * vatRate).toFixed(2);
    const lineGross = +(lineNet + lineVat).toFixed(2);
    invoiceSubtotal += lineNet;

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

  const createdInvoice = await sequelize.transaction(async (t) => {
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
    return invoice;
  });

  const finalizedInvoice = await getInvoiceById(createdInvoice.id, companyId);
  if (finalizedInvoice) {
    return finalizedInvoice;
  }
  const fallback = await Invoice.findByPk(createdInvoice.id, { include: invoiceIncludes });
  if (!fallback) {
    const err = new Error('Invoice created but could not be retrieved');
    err.status = 500;
    throw err;
  }
  return fallback;
};

const updateInvoice = async (invoiceId, changes, companyId) => {
  const forbiddenFields = Object.keys(changes || {}).filter((field) =>
    PROHIBITED_DERIVED_FIELDS.has(field),
  );
  if (forbiddenFields.length > 0) {
    const err = new Error('Derived invoice totals cannot be changed directly.');
    err.status = 400;
    throw err;
  }
  if (Object.prototype.hasOwnProperty.call(changes, 'currency')) {
    changes.currency = enforceCurrencyIsEur(changes.currency);
  }
  const where = { id: invoiceId, ...buildCompanyFilter(companyId) };
  const invoice = await Invoice.findOne({ where });
  if (!invoice) {
    return null;
  }
  // Immutability guard: block edits after SENT (except status/credit note)
  const immutableStatuses = ['SENT', 'PAID', 'OVERDUE', 'CANCELLED', 'PARTIALLY_PAID'];
  if (immutableStatuses.includes(normalizeStatus(invoice.status))) {
    const err = new Error(
      'Invoice is immutable after SENT. Only status transitions or credit notes are allowed.',
    );
    err.status = 409;
    // TODO: Audit-log blocked attempt here
    throw err;
  }
  await invoice.update(changes);
  return await getInvoiceById(invoiceId, companyId);
};

const updateInvoiceStatus = async (invoiceId, newStatus, companyId) => {
  const where = { id: invoiceId, ...buildCompanyFilter(companyId) };
  const invoice = await Invoice.findOne({ where });
  if (!invoice) {
    return null;
  }
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
  registerInvoicePayment,
  createCreditNoteForInvoice,
  getInvoiceAuditLog,
};
