// Validator to ensure payload keys match allowed columns
const assertKeysMatch = (payload, allowedKeys, context) => {
  Object.keys(payload).forEach((key) => {
    if (!allowedKeys.includes(key)) {
      throw new Error(`[DEMO SEED] Invalid column "${key}" in ${context}`);
    }
  });
};
let _qi = null;

const getQI = (queryInterface) => {
  if (_qi) {
    return _qi;
  }

  if (queryInterface?.bulkInsert) {
    _qi = queryInterface;
    return _qi;
  }

  if (queryInterface?.sequelize?.getQueryInterface) {
    _qi = queryInterface.sequelize.getQueryInterface();
    return _qi;
  }

  throw new Error('[DEMO SEED] Cannot resolve QueryInterface');
};
('use strict');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const AuditLogService = require('../../../src/services/auditLogService');

const DEMO_PASSWORD = process.env.DEMO_PASSWORD || 'Demo123!';
const DEMO_COMPANY = {
  name: 'SmartAccounting Demo GmbH',
  taxId: 'DE123456789',
  address: 'Chausseestraße 10',
  city: 'Berlin',
  postalCode: '10115',
  country: 'DE',
  aiEnabled: true,
  subscriptionPlan: 'pro',
  subscriptionStatus: 'active',
};

const DEMO_USERS = [
  { email: 'demo-admin@demo.com', firstName: 'Svenja', lastName: 'Pilot', role: 'admin' },
  { email: 'demo-accountant@demo.com', firstName: 'Lukas', lastName: 'Thiel', role: 'accountant' },
  { email: 'demo-auditor@demo.com', firstName: 'Freya', lastName: 'Klein', role: 'auditor' },
  { email: 'demo-viewer@demo.com', firstName: 'Jonas', lastName: 'Beck', role: 'viewer' },
];
const SYSTEM_ADMIN_USER = {
  email: 'sysadmin@demo.local',
  firstName: 'System',
  lastName: 'Admin',
  role: 'admin',
  companyId: null,
};

const INVOICE_TEMPLATES = [
  {
    invoiceNumber: 'SA-INV-2026-001',
    status: 'PAID',
    clientName: 'NordWest Logistics GmbH',
    notes: 'Berlin HQ bookkeeping automation rollout',
    ownerKey: 'admin',
    date: '2026-02-01',
    dueDate: '2026-02-15',
    items: [
      { description: 'Implementation workshop', quantity: 1, unitPrice: 2500, vatRate: 0.19 },
    ],
  },
  {
    invoiceNumber: 'SA-INV-2026-002',
    status: 'PARTIALLY_PAID',
    clientName: 'Berlin BioTech GmbH',
    notes: 'Monthly compliance & CFO support',
    ownerKey: 'accountant',
    date: '2026-02-08',
    dueDate: '2026-02-22',
    items: [
      { description: 'Monthly bookkeeping bundle', quantity: 1, unitPrice: 1750, vatRate: 0.19 },
    ],
  },
  {
    invoiceNumber: 'SA-INV-2026-003',
    status: 'DRAFT',
    clientName: 'Eichenhaus Architektur',
    notes: 'Audit readiness review for spring closing',
    ownerKey: 'accountant',
    date: '2026-02-12',
    dueDate: '2026-02-26',
    items: [{ description: 'Audit readiness review', quantity: 1, unitPrice: 980, vatRate: 0.19 }],
  },
  {
    invoiceNumber: 'SA-INV-2026-004',
    status: 'PAID',
    clientName: 'Fjord Data Solutions GmbH',
    notes: 'GoBD workshop and documentation delivery',
    ownerKey: 'admin',
    date: '2026-02-20',
    dueDate: '2026-03-06',
    items: [
      { description: 'GoBD workshop (2 days)', quantity: 2, unitPrice: 950, vatRate: 0.19 },
      { description: 'Documentation pack', quantity: 1, unitPrice: 480, vatRate: 0.19 },
    ],
  },
  {
    invoiceNumber: 'SA-INV-2026-005',
    status: 'PARTIALLY_PAID',
    clientName: 'Märkisches Ventures GmbH',
    notes: 'Fractional CFO hours for growth planning',
    ownerKey: 'accountant',
    date: '2026-03-03',
    dueDate: '2026-03-17',
    items: [{ description: 'Fractional CFO hours', quantity: 20, unitPrice: 150, vatRate: 0.19 }],
  },
  {
    invoiceNumber: 'SA-INV-2026-006',
    status: 'PAID',
    clientName: 'Northwind Analytics GmbH',
    notes: 'Automation readiness implementation',
    ownerKey: 'admin',
    date: '2026-03-09',
    dueDate: '2026-03-23',
    items: [
      {
        description: 'Automation readiness implementation',
        quantity: 1,
        unitPrice: 2900,
        vatRate: 0.19,
      },
    ],
  },
  {
    invoiceNumber: 'SA-INV-2026-007',
    status: 'DRAFT',
    clientName: 'Neue Fabrik AG',
    notes: 'GoBD compliance training for production team',
    ownerKey: 'accountant',
    date: '2026-03-15',
    dueDate: '2026-03-29',
    items: [
      {
        description: 'GoBD compliance training (15 pax)',
        quantity: 15,
        unitPrice: 120,
        vatRate: 0.19,
      },
    ],
  },
  {
    invoiceNumber: 'SA-INV-2026-008',
    status: 'PARTIALLY_PAID',
    clientName: 'Kunsthaus Verlag GmbH',
    notes: 'Reduced rate supply of compliance manuals',
    ownerKey: 'accountant',
    date: '2026-03-24',
    dueDate: '2026-04-07',
    items: [
      {
        description: 'Custom printed compliance manuals',
        quantity: 200,
        unitPrice: 3.5,
        vatRate: 0.07,
      },
    ],
  },
  {
    invoiceNumber: 'SA-INV-2026-009',
    status: 'PAID',
    clientName: 'Nordlicht Maschinenbau',
    notes: 'AI audit automation pilot deployment',
    ownerKey: 'admin',
    date: '2026-04-02',
    dueDate: '2026-04-16',
    items: [
      { description: 'AI audit automation pilot', quantity: 1, unitPrice: 4200, vatRate: 0.19 },
    ],
  },
  {
    invoiceNumber: 'SA-INV-2026-010',
    status: 'DRAFT',
    clientName: 'Golden Mitte Ventures',
    notes: 'Interim controller support (12 days)',
    ownerKey: 'accountant',
    date: '2026-04-10',
    dueDate: '2026-04-24',
    items: [
      {
        description: 'Interim controller support (12d)',
        quantity: 12,
        unitPrice: 180,
        vatRate: 0.19,
      },
    ],
  },
  {
    invoiceNumber: 'SA-INV-2026-011',
    status: 'PARTIALLY_PAID',
    clientName: 'Märkisches Ventures GmbH',
    notes: 'Reporting dashboard design',
    ownerKey: 'accountant',
    date: '2026-04-16',
    dueDate: '2026-04-30',
    items: [
      { description: 'Reporting dashboard design', quantity: 10, unitPrice: 300, vatRate: 0.19 },
    ],
  },
  {
    invoiceNumber: 'SA-INV-2026-012',
    status: 'PAID',
    clientName: 'Brandenburg Creative GmbH',
    notes: 'Cultural sponsorship retreat invoice',
    ownerKey: 'admin',
    date: '2026-04-27',
    dueDate: '2026-05-11',
    items: [
      { description: 'Kultur sponsorship retreat', quantity: 1, unitPrice: 1800, vatRate: 0.07 },
    ],
  },
];

