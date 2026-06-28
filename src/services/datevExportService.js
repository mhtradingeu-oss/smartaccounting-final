// DATEV Zahlungsverkehr Export Service (Phase 7.4)
// Exports payments from locked bank transactions to DATEV CSV

const { Parser } = require('json2csv');
const { Op } = require('sequelize');
const { Invoice, InvoiceItem, FileAttachment, Expense } = require('../models');
const {
  resolveExpenseAttachmentSupport,
  applyEmptyExpenseAttachments,
} = require('../utils/expenseAttachmentSupport');

// --- Stubs for missing utils (should be replaced with real implementations if available) ---
function resolveAccountSchema(kontenrahmen) {
  // Example: returns a default schema; replace with real logic as needed
  return {
    kontenrahmen: kontenrahmen || 'SKR03',
    accounts: {
      revenue: { domestic: '8400', domesticReduced: '8300' },
      assets: { receivables: '1200', bank: '1000' },
      expenses: {
        rent: '4210',
        utilities: '4300',
        insurance: '4400',
        travel: '4650',
        marketing: '4600',
        office: '4800',
      },
    },
  };
}

function deriveTaxKey(vatRate) {
  // Example: returns a tax key based on vatRate; replace with real logic as needed
  if (vatRate === null) {return '';}
  if (vatRate < 0.15) {return '7';}
  if (vatRate >= 0.15) {return '19';}
  return '';
}

function normalizeRate(rate) {
  // Example: normalizes VAT rate; replace with real logic as needed
  if (rate === null) {return null;}
  const n = Number(rate);
  if (!Number.isFinite(n)) {return null;}
  if (n > 1) {return n / 100;}
  return n;
}

class DatevExportService {
  async exportPayments(payments, clearingAccounts) {
    // Filter: only payments with locked bank transactions
    const eligible = payments.filter((p) => p.locked && p.bankTransactionLocked);
    // Map to DATEV CSV fields
    const records = eligible.map((p) => ({
      Buchungstag: p.paymentDate,
      Betrag: p.amountPaid,
      Währung: p.currency || 'EUR',
      Gegenkonto: clearingAccounts[p.invoiceOrExpenseType] || '',
      Verwendungszweck: p.reference || '',
      Belegfeld1: p.invoiceOrExpenseId,
      Belegfeld2: p.bankTransactionId,
    }));
    // Generate CSV
    const parser = new Parser({ delimiter: ';' });
    return parser.parse(records);
  }
}

const datevPaymentExportService = new DatevExportService();

const buildDateWhere = (field, from, to) => {
  const range = {};
  if (from) {
    range[Op.gte] = from;
  }
  if (to) {
    range[Op.lte] = to;
  }
  if (!Object.keys(range).length) {
    return {};
  }
  return { [field]: range };
};

