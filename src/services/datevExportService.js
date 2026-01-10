const { Op } = require('sequelize');
const { Invoice, InvoiceItem, Expense, FileAttachment } = require('../models');
const taxAccountingEngine = require('./taxAccountingEngine');

const TAX_KEY_MAP = [
  { threshold: 0.19, key: 'U19' },
  { threshold: 0.07, key: 'U7' },
  { threshold: 0.0, key: 'U0' },
];

const SKR04_ACCOUNTS = {
  revenue: {
    domestic: '4400',
    domesticReduced: '4300',
    export: '4125',
    eu: '4120',
    services: '4405',
  },
  expenses: {
    materials: '3200',
    wages: '4100',
    socialSecurity: '4110',
    rent: '4210',
    utilities: '4230',
    insurance: '4360',
    travel: '4660',
    office: '4930',
    marketing: '4600',
    depreciation: '4830',
  },
  vat: {
    inputTax: '1576',
    inputTaxReduced: '1571',
    outputTax: '1776',
    outputTaxReduced: '1771',
    vatPayable: '1780',
  },
  assets: {
    cash: '1000',
    bank: '1800',
    receivables: '1200',
    inventory: '3000',
    equipment: '0700',
    buildings: '0300',
  },
};

const normalizeRate = (value) => {
  const rate = Number(value);
  return Number.isFinite(rate) ? rate : null;
};

const deriveTaxKey = (vatRate) => {
  const rate = normalizeRate(vatRate);
  if (rate === null) {
    return 'U?';
  }
  for (const entry of TAX_KEY_MAP) {
    if (rate >= entry.threshold - 0.001) {
      return entry.key;
    }
  }
  return 'U0';
};

const resolveAccountSchema = (kontenrahmen) => {
  const normalized = (kontenrahmen || 'skr03').toLowerCase();
  if (normalized === 'skr04') {
    return { kontenrahmen: 'SKR04', accounts: SKR04_ACCOUNTS };
  }
  return { kontenrahmen: 'SKR03', accounts: taxAccountingEngine.skr03Accounts };
};

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
  if (normalized.includes('utility') || normalized.includes('strom') || normalized.includes('gas')) {
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
    ...buildDateWhere('date', from, to),
  };
  const expenseWhere = {
    companyId,
    ...buildDateWhere('expenseDate', from, to),
  };

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
      include: [{ model: FileAttachment, as: 'attachments' }],
      order: [['expenseDate', 'ASC']],
    }),
  ]);

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

module.exports = {
  buildDatevExport,
};