const EXPENSE_TEMPLATES = [
  {
    description: 'Berlin HQ rent February',
    vendorName: 'Spree Immobilien GmbH',
    expenseDate: '2026-02-03',
    category: 'Rent',
    netAmount: 2400,
    vatRate: 0.19,
    status: 'booked',
    source: 'bank',
    ownerKey: 'admin',
    notes: 'February rent for demonstration HQ',
  },
  {
    description: 'CloudPort analytics subscription',
    vendorName: 'CloudPort GmbH',
    expenseDate: '2026-02-07',
    category: 'Subscriptions',
    netAmount: 320,
    vatRate: 0.19,
    status: 'booked',
    source: 'bank',
    ownerKey: 'accountant',
    notes: 'Monthly analytics + reporting workspace',
  },
  {
    description: 'Client travel Berlin',
    vendorName: 'Berlin Travel AG',
    expenseDate: '2026-02-12',
    category: 'Travel',
    netAmount: 650,
    vatRate: 0.19,
    status: 'booked',
    source: 'manual',
    ownerKey: 'accountant',
    notes: 'Travel for investor prep sessions',
  },
  {
    description: 'Workstation upgrade',
    vendorName: 'Techhaus Berlin',
    expenseDate: '2026-02-18',
    category: 'Hardware',
    netAmount: 1100,
    vatRate: 0.19,
    status: 'booked',
    source: 'bank',
    ownerKey: 'admin',
    notes: 'Workstation upgrade for demo HQ',
  },
  {
    description: 'Quarterly compliance scans',
    vendorName: 'Guardrail GmbH',
    expenseDate: '2026-04-06',
    category: 'Subscriptions',
    netAmount: 310,
    vatRate: 0.19,
    status: 'booked',
    source: 'bank',
    ownerKey: 'accountant',
    notes: 'Quarterly compliance scans',
  },
  {
    description: 'Portable projectors',
    vendorName: 'MediaWerk AG',
    expenseDate: '2026-04-10',
    category: 'Hardware',
    netAmount: 980,
    vatRate: 0.19,
    status: 'booked',
    source: 'bank',
    ownerKey: 'admin',
    notes: 'Projectors for client workshops',
  },
  {
    description: 'Investor meeting travel',
    vendorName: 'HafenCity Mobility GmbH',
    expenseDate: '2026-04-13',
    category: 'Travel',
    netAmount: 540,
    vatRate: 0.19,
    status: 'booked',
    source: 'manual',
    ownerKey: 'accountant',
    notes: 'Travel for investor meetings',
  },
  {
    description: 'Document automation suite',
    vendorName: 'PaperTrail GmbH',
    expenseDate: '2026-04-17',
    category: 'Subscriptions',
    netAmount: 270,
    vatRate: 0.19,
    status: 'draft',
    source: 'upload',
    ownerKey: 'accountant',
    notes: 'Document automation pilot',
  },
  {
    description: 'Server rack maintenance',
    vendorName: 'DataCore Services',
    expenseDate: '2026-04-21',
    category: 'Hardware',
    netAmount: 620,
    vatRate: 0.19,
    status: 'booked',
    source: 'bank',
    ownerKey: 'admin',
    notes: 'Monthly server maintenance',
  },
  {
    description: 'ChatOps monitoring',
    vendorName: 'OpsRadar AG',
    expenseDate: '2026-04-22',
    category: 'Subscriptions',
    netAmount: 340,
    vatRate: 0.19,
    status: 'archived',
    source: 'upload',
    ownerKey: 'accountant',
    notes: 'operational monitoring trial',
  },
  {
    description: 'Compliance conference',
    vendorName: 'EventMobil',
    expenseDate: '2026-04-25',
    category: 'Travel',
    netAmount: 610,
    vatRate: 0.19,
    status: 'booked',
    source: 'manual',
    ownerKey: 'accountant',
    notes: 'Conference travel and accommodation',
  },
  {
    description: 'Loaner tablets',
    vendorName: 'Techhaus Berlin',
    expenseDate: '2026-04-28',
    category: 'Hardware',
    netAmount: 780,
    vatRate: 0.19,
    status: 'booked',
    source: 'bank',
    ownerKey: 'admin',
    notes: 'Tablets for client demos',
  },
];