const formatDate = (value) => {
  if (!value) {
    return '';
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return date.toISOString().slice(0, 10);
};

const formatAmount = (value) => {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount.toFixed(2) : '0.00';
};

const sumInvoiceItems = (items = []) => {
  return items.reduce(
    (acc, item) => {
      const net = Number(item.lineNet || 0);
      const vat = Number(item.lineVat || 0);
      acc.net += Number.isFinite(net) ? net : 0;
      acc.vat += Number.isFinite(vat) ? vat : 0;
      if (item.vatRate !== undefined && item.vatRate !== null) {
        acc.vatRates.add(Number(item.vatRate));
      }
      return acc;
    },
    { net: 0, vat: 0, vatRates: new Set() },
  );
};

const pickExpenseAccount = (category = '', accounts) => {
  const normalized = String(category || '').toLowerCase();
  if (normalized.includes('rent') || normalized.includes('miete')) {
    return accounts.expenses.rent;
  }
  if (
    normalized.includes('utility') ||
    normalized.includes('strom') ||
    normalized.includes('gas')
  ) {
    return accounts.expenses.utilities;
  }
  if (normalized.includes('insurance') || normalized.includes('versicherung')) {
    return accounts.expenses.insurance;
  }
  if (normalized.includes('travel') || normalized.includes('reise')) {
    return accounts.expenses.travel;
  }
  if (normalized.includes('marketing') || normalized.includes('werbung')) {
    return accounts.expenses.marketing;
  }
  if (normalized.includes('office') || normalized.includes('büro')) {
    return accounts.expenses.office;
  }
  return accounts.expenses.office;
};

const buildAttachmentPaths = (attachments = []) => {
  if (!attachments.length) {
    return '';
  }
  return attachments
    .map((attachment) => attachment?.url || attachment?.filePath || '')
    .filter(Boolean)
    .join('; ');
};

async function buildDatevExport({ companyId, from, to, kontenrahmen }) {
  const { kontenrahmen: kontenrahmenLabel, accounts } = resolveAccountSchema(kontenrahmen);
  const invoiceWhere = {
    companyId,
    status: { [Op.in]: ['SENT', 'PAID', 'OVERDUE', 'PARTIALLY_PAID'] },
    ...buildDateWhere('date', from, to),
  };
  const expenseWhere = {
    companyId,
    ...buildDateWhere('expenseDate', from, to),
  };

  const supportsExpenseAttachments = await resolveExpenseAttachmentSupport();

  const [invoices, expenses] = await Promise.all([
    Invoice.findAll({
      where: invoiceWhere,
      include: [
        { model: InvoiceItem, as: 'items' },
        { model: FileAttachment, as: 'attachments' },
      ],
      order: [['date', 'ASC']],
    }),
    Expense.findAll({
      where: expenseWhere,
      ...(supportsExpenseAttachments
        ? { include: [{ model: FileAttachment, as: 'attachments' }] }
        : {}),
      order: [['expenseDate', 'ASC']],
    }),
  ]);

  if (!supportsExpenseAttachments) {
    applyEmptyExpenseAttachments(expenses);
  }

  const rows = [];

  for (const invoice of invoices) {
    const plain = invoice.get({ plain: true });
    const itemSummary = sumInvoiceItems(plain.items || []);
    const netAmount = itemSummary.net || Number(plain.subtotal || 0);
    const vatAmount = itemSummary.vat || Number(plain.total || 0) - Number(plain.subtotal || 0);
    const vatRates = [...itemSummary.vatRates].filter((rate) => Number.isFinite(rate));
    const vatRate = vatRates.length === 1 ? vatRates[0] : null;
    const revenueAccount =
      vatRate !== null && vatRate < 0.15
        ? accounts.revenue.domesticReduced
        : accounts.revenue.domestic;

    rows.push({
      recordType: 'invoice',
      recordId: plain.id,
      bookingDate: formatDate(plain.date),
      account: accounts.assets.receivables,
      counterAccount: revenueAccount,
      amount: formatAmount(netAmount),
      vatAmount: formatAmount(vatAmount),
      currency: plain.currency || 'EUR',
      taxKey: deriveTaxKey(vatRate),
      bookingText: `Invoice ${plain.invoiceNumber}`,
      attachmentPaths: buildAttachmentPaths(plain.attachments || []),
    });
  }

  for (const expense of expenses) {
    const plain = expense.get({ plain: true });
    const vatRate = normalizeRate(plain.vatRate);
    rows.push({
      recordType: 'expense',
      recordId: plain.id,
      bookingDate: formatDate(plain.expenseDate),
      account: pickExpenseAccount(plain.category, accounts),
      counterAccount: accounts.assets.bank,
      amount: formatAmount(plain.netAmount),
      vatAmount: formatAmount(plain.vatAmount),
      currency: plain.currency || 'EUR',
      taxKey: deriveTaxKey(vatRate),
      bookingText: `Expense ${plain.vendorName || plain.id}`,
      attachmentPaths: buildAttachmentPaths(plain.attachments || []),
    });
  }

  return {
    rows,
    meta: {
      kontenrahmen: kontenrahmenLabel,
      generatedAt: new Date().toISOString(),
      disclaimer:
        'Prepared for tax advisor / DATEV-compatible export. No direct submission or certification.',
      from: from ? from.toISOString() : null,
      to: to ? to.toISOString() : null,
    },
  };
}

module.exports = datevPaymentExportService;
module.exports.buildDatevExport = buildDatevExport;
module.exports.DatevExportService = DatevExportService;