const BANK_STATEMENT_TEMPLATE = {
  fileName: 'smartaccounting-demo-statement.csv',
  fileFormat: 'csv',
  filePath: '/tmp/smartaccounting-demo-statement.csv',
  bankName: 'SmartBank Berlin',
  accountNumber: '123456789',
  iban: 'DE12120300000012345678',
  statementPeriodStart: '2026-02-01',
  statementPeriodEnd: '2026-04-30',
  statementDate: '2026-04-30',
  openingBalance: 18450.0,
  closingBalance: 21130.0,
  currency: 'EUR',
  status: 'PROCESSED',
  totalTransactions: 25,
  processedTransactions: 25,
  importDate: '2026-05-01',
};

const BANK_TRANSACTION_SPECS = [
  {
    label: 'Payment SA-INV-2026-001',
    matchReference: 'SA-INV-2026-001',
    transactionDate: '2026-02-15',
    valueDate: '2026-02-15',
    description: 'Incoming payment from NordWest Logistics GmbH',
    transactionType: 'CREDIT',
    category: 'REVENUE',
    vatCategory: 'VAT_19',
    counterpartyName: 'NordWest Logistics GmbH',
    matchFraction: 1,
  },
  {
    label: 'Payment SA-INV-2026-004',
    matchReference: 'SA-INV-2026-004',
    transactionDate: '2026-03-06',
    valueDate: '2026-03-06',
    description: 'Fjord Data Solutions settlement',
    transactionType: 'CREDIT',
    category: 'REVENUE',
    vatCategory: 'VAT_19',
    counterpartyName: 'Fjord Data Solutions GmbH',
    matchFraction: 1,
  },
  {
    label: 'Payment SA-INV-2026-006',
    matchReference: 'SA-INV-2026-006',
    transactionDate: '2026-03-25',
    valueDate: '2026-03-25',
    description: 'Northwind Analytics payment',
    transactionType: 'CREDIT',
    category: 'REVENUE',
    vatCategory: 'VAT_19',
    counterpartyName: 'Northwind Analytics GmbH',
    matchFraction: 1,
  },
  {
    label: 'Payment SA-INV-2026-009',
    matchReference: 'SA-INV-2026-009',
    transactionDate: '2026-04-15',
    valueDate: '2026-04-15',
    description: 'Nordlicht Maschinenbau pilot invoice',
    transactionType: 'CREDIT',
    category: 'REVENUE',
    vatCategory: 'VAT_19',
    counterpartyName: 'Nordlicht Maschinenbau',
    matchFraction: 1,
  },
  {
    label: 'Payment SA-INV-2026-012',
    matchReference: 'SA-INV-2026-012',
    transactionDate: '2026-05-09',
    valueDate: '2026-05-09',
    description: 'Brandenburg Creative cultural event',
    transactionType: 'CREDIT',
    category: 'REVENUE',
    vatCategory: 'VAT_07',
    counterpartyName: 'Brandenburg Creative GmbH',
    matchFraction: 1,
  },
  {
    label: 'Partial payment SA-INV-2026-002',
    matchReference: 'SA-INV-2026-002',
    transactionReference: 'SA-INV-2026-002-PARTIAL-1',
    transactionDate: '2026-02-16',
    valueDate: '2026-02-16',
    description: 'Partial payment from Berlin BioTech',
    transactionType: 'CREDIT',
    category: 'REVENUE',
    vatCategory: 'VAT_19',
    counterpartyName: 'Berlin BioTech GmbH',
    matchFraction: 0.4,
  },
  {
    label: 'First partial SA-INV-2026-005',
    matchReference: 'SA-INV-2026-005',
    transactionReference: 'SA-INV-2026-005-PARTIAL-1',
    transactionDate: '2026-03-18',
    valueDate: '2026-03-18',
    description: 'First instalment from Märkisches Ventures',
    transactionType: 'CREDIT',
    category: 'REVENUE',
    vatCategory: 'VAT_19',
    counterpartyName: 'Märkisches Ventures GmbH',
    matchFraction: 0.6,
  },
  {
    label: 'Second partial SA-INV-2026-005',
    matchReference: 'SA-INV-2026-005',
    transactionReference: 'SA-INV-2026-005-PARTIAL-2',
    transactionDate: '2026-03-28',
    valueDate: '2026-03-28',
    description: 'Additional instalment from Märkisches Ventures',
    transactionType: 'CREDIT',
    category: 'REVENUE',
    vatCategory: 'VAT_19',
    counterpartyName: 'Märkisches Ventures GmbH',
    matchFraction: 0.3,
  },
  {
    label: 'Partial payment SA-INV-2026-011',
    matchReference: 'SA-INV-2026-011',
    transactionReference: 'SA-INV-2026-011-PARTIAL-1',
    transactionDate: '2026-05-02',
    valueDate: '2026-05-02',
    description: 'Partial payment for reporting dashboard',
    transactionType: 'CREDIT',
    category: 'REVENUE',
    vatCategory: 'VAT_19',
    counterpartyName: 'Märkisches Ventures GmbH',
    matchFraction: 0.55,
  },
  {
    label: 'Intro payment SA-INV-2026-008',
    matchReference: 'SA-INV-2026-008',
    transactionReference: 'SA-INV-2026-008-PARTIAL-1',
    transactionDate: '2026-04-05',
    valueDate: '2026-04-05',
    description: 'Initial payment for printed manuals',
    transactionType: 'CREDIT',
    category: 'REVENUE',
    vatCategory: 'VAT_07',
    counterpartyName: 'Kunsthaus Verlag GmbH',
    matchFraction: 0.2,
  },
  {
    label: 'Rent February debit',
    matchReference: 'Berlin HQ rent February',
    transactionDate: '2026-02-03',
    valueDate: '2026-02-04',
    description: 'Rent payout to Spree Immobilien',
    transactionType: 'DEBIT',
    category: 'RENT',
    vatCategory: 'VAT_19',
    counterpartyName: 'Spree Immobilien GmbH',
  },
  {
    label: 'CloudPort debit',
    matchReference: 'CloudPort analytics subscription',
    transactionDate: '2026-02-08',
    valueDate: '2026-02-09',
    description: 'CloudPort analytics subscription charge',
    transactionType: 'DEBIT',
    category: 'SUBSCRIPTIONS',
    vatCategory: 'VAT_19',
    counterpartyName: 'CloudPort GmbH',
  },
  {
    label: 'Travel Berlin debit',
    matchReference: 'Client travel Berlin',
    transactionDate: '2026-02-13',
    valueDate: '2026-02-14',
    description: 'Travel payout for Berlin client visit',
    transactionType: 'DEBIT',
    category: 'TRAVEL',
    vatCategory: 'VAT_19',
    counterpartyName: 'Berlin Travel AG',
  },
  {
    label: 'Workstation upgrade debit',
    matchReference: 'Workstation upgrade',
    transactionDate: '2026-02-18',
    valueDate: '2026-02-19',
    description: 'Payment to Techhaus Berlin for workstations',
    transactionType: 'DEBIT',
    category: 'HARDWARE',
    vatCategory: 'VAT_19',
    counterpartyName: 'Techhaus Berlin',
  },
  {
    label: 'Rent March debit',
    matchReference: 'Berlin HQ rent March',
    transactionDate: '2026-03-05',
    valueDate: '2026-03-06',
    description: 'March rent payout',
    transactionType: 'DEBIT',
    category: 'RENT',
    vatCategory: 'VAT_19',
    counterpartyName: 'Spree Immobilien GmbH',
  },
  {
    label: 'AI insights platform debit',
    matchReference: 'AI insights platform',
    transactionDate: '2026-03-13',
    valueDate: '2026-03-14',
    description: 'InsightDrive subscription charge',
    transactionType: 'DEBIT',
    category: 'SUBSCRIPTIONS',
    vatCategory: 'VAT_19',
    counterpartyName: 'InsightDrive GmbH',
  },
  {
    label: 'Office monitors debit',
    matchReference: 'Office monitors',
    transactionDate: '2026-03-15',
    valueDate: '2026-03-16',
    description: 'DisplayPro monitors purchase',
    transactionType: 'DEBIT',
    category: 'HARDWARE',
    vatCategory: 'VAT_19',
    counterpartyName: 'DisplayPro Berlin',
  },
  {
    label: 'Summit hospitality debit',
    matchReference: 'Berlin summit hospitality',
    transactionDate: '2026-03-26',
    valueDate: '2026-03-27',
    description: 'EventMobil catering payment',
    transactionType: 'DEBIT',
    category: 'TRAVEL',
    vatCategory: 'VAT_07',
    counterpartyName: 'EventMobil',
  },
  {
    label: 'Rent April debit',
    matchReference: 'Berlin HQ rent April',
    transactionDate: '2026-04-04',
    valueDate: '2026-04-05',
    description: 'April rent payment',
    transactionType: 'DEBIT',
    category: 'RENT',
    vatCategory: 'VAT_19',
    counterpartyName: 'Spree Immobilien GmbH',
  },
  {
    label: 'Security scan debit',
    matchReference: 'Security compliance scans',
    transactionDate: '2026-04-07',
    valueDate: '2026-04-08',
    description: 'Guardrail compliance scan',
    transactionType: 'DEBIT',
    category: 'SUBSCRIPTIONS',
    vatCategory: 'VAT_19',
    counterpartyName: 'Guardrail GmbH',
  },
  {
    label: 'Portable projectors debit',
    matchReference: 'Portable projectors',
    transactionDate: '2026-04-14',
    valueDate: '2026-04-15',
    description: 'MediaWerk projector purchase',
    transactionType: 'DEBIT',
    category: 'HARDWARE',
    vatCategory: 'VAT_19',
    counterpartyName: 'MediaWerk AG',
  },
  {
    label: 'Momentum Ventures prepayment',
    transactionDate: '2026-04-01',
    valueDate: '2026-04-01',
    description: 'Momentum Ventures prepayment',
    transactionType: 'CREDIT',
    category: 'REVENUE',
    vatCategory: 'VAT_19',
    counterpartyName: 'Momentum Ventures GmbH',
    amountOverride: 4200,
  },
  {
    label: 'Tax refund 2025',
    transactionDate: '2026-03-29',
    valueDate: '2026-03-29',
    description: 'Refund from Federal Customs',
    transactionType: 'CREDIT',
    category: 'REVENUE',
    vatCategory: 'VAT_19',
    counterpartyName: 'Bundesfinanzministerium',
    amountOverride: 1890,
  },
  {
    label: 'Office snacks order',
    transactionDate: '2026-04-09',
    valueDate: '2026-04-09',
    description: 'Snacks for office team',
    transactionType: 'DEBIT',
    category: 'SUPPLIES',
    vatCategory: 'VAT_19',
    counterpartyName: 'Berlin Bistro GmbH',
    amountOverride: 260,
  },
  {
    label: 'Consultant deposit Berlin',
    transactionDate: '2026-03-30',
    valueDate: '2026-03-30',
    description: 'Consultant deposit for Berlin visit',
    transactionType: 'DEBIT',
    category: 'SERVICES',
    vatCategory: 'VAT_19',
    counterpartyName: 'Freelance Berlin',
    amountOverride: 980,
  },
  {
    label: 'Facility cleaning',
    transactionDate: '2026-04-26',
    valueDate: '2026-04-26',
    description: 'Facility cleaning service',
    transactionType: 'DEBIT',
    category: 'FACILITY',
    vatCategory: 'VAT_19',
    counterpartyName: 'CleanSpace AG',
    amountOverride: 540,
  },
];

const AI_INSIGHT_RULES = {
  latePayment: 'demo:late-payment-risk',
  vatAnomaly: 'demo:vat-anomaly-detection',
  duplicateInvoice: 'demo:duplicate-invoice-suspicion',
};

const TAX_PERIOD_TARGETS = [
  { quarter: 1, year: 2026, status: 'draft', elsterStatus: 'pending', ticket: 'DEMO-ELSTER-Q1' },
  {
    quarter: 2,
    year: 2026,
    status: 'submitted',
    elsterStatus: 'submitted',
    ticket: 'DEMO-ELSTER-Q2',
  },
];

const AUDIT_LOG_REASONS = {
  company: 'demo:company',
  user: 'demo:user',
  invoice: 'demo:invoice',
  expense: 'demo:expense',
  transaction: 'demo:transaction',
  bankStatement: 'demo:bank-statement',
  bankTransaction: 'demo:bank-transaction',
  taxReport: 'demo:tax-report',
  aiInsight: 'demo:ai-insight',
};

const requireDemoSeedEnabled = (phase) => {
  const demoModeEnabled = process.env.DEMO_MODE === 'true';
  const demoSeedAllowed = process.env.ALLOW_DEMO_SEED === 'true';
  if (!demoModeEnabled || !demoSeedAllowed) {
    throw new Error(
      `[DEMO SEED] ${phase}: requires DEMO_MODE=true and ALLOW_DEMO_SEED=true (DEMO_MODE=${process.env.DEMO_MODE}, ALLOW_DEMO_SEED=${process.env.ALLOW_DEMO_SEED})`,
    );
  }
};

const formatMoney = (value) => Number(Number(value || 0).toFixed(2));

const prepareEvidenceValue = (value) => {
  if (value === undefined || value === null) {
    return null;
  }
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
};

const buildInvoiceItems = (items = []) =>
  (items || []).map((item) => {
    const quantity = Number(item.quantity || 1);
    const unitPrice = Number(item.unitPrice || 0);
    const vatRate = Number(item.vatRate || 0);
    const lineNet = formatMoney(quantity * unitPrice);
    const lineVat = formatMoney(lineNet * vatRate);
    const lineGross = formatMoney(lineNet + lineVat);
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

function buildDemoInvoice(template, userId, companyId, now) {
  const items = buildInvoiceItems(template.items || []);
  const subtotal = formatMoney(items.reduce((total, item) => total + item.lineNet, 0));
  const totalGross = formatMoney(items.reduce((total, item) => total + item.lineGross, 0));
  return {
    invoice: {
      invoiceNumber: template.invoiceNumber,
      subtotal,
      total: totalGross,
      amount: totalGross,
      currency: 'EUR',
      status: template.status.toUpperCase(),
      date: template.date,
      dueDate: template.dueDate,
      clientName: template.clientName,
      notes: template.notes,
      userId,
      companyId,
      createdAt: now,
      updatedAt: now,
    },
    items,
  };
}

const insertRecordAndReturnId = async (
  queryInterface,
  tableName,
  record,
  fallbackQuery,
  fallbackReplacements = {},
  options = {},
) => {
  const bulkInsertOptions = { ...options };
  if (queryInterface.sequelize.getDialect() === 'postgres') {
    bulkInsertOptions.returning = true;
  }
  const qi = getQI(queryInterface);
  const insertionResult = await qi.bulkInsert(tableName, [record], bulkInsertOptions);
  if (Array.isArray(insertionResult) && insertionResult.length > 0) {
    return insertionResult[0].id;
  }
  if (fallbackQuery) {
    const queryOptions = { replacements: fallbackReplacements };
    if (bulkInsertOptions.transaction) {
      queryOptions.transaction = bulkInsertOptions.transaction;
    }
    const [rows] = await queryInterface.sequelize.query(fallbackQuery, queryOptions);
    return rows.length > 0 ? rows[0].id : null;
  }
  return null;
};

const ensurePartialPaymentTransaction = async ({
  queryInterface,
  spec,
  amount,
  companyId,
  ownerId,
  now,
  transactionIdByReference,
}) => {
  const reference = spec.transactionReference;
  if (!reference) {
    return null;
  }
  if (transactionIdByReference[reference]) {
    return transactionIdByReference[reference];
  }
  const transactionPayload = {
    id: uuidv4(),
    company_id: companyId,
    user_id: ownerId || null,
    transaction_date: spec.transactionDate,
    description: spec.description,
    amount,
    currency: 'EUR',
    type: 'income',
    category: spec.category || 'REVENUE',
    vat_rate: null,
    vat_amount: null,
    reference,
    non_deductible: false,
    credit_amount: amount,
    debit_amount: null,
    is_reconciled: false,
    created_at: now,
    updated_at: now,
  };
  const partialTransactionId = await insertRecordAndReturnId(
    queryInterface,
    'transactions',
    transactionPayload,
    'SELECT id FROM transactions WHERE reference = :reference AND company_id = :companyId LIMIT 1;',
    { reference, companyId },
  );
  transactionIdByReference[reference] = partialTransactionId;
  return partialTransactionId;
};

const logAuditEntry = async ({ action, resourceType, resourceId, newValues, reason, userId }) => {
  await AuditLogService.appendEntry({
    action,
    resourceType,
    resourceId,
    userId,
    newValues,
    reason,
    ipAddress: '127.0.0.1',
    userAgent: 'DemoSeed/1.0',
  });
};

const getQuarterKey = (dateString) => {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  const year = date.getFullYear();
  const quarter = Math.floor(date.getMonth() / 3) + 1;
  return `${year}-Q${quarter}`;
};

module.exports = {
  up: async (queryInterface, _Sequelize) => {
    requireDemoSeedEnabled('up');
    console.log(`[DEMO SEED] Demo password: ${DEMO_PASSWORD}`);
    // --- QueryInterface runtime guard ---
    const qi =
      queryInterface && typeof queryInterface.bulkInsert === 'function'
        ? queryInterface
        : queryInterface?.sequelize?.getQueryInterface?.() ||
          queryInterface?.getQueryInterface?.() ||
          null;
    if (!qi) {
      throw new Error('[DEMO SEED] Invalid queryInterface passed to seeder');
    }
    const now = new Date();
    // ...existing code...
    let companyId;
    let companyCreated = false;
    const [existingCompanies] = await qi.sequelize.query(
      'SELECT id FROM companies WHERE "taxId" = :taxId LIMIT 1;',
      { replacements: { taxId: DEMO_COMPANY.taxId } },
    );
    if (existingCompanies.length > 0) {
      companyId = existingCompanies[0].id;
      console.log('[DEMO SEED] Demo company already exists.');
    } else {
      const companyPayload = {
        name: DEMO_COMPANY.name,
        address: DEMO_COMPANY.address,
        city: DEMO_COMPANY.city,
        postalCode: DEMO_COMPANY.postalCode,
        country: DEMO_COMPANY.country,
        taxId: DEMO_COMPANY.taxId,
        aiEnabled: DEMO_COMPANY.aiEnabled,
        subscriptionStatus: DEMO_COMPANY.subscriptionStatus,
        subscriptionPlan: DEMO_COMPANY.subscriptionPlan,
        createdAt: now,
        updatedAt: now,
      };
      assertKeysMatch(
        companyPayload,
        [
          'name',
          'taxId',
          'address',
          'city',
          'postalCode',
          'country',
          'aiEnabled',
          'subscriptionStatus',
          'subscriptionPlan',
          'createdAt',
          'updatedAt',
        ],
        'companies',
      );
      // Always use QueryInterface.bulkInsert for companies
      const [existing] = await qi.sequelize.query(
        'SELECT id FROM companies WHERE "taxId" = :taxId LIMIT 1;',
        { replacements: { taxId: DEMO_COMPANY.taxId } },
      );
      if (!existing.length) {
        await qi.bulkInsert('companies', [companyPayload], {});
        const [created] = await qi.sequelize.query(
          'SELECT id FROM companies WHERE "taxId" = :taxId LIMIT 1;',
          { replacements: { taxId: DEMO_COMPANY.taxId } },
        );
        companyId = created[0].id;
        companyCreated = true;
        console.log('[DEMO SEED] Demo company created.');
      } else {
        companyId = existing[0].id;
        console.log('[DEMO SEED] Demo company already exists.');
      }
    }

    // === DEMO USERS ===
    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
    const userMap = {};
    for (const template of DEMO_USERS) {
      const userPayload = {
        email: template.email,
        firstName: template.firstName,
        lastName: template.lastName,
        role: template.role,
        password: passwordHash,
        companyId,
        isActive: true,
        isAnonymized: false,
        anonymizedAt: null,
        createdAt: now,
        updatedAt: now,
      };
      assertKeysMatch(
        userPayload,
        [
          'email',
          'firstName',
          'lastName',
          'role',
          'password',
          'companyId',
          'isActive',
          'isAnonymized',
          'anonymizedAt',
          'createdAt',
          'updatedAt',
        ],
        'users',
      );
      const [existingUsers] = await qi.sequelize.query(
        'SELECT id FROM users WHERE email = :email LIMIT 1;',
        { replacements: { email: template.email } },
      );
      if (existingUsers.length === 0) {
        await qi.bulkInsert('users', [userPayload], {});
        console.log(`[DEMO SEED] Created user ${template.email}`);
      } else {
        console.log(`[DEMO SEED] User already exists ${template.email}`);
      }
      const [rows] = await queryInterface.sequelize.query(
        'SELECT id FROM users WHERE email = :email LIMIT 1;',
        { replacements: { email: template.email } },
      );
      if (rows.length === 0) {
        throw new Error(`[DEMO SEED] Unable to resolve user ${template.email}`);
      }
      userMap[template.role] = rows[0].id;
    }

    const systemAdminPayload = {
      email: SYSTEM_ADMIN_USER.email,
      firstName: SYSTEM_ADMIN_USER.firstName,
      lastName: SYSTEM_ADMIN_USER.lastName,
      role: SYSTEM_ADMIN_USER.role,
      password: passwordHash,
      companyId: null,
      isActive: true,
      isAnonymized: false,
      anonymizedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    assertKeysMatch(
      systemAdminPayload,
      [
        'email',
        'firstName',
        'lastName',
        'role',
        'password',
        'companyId',
        'isActive',
        'isAnonymized',
        'anonymizedAt',
        'createdAt',
        'updatedAt',
      ],
      'users',
    );
    const [existingSystemAdmin] = await qi.sequelize.query(
      'SELECT id FROM users WHERE email = :email LIMIT 1;',
      { replacements: { email: SYSTEM_ADMIN_USER.email } },
    );
    if (existingSystemAdmin.length === 0) {
      await qi.bulkInsert('users', [systemAdminPayload], {});
      console.log(`[DEMO SEED] Created system admin ${SYSTEM_ADMIN_USER.email}`);
    } else {
      console.log(`[DEMO SEED] System admin already exists ${SYSTEM_ADMIN_USER.email}`);
    }

    if (companyCreated && userMap.admin) {
      await logAuditEntry({
        action: 'company_created',
        resourceType: 'company',
        resourceId: DEMO_COMPANY.name,
        userId: userMap.admin,
        newValues: { taxId: DEMO_COMPANY.taxId },
        reason: AUDIT_LOG_REASONS.company,
      });
    }

    // === DEMO INVOICES ===
    const invoiceSummaries = [];
    const invoiceIdByNumber = {};
    for (const template of INVOICE_TEMPLATES) {
      const [existingInvoices] = await queryInterface.sequelize.query(
        'SELECT id FROM invoices WHERE "invoiceNumber" = :invoiceNumber AND "companyId" = :companyId LIMIT 1;',
        { replacements: { invoiceNumber: template.invoiceNumber, companyId } },
      );
      const ownerId = userMap[template.ownerKey] || userMap.accountant;
      const { invoice: invoicePayloadRaw, items } = buildDemoInvoice(
        template,
        ownerId,
        companyId,
        now,
      );
      // Normalize invoice payload to snake_case
      const invoicePayload = {
        ...invoicePayloadRaw,
        userId: invoicePayloadRaw.userId,
        companyId: invoicePayloadRaw.companyId,
        createdAt: invoicePayloadRaw.createdAt,
        updatedAt: invoicePayloadRaw.updatedAt,
      };
      assertKeysMatch(
        invoicePayload,
        [
          'invoiceNumber',
          'subtotal',
          'total',
          'amount',
          'currency',
          'status',
          'date',
          'dueDate',
          'clientName',
          'notes',
          'userId',
          'companyId',
          'createdAt',
          'updatedAt',
        ],
        'invoices',
      );
      let invoiceId;
      if (existingInvoices.length === 0) {
        invoiceId = await insertRecordAndReturnId(
          queryInterface,
          'invoices',
          invoicePayload,
          'SELECT id FROM invoices WHERE "invoiceNumber" = :invoiceNumber AND "companyId" = :companyId LIMIT 1;',
          { invoiceNumber: template.invoiceNumber, companyId },
        );
        // === INVOICE ITEMS ===
        const invoiceItemsPayload = items.map((item) => ({
          id: uuidv4(),
          invoiceId,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          vatRate: item.vatRate,
          lineNet: item.lineNet,
          lineVat: item.lineVat,
          lineGross: item.lineGross,
          createdAt: now,
          updatedAt: now,
        }));

        assertKeysMatch(
          invoiceItemsPayload[0],
          [
            'id',
            'invoiceId',
            'description',
            'quantity',
            'unitPrice',
            'vatRate',
            'lineNet',
            'lineVat',
            'lineGross',
            'createdAt',
            'updatedAt',
          ],
          'invoice_items',
        );

        await qi.bulkInsert('invoice_items', invoiceItemsPayload, {});
        console.log(`[DEMO SEED] Invoice items inserted (${invoiceItemsPayload.length})`);

        await logAuditEntry({
          action: 'invoice_created',
          resourceType: 'invoice',
          resourceId: template.invoiceNumber,
          userId: ownerId,
          newValues: { status: invoicePayload.status, total: invoicePayload.total },
          reason: AUDIT_LOG_REASONS.invoice,
        });
        console.log(`[DEMO SEED] Invoice seeded: ${template.invoiceNumber}`);
      } else {
        invoiceId = existingInvoices[0].id;
        console.log(`[DEMO SEED] Invoice already exists: ${template.invoiceNumber}`);
      }
      invoiceIdByNumber[template.invoiceNumber] = invoiceId;
      const totalVat = formatMoney(items.reduce((total, item) => total + item.lineVat, 0));
      invoiceSummaries.push({
        invoiceNumber: template.invoiceNumber,
        id: invoiceId,
        total: invoicePayload.amount,
        vatTotal: totalVat,
        date: template.date,
        dueDate: template.dueDate,
        status: template.status.toUpperCase(),
        ownerId,
        items,
      });
    }

    // === DEMO EXPENSES ===
    const expenseSummaries = [];
    const expenseIdByDescription = {};
    for (const template of EXPENSE_TEMPLATES) {
      const [existingExpenses] = await queryInterface.sequelize.query(
        'SELECT id FROM expenses WHERE description = :description AND "companyId" = :companyId AND "expenseDate" = :expenseDate LIMIT 1;',
        {
          replacements: {
            description: template.description,
            companyId,
            expenseDate: template.expenseDate,
          },
        },
      );
      const ownerId = userMap[template.ownerKey] || userMap.accountant;
      // --- VAT calculation (Germany standard) ---
      // --- VAT calculation (Germany standard, fallback for legacy templates) ---
      const vatRate = typeof template.vatRate === 'number' ? template.vatRate : 0.19;
      let grossAmount, netAmount, vatAmount;
      if (typeof template.amount === 'number') {
        // If amount (gross) is provided, calculate net and vat
        grossAmount = Number(template.amount);
        netAmount = Number((grossAmount / (1 + vatRate)).toFixed(2));
        vatAmount = Number((grossAmount - netAmount).toFixed(2));
      } else if (typeof template.netAmount === 'number') {
        // If only netAmount is provided, calculate gross and vat
        netAmount = Number(template.netAmount);
        vatAmount = Number((netAmount * vatRate).toFixed(2));
        grossAmount = Number((netAmount + vatAmount).toFixed(2));
      } else {
        throw new Error(
          `[DEMO SEED] Expense template missing amount/netAmount: ${template.description}`,
        );
      }

      const expensePayload = {
        description: template.description,

        // 🔢 Accounting core
        netAmount,
        vatRate,
        vatAmount,
        amount: grossAmount, // gross
        grossAmount,

        currency: 'EUR',
        date: template.expenseDate,
        expenseDate: template.expenseDate,
        category: template.category || 'General',

        // 🔐 Accountability
        userId: ownerId,
        companyId,
        createdByUserId: ownerId,

        // 🧾 Metadata
        source: template.source ?? 'manual',
        status: ['PENDING', 'APPROVED', 'REJECTED'].includes(template.status)
          ? template.status
          : 'PENDING',

        createdAt: now,
        updatedAt: now,
      };

      assertKeysMatch(
        expensePayload,
        [
          'description',
          'netAmount',
          'vatRate',
          'vatAmount',
          'amount',
          'grossAmount',
          'currency',
          'date',
          'expenseDate',
          'category',
          'userId',
          'companyId',
          'createdByUserId',
          'source',
          'status',
          'createdAt',
          'updatedAt',
        ],
        'expenses',
      );
      let expenseId;
      if (existingExpenses.length === 0) {
        expenseId = await insertRecordAndReturnId(
          queryInterface,
          'expenses',
          expensePayload,
          'SELECT id FROM expenses WHERE description = :description AND "companyId" = :companyId AND "expenseDate" = :expenseDate LIMIT 1;',
          {
            description: template.description,
            companyId,
            expenseDate: template.expenseDate,
          },
        );
        await logAuditEntry({
          action: 'expense_created',
          resourceType: 'expense',
          resourceId: template.description,
          userId: ownerId,
          newValues: { amount: expensePayload.amount, category: template.category },
          reason: AUDIT_LOG_REASONS.expense,
        });
        console.log(`[DEMO SEED] Expense seeded: ${template.description}`);
      } else {
        expenseId = existingExpenses[0].id;
        console.log(`[DEMO SEED] Expense already exists: ${template.description}`);
      }
      expenseIdByDescription[template.description] = expenseId;
      expenseSummaries.push({
        description: template.description,
        id: expenseId,
        amount: expensePayload.amount,
        vatAmount: expensePayload.vatAmount,
        expenseDate: template.expenseDate,
        category: template.category,
        userId: ownerId,
      });
    }
  },

  down: async (queryInterface, _Sequelize) => {
    requireDemoSeedEnabled('down');
    const [companies] = await queryInterface.sequelize.query(
      'SELECT id FROM companies WHERE "taxId" = :taxId LIMIT 1;',
      { replacements: { taxId: DEMO_COMPANY.taxId } },
    );
    const companyId = companies.length > 0 ? companies[0].id : null;
    if (!companyId) {
      console.log('[DEMO SEED] Demo company missing during rollback. Nothing to remove.');
      return;
    }

    // Raw SQL delete for audit_logs
    await queryInterface.sequelize.query(
      `DELETE FROM audit_logs WHERE reason IN (${Object.values(AUDIT_LOG_REASONS)
        .map(() => '?')
        .join(', ')})`,
      { replacements: Object.values(AUDIT_LOG_REASONS) },
    );

    const ruleIds = Object.values(AI_INSIGHT_RULES);
    const [insights] = await queryInterface.sequelize.query(
      'SELECT id FROM ai_insights WHERE "companyId" = :companyId AND "ruleId" IN (:ruleIds);',
      { replacements: { companyId, ruleIds } },
    );
    const insightIds = insights.map((row) => row.id);
    if (insightIds.length > 0) {
      await queryInterface.bulkDelete('ai_insight_decisions', { insightId: insightIds }, {});
    }
    await queryInterface.bulkDelete('ai_insights', { companyId, ruleId: ruleIds }, {});

    const periodStrings = TAX_PERIOD_TARGETS.map((period) =>
      JSON.stringify({ quarter: period.quarter, year: period.year }),
    );
    await queryInterface.bulkDelete(
      'tax_reports',
      { companyId, reportType: 'USt', period: periodStrings },
      {},
    );

    const bankTransactionReferences = BANK_TRANSACTION_SPECS.map(
      (spec) => spec.reference || spec.matchReference || spec.label,
    );
    await queryInterface.bulkDelete(
      'bank_transactions',
      { companyId, reference: bankTransactionReferences },
      {},
    );

    await queryInterface.bulkDelete(
      'transactions',
      {
        company_id: companyId,
        reference: [
          ...INVOICE_TEMPLATES.map((t) => t.invoiceNumber),
          ...EXPENSE_TEMPLATES.map((t) => t.description),
        ],
      },
      {},
    );

    await queryInterface.bulkDelete(
      'bank_statements',
      { companyId, fileName: BANK_STATEMENT_TEMPLATE.fileName },
      {},
    );

    await queryInterface.bulkDelete(
      'expenses',
      { companyId, description: EXPENSE_TEMPLATES.map((t) => t.description) },
      {},
    );

    await queryInterface.bulkDelete(
      'invoices',
      { companyId, invoiceNumber: INVOICE_TEMPLATES.map((t) => t.invoiceNumber) },
      {},
    );

    await queryInterface.bulkDelete('users', { email: DEMO_USERS.map((u) => u.email) }, {});
    await queryInterface.bulkDelete('companies', { taxId: DEMO_COMPANY.taxId }, {});

    console.log('[DEMO SEED] Demo data removed.');
  },

  // Export all helpers/constants
  DEMO_PASSWORD,
  DEMO_COMPANY,
  DEMO_USERS,
  INVOICE_TEMPLATES,
  EXPENSE_TEMPLATES,
  BANK_STATEMENT_TEMPLATE,
  BANK_TRANSACTION_SPECS,
  AI_INSIGHT_RULES,
  TAX_PERIOD_TARGETS,
  AUDIT_LOG_REASONS,
  requireDemoSeedEnabled,
  formatMoney,
  prepareEvidenceValue,
  buildInvoiceItems,
  buildDemoInvoice,
  insertRecordAndReturnId,
  ensurePartialPaymentTransaction,
  logAuditEntry,
  getQuarterKey,
};
