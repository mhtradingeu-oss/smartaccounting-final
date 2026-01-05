'use strict';
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
};

const DEMO_USERS = [
  { email: 'admin@demo.de', firstName: 'Svenja', lastName: 'Pilot', role: 'admin' },
  { email: 'accountant@demo.de', firstName: 'Lukas', lastName: 'Thiel', role: 'accountant' },
  { email: 'auditor@demo.de', firstName: 'Freya', lastName: 'Klein', role: 'auditor' },
  { email: 'viewer@demo.de', firstName: 'Jonas', lastName: 'Beck', role: 'viewer' },
];

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
    items: [
      { description: 'Audit readiness review', quantity: 1, unitPrice: 980, vatRate: 0.19 },
    ],
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
    items: [
      { description: 'Fractional CFO hours', quantity: 20, unitPrice: 150, vatRate: 0.19 },
    ],
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
      { description: 'Automation readiness implementation', quantity: 1, unitPrice: 2900, vatRate: 0.19 },
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
      { description: 'GoBD compliance training (15 pax)', quantity: 15, unitPrice: 120, vatRate: 0.19 },
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
      { description: 'Custom printed compliance manuals', quantity: 200, unitPrice: 3.5, vatRate: 0.07 },
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
      { description: 'Interim controller support (12d)', quantity: 12, unitPrice: 180, vatRate: 0.19 },
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
    notes: 'New workstations for engineering',
  },
  {
    description: 'Compliance research tools',
    vendorName: 'Statistica GmbH',
    expenseDate: '2026-02-25',
    category: 'Subscriptions',
    netAmount: 180,
    vatRate: 0.19,
    status: 'draft',
    source: 'upload',
    ownerKey: 'accountant',
    notes: 'Benchmarking research',
  },
  {
    description: 'Berlin HQ rent March',
    vendorName: 'Spree Immobilien GmbH',
    expenseDate: '2026-03-04',
    category: 'Rent',
    netAmount: 2400,
    vatRate: 0.19,
    status: 'booked',
    source: 'bank',
    ownerKey: 'admin',
    notes: 'March rent for demonstration HQ',
  },
  {
    description: 'Client workshop travel',
    vendorName: 'Brandenburger Reisen',
    expenseDate: '2026-03-08',
    category: 'Travel',
    netAmount: 780,
    vatRate: 0.19,
    status: 'booked',
    source: 'bank',
    ownerKey: 'accountant',
    notes: 'Travel for compliance summit',
  },
  {
    description: 'AI insights platform',
    vendorName: 'InsightDrive GmbH',
    expenseDate: '2026-03-11',
    category: 'Subscriptions',
    netAmount: 450,
    vatRate: 0.19,
    status: 'booked',
    source: 'bank',
    ownerKey: 'accountant',
    notes: 'SaaS platform powering ML insights',
  },
  {
    description: 'Office monitors',
    vendorName: 'DisplayPro Berlin',
    expenseDate: '2026-03-14',
    category: 'Hardware',
    netAmount: 650,
    vatRate: 0.19,
    status: 'booked',
    source: 'bank',
    ownerKey: 'admin',
    notes: 'Additional monitors for co-working',
  },
  {
    description: 'Payroll automation',
    vendorName: 'LohnExpress GmbH',
    expenseDate: '2026-03-20',
    category: 'Subscriptions',
    netAmount: 220,
    vatRate: 0.19,
    status: 'draft',
    source: 'upload',
    ownerKey: 'accountant',
    notes: 'Payroll automation verification',
  },
  {
    description: 'Berlin summit hospitality',
    vendorName: 'EventMobil',
    expenseDate: '2026-03-26',
    category: 'Travel',
    netAmount: 420,
    vatRate: 0.07,
    status: 'booked',
    source: 'manual',
    ownerKey: 'accountant',
    notes: 'Catering for compliance summit',
  },
  {
    description: 'Berlin HQ rent April',
    vendorName: 'Spree Immobilien GmbH',
    expenseDate: '2026-04-02',
    category: 'Rent',
    netAmount: 2400,
    vatRate: 0.19,
    status: 'booked',
    source: 'bank',
    ownerKey: 'admin',
    notes: 'April rent for demonstration HQ',
  },
  {
    description: 'Security compliance scans',
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
  { quarter: 2, year: 2026, status: 'submitted', elsterStatus: 'submitted', ticket: 'DEMO-ELSTER-Q2' },
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
  const insertionResult = await queryInterface.bulkInsert(tableName, [record], bulkInsertOptions);
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
    const now = new Date();

    let companyId;
    let companyCreated = false;
    const [existingCompanies] = await queryInterface.sequelize.query(
      'SELECT id FROM companies WHERE "taxId" = :taxId LIMIT 1;',
      { replacements: { taxId: DEMO_COMPANY.taxId } },
    );
    if (existingCompanies.length > 0) {
      companyId = existingCompanies[0].id;
      console.log('[DEMO SEED] Demo company already exists.');
    } else {
      const companyPayload = {
        ...DEMO_COMPANY,
        address: DEMO_COMPANY.address,
        city: DEMO_COMPANY.city,
        postalCode: DEMO_COMPANY.postalCode,
        country: DEMO_COMPANY.country,
        aiEnabled: DEMO_COMPANY.aiEnabled,
        createdAt: now,
        updatedAt: now,
      };
      companyId = await insertRecordAndReturnId(
        queryInterface,
        'companies',
        companyPayload,
        'SELECT id FROM companies WHERE "taxId" = :taxId LIMIT 1;',
        { taxId: DEMO_COMPANY.taxId },
      );
      companyCreated = true;
      console.log('[DEMO SEED] Demo company created.');
    }

    // === DEMO USERS ===
    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
    for (const template of DEMO_USERS) {
      const userPayload = {
        ...template,
        password: passwordHash,
        companyId,
        createdAt: now,
        updatedAt: now,
      };
      const [existingUsers] = await queryInterface.sequelize.query(
        'SELECT id FROM users WHERE email = :email LIMIT 1;',
        { replacements: { email: template.email } },
      );
      if (existingUsers.length === 0) {
        await queryInterface.bulkInsert('users', [userPayload], {});
        console.log(`[DEMO SEED] Created user ${template.email}`);
      } else {
        console.log(`[DEMO SEED] User already exists ${template.email}`);
      }
    }

    const userMap = {};
    for (const template of DEMO_USERS) {
      const [rows] = await queryInterface.sequelize.query(
        'SELECT id FROM users WHERE email = :email LIMIT 1;',
        { replacements: { email: template.email } },
      );
      if (rows.length === 0) {
        throw new Error(`[DEMO SEED] Unable to resolve user ${template.email}`);
      }
      userMap[template.role] = rows[0].id;
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
      const { invoice: invoicePayload, items } = buildDemoInvoice(template, ownerId, companyId, now);
      let invoiceId;
      if (existingInvoices.length === 0) {
        invoiceId = await insertRecordAndReturnId(
          queryInterface,
          'invoices',
          invoicePayload,
          'SELECT id FROM invoices WHERE "invoiceNumber" = :invoiceNumber AND "companyId" = :companyId LIMIT 1;',
          { invoiceNumber: template.invoiceNumber, companyId },
        );
        const itemRecords = items.map((item) => ({
          id: uuidv4(),
          ...item,
          invoiceId,
          createdAt: now,
          updatedAt: now,
        }));
        await queryInterface.bulkInsert('invoice_items', itemRecords, {});
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
      const vatAmount = formatMoney(template.netAmount * template.vatRate);
      const grossAmount = formatMoney(template.netAmount + vatAmount);
      const expensePayload = {
        description: template.description,
        vendorName: template.vendorName,
        expenseDate: template.expenseDate,
        date: template.expenseDate,
        category: template.category,
        netAmount: formatMoney(template.netAmount),
        vatRate: template.vatRate,
        vatAmount,
        grossAmount,
        amount: grossAmount,
        currency: 'EUR',
        status: template.status,
        source: template.source,
        userId: ownerId,
        createdByUserId: ownerId,
        companyId,
        notes: template.notes,
        createdAt: now,
        updatedAt: now,
      };
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

    // === LEDGER TRANSACTIONS ===
    const transactionIdByReference = {};
    for (const summary of invoiceSummaries) {
      const vatRate = summary.items[0]?.vatRate || 0.19;
      const transactionPayload = {
        id: uuidv4(),
        company_id: companyId,
        user_id: summary.ownerId,
        transaction_date: summary.date,
        description: `Invoice ${summary.invoiceNumber} (${summary.status})`,
        amount: summary.total,
        currency: 'EUR',
        type: 'income',
        category: 'REVENUE',
        vat_rate: vatRate,
        vat_amount: summary.vatTotal,
        reference: summary.invoiceNumber,
        non_deductible: false,
        credit_amount: summary.total,
        debit_amount: null,
        is_reconciled: false,
        bank_transaction_id: null,
        created_at: now,
        updated_at: now,
      };
      const [existingTransaction] = await queryInterface.sequelize.query(
        'SELECT id FROM transactions WHERE reference = :reference AND company_id = :companyId LIMIT 1;',
        {
          replacements: {
            reference: summary.invoiceNumber,
            companyId,
          },
        },
      );
      if (existingTransaction.length > 0) {
        transactionIdByReference[summary.invoiceNumber] = existingTransaction[0].id;
        console.log(`[DEMO SEED] Ledger transaction already exists: ${summary.invoiceNumber}`);
        continue;
      }
      await queryInterface.bulkInsert('transactions', [transactionPayload], {});
      transactionIdByReference[summary.invoiceNumber] = transactionPayload.id;
      await logAuditEntry({
        action: 'transaction_created',
        resourceType: 'transaction',
        resourceId: summary.invoiceNumber,
        userId: summary.ownerId,
        newValues: { amount: summary.total, type: 'income' },
        reason: AUDIT_LOG_REASONS.transaction,
      });
    }

    for (const expense of expenseSummaries) {
      const transactionPayload = {
        id: uuidv4(),
        company_id: companyId,
        user_id: expense.userId,
        transaction_date: expense.expenseDate,
        description: expense.description,
        amount: expense.amount,
        currency: 'EUR',
        type: 'expense',
        category: expense.category.toUpperCase(),
        vat_rate: EXPENSE_TEMPLATES.find((x) => x.description === expense.description)?.vatRate || 0,
        vat_amount: expense.vatAmount,
        reference: expense.description,
        non_deductible: false,
        credit_amount: null,
        debit_amount: expense.amount,
        is_reconciled: false,
        bank_transaction_id: null,
        created_at: now,
        updated_at: now,
      };
      const [existingTransaction] = await queryInterface.sequelize.query(
        'SELECT id FROM transactions WHERE reference = :reference AND company_id = :companyId LIMIT 1;',
        {
          replacements: {
            reference: expense.description,
            companyId,
          },
        },
      );
      if (existingTransaction.length > 0) {
        transactionIdByReference[expense.description] = existingTransaction[0].id;
        console.log(`[DEMO SEED] Ledger transaction already exists: ${expense.description}`);
        continue;
      }
      await queryInterface.bulkInsert('transactions', [transactionPayload], {});
      transactionIdByReference[expense.description] = transactionPayload.id;
      await logAuditEntry({
        action: 'transaction_created',
        resourceType: 'transaction',
        resourceId: expense.description,
        userId: expense.userId,
        newValues: { amount: expense.amount, type: 'expense' },
        reason: AUDIT_LOG_REASONS.transaction,
      });
    }

    // === BANK STATEMENT ===
    let bankStatementId;
    const [existingStatements] = await queryInterface.sequelize.query(
      'SELECT id FROM bank_statements WHERE "fileName" = :fileName AND "companyId" = :companyId LIMIT 1;',
      { replacements: { fileName: BANK_STATEMENT_TEMPLATE.fileName, companyId } },
    );
    if (existingStatements.length > 0) {
      bankStatementId = existingStatements[0].id;
      console.log('[DEMO SEED] Bank statement already exists.');
    } else {
      const statementPayload = {
        ...BANK_STATEMENT_TEMPLATE,
        userId: userMap.admin,
        companyId,
        createdAt: now,
        updatedAt: now,
      };
      bankStatementId = await insertRecordAndReturnId(
        queryInterface,
        'bank_statements',
        statementPayload,
        'SELECT id FROM bank_statements WHERE "fileName" = :fileName AND "companyId" = :companyId LIMIT 1;',
        { fileName: BANK_STATEMENT_TEMPLATE.fileName, companyId },
      );
      await logAuditEntry({
        action: 'bank_statement_imported',
        resourceType: 'bank_statement',
        resourceId: BANK_STATEMENT_TEMPLATE.fileName,
        userId: userMap.admin,
        newValues: { totalTransactions: BANK_STATEMENT_TEMPLATE.totalTransactions },
        reason: AUDIT_LOG_REASONS.bankStatement,
      });
      console.log('[DEMO SEED] Bank statement seeded.');
    }

    const bankTransactionIds = {};
    for (const spec of BANK_TRANSACTION_SPECS) {
      const invoiceMatch = invoiceSummaries.find((inv) => inv.invoiceNumber === spec.matchReference);
      const expenseMatch = expenseSummaries.find((exp) => exp.description === spec.matchReference);
      let amount = spec.amountOverride;
      if (!amount && spec.matchReference) {
        const baseAmount = invoiceMatch?.total || expenseMatch?.amount || 0;
        const fraction = spec.matchFraction || 1;
        amount = formatMoney(baseAmount * fraction);
      }
      if (!amount) {
        amount = formatMoney(spec.amountOverride || 0);
      }
      const reconciliationReference = spec.transactionReference || spec.matchReference;
      let reconciledWith = null;
      if (spec.transactionReference) {
        const ownerId = invoiceMatch?.ownerId || userMap.accountant;
        reconciledWith = await ensurePartialPaymentTransaction({
          queryInterface,
          spec,
          amount,
          companyId,
          ownerId,
          now,
          transactionIdByReference,
        });
      } else if (reconciliationReference) {
        reconciledWith = transactionIdByReference[reconciliationReference];
      }
      const bankTxPayload = {
        bankStatementId,
        companyId,
        date: spec.transactionDate,
        value_date: spec.valueDate || spec.transactionDate,
        description: spec.description,
        amount,
        currency: 'EUR',
        transaction_type: spec.transactionType,
        reference:
          spec.reference || spec.transactionReference || spec.matchReference || spec.label,
        category: spec.category,
        vat_category: spec.vatCategory,
        counterparty_name: spec.counterpartyName,
        is_reconciled: Boolean(reconciledWith),
        reconciled_with: reconciledWith,
        createdAt: now,
        updatedAt: now,
      };
      const [existingBankTx] = await queryInterface.sequelize.query(
        'SELECT id FROM bank_transactions WHERE reference = :reference AND "companyId" = :companyId LIMIT 1;',
        { replacements: { reference: bankTxPayload.reference, companyId } },
      );
      let bankTxId;
      let inserted = false;
      if (existingBankTx.length > 0) {
        bankTxId = existingBankTx[0].id;
        console.log(`[DEMO SEED] Bank transaction already exists: ${bankTxPayload.reference}`);
      } else {
        bankTxId = await insertRecordAndReturnId(
          queryInterface,
          'bank_transactions',
          bankTxPayload,
          'SELECT id FROM bank_transactions WHERE reference = :reference AND "companyId" = :companyId LIMIT 1;',
          { reference: bankTxPayload.reference, companyId },
        );
        inserted = true;
      }
      bankTransactionIds[bankTxPayload.reference] = bankTxId;
      if (reconciledWith) {
        await queryInterface.bulkUpdate(
          'transactions',
          { is_reconciled: true, bank_transaction_id: bankTxId },
          { id: reconciledWith },
          {},
        );
      }
      if (inserted) {
        await logAuditEntry({
          action: 'bank_transaction_imported',
          resourceType: 'bank_transaction',
          resourceId: bankTxPayload.reference,
          userId: userMap.admin,
          newValues: { amount, transactionType: spec.transactionType },
          reason: AUDIT_LOG_REASONS.bankTransaction,
        });
      }
    }

    // === AI INSIGHTS ===
    const aiInsightPayloads = [];
    const lateInvoice = invoiceIdByNumber['SA-INV-2026-002'];
    const latePartialSpec = BANK_TRANSACTION_SPECS.find(
      (spec) => spec.transactionReference === 'SA-INV-2026-002-PARTIAL-1',
    );
    const latePartialInvoice = invoiceSummaries.find(
      (inv) => inv.invoiceNumber === latePartialSpec?.matchReference,
    );
    const latePartialAmount =
      latePartialSpec && latePartialInvoice
        ? formatMoney(latePartialInvoice.total * (latePartialSpec.matchFraction || 1))
        : null;
    const formattedPartialAmount =
      Number.isFinite(latePartialAmount) && latePartialAmount !== null
        ? `${latePartialAmount.toFixed(2)} EUR`
        : 'a partial payment';
    const vatExpense = expenseIdByDescription['Berlin summit hospitality'];
    const duplicateInvoice = invoiceIdByNumber['SA-INV-2026-011'];
    if (lateInvoice) {
      aiInsightPayloads.push({
        companyId,
        entityType: 'invoice',
        entityId: String(lateInvoice),
        type: 'late-payment-risk',
        severity: 'medium',
        confidenceScore: 0.86,
        summary: `SA-INV-2026-002 is overdue despite ${formattedPartialAmount} being reconciled so far.`,
        why: `Due date passed while Berlin BioTech only cleared ${formattedPartialAmount}; GoBD §239 and UStG §14 require tracking the remaining receivable.`,
        legalContext: 'GoBD § 239 and UStG § 14 require tracking outstanding receivables.',
        evidence: prepareEvidenceValue({
          invoiceNumber: 'SA-INV-2026-002',
          dueDate: '2026-02-22',
        }),
        ruleId: AI_INSIGHT_RULES.latePayment,
        modelVersion: 'demo-v1.0',
        featureFlag: 'ai-demo-mode',
        disclaimer: 'Suggestion only — confirm payment status before escalating.',
        createdAt: now,
        updatedAt: now,
      });
    }
    if (vatExpense) {
      aiInsightPayloads.push({
        companyId,
        entityType: 'expense',
        entityId: String(vatExpense),
        type: 'vat-anomaly-detection',
        severity: 'medium',
        confidenceScore: 0.79,
        summary: 'Travel hospitality expense uses reduced VAT rate.',
        why: 'Berlin summit hospitality is booked under Travel but flagged with 7% VAT.',
        legalContext: 'UStG § 14 Abs. 4 requires accurate VAT rate application.',
        evidence: prepareEvidenceValue({
          description: 'Berlin summit hospitality',
          vatRate: 0.07,
          category: 'Travel',
        }),
        ruleId: AI_INSIGHT_RULES.vatAnomaly,
        modelVersion: 'demo-v1.0',
        featureFlag: 'ai-demo-mode',
        disclaimer: 'Suggestion only — confirm vendor invoice and classification.',
        createdAt: now,
        updatedAt: now,
      });
    }
    if (duplicateInvoice) {
      aiInsightPayloads.push({
        companyId,
        entityType: 'invoice',
        entityId: String(duplicateInvoice),
        type: 'duplicate-invoice-suspicion',
        severity: 'low',
        confidenceScore: 0.72,
        summary: 'Second invoice for Märkisches Ventures duplicates the amount of SA-INV-2026-005.',
        why: 'Two invoices for Märkisches Ventures share the same gross amount (3.570 EUR) a few weeks apart.',
        legalContext: 'GoBD § 239 and UStG § 14 on transparent invoicing.',
        evidence: prepareEvidenceValue({
          currentInvoice: 'SA-INV-2026-011',
          similarInvoice: 'SA-INV-2026-005',
          amount: 3570,
        }),
        ruleId: AI_INSIGHT_RULES.duplicateInvoice,
        modelVersion: 'demo-v1.0',
        featureFlag: 'ai-demo-mode',
        disclaimer: 'Suggestion only — validate with the business before marking as duplicate.',
        createdAt: now,
        updatedAt: now,
      });
    }
    for (const payload of aiInsightPayloads) {
      const [existing] = await queryInterface.sequelize.query(
        'SELECT id FROM ai_insights WHERE "ruleId" = :ruleId AND "entityId" = :entityId AND "companyId" = :companyId LIMIT 1;',
        { replacements: { ruleId: payload.ruleId, entityId: payload.entityId, companyId } },
      );
      if (existing.length > 0) {
        continue;
      }
      await insertRecordAndReturnId(
        queryInterface,
        'ai_insights',
        payload,
        'SELECT id FROM ai_insights WHERE "ruleId" = :ruleId AND "entityId" = :entityId AND "companyId" = :companyId LIMIT 1;',
        { ruleId: payload.ruleId, entityId: payload.entityId, companyId },
      );
      await logAuditEntry({
        action: 'ai_insight_generated',
        resourceType: 'ai_insight',
        resourceId: payload.ruleId,
        userId: userMap.admin,
        newValues: { entityId: payload.entityId, type: payload.type },
        reason: AUDIT_LOG_REASONS.aiInsight,
      });
    }

    // === TAX REPORTS ===
    for (const period of TAX_PERIOD_TARGETS) {
      const periodKey = `${period.year}-Q${period.quarter}`;
      const periodString = JSON.stringify({ quarter: period.quarter, year: period.year });
      const invoicesForPeriod = invoiceSummaries.filter(
        (inv) => getQuarterKey(inv.date) === periodKey,
      );
      const expensesForPeriod = expenseSummaries.filter(
        (exp) => getQuarterKey(exp.expenseDate) === periodKey,
      );
      const totalOutputTax = formatMoney(invoicesForPeriod.reduce((sum, inv) => sum + inv.vatTotal, 0));
      const totalInputTax = formatMoney(expensesForPeriod.reduce((sum, exp) => sum + exp.vatAmount, 0));
      const vatPayable = formatMoney(totalOutputTax - totalInputTax);
      const reportData = {
        summary: {
          totalOutputTax,
          totalInputTax,
          vatPayable,
        },
        details: {
          invoiceCount: invoicesForPeriod.length,
          expenseCount: expensesForPeriod.length,
          periodDescription: `Q${period.quarter} ${period.year}`,
        },
      };
      const [existingReports] = await queryInterface.sequelize.query(
        'SELECT id FROM tax_reports WHERE "companyId" = :companyId AND "reportType" = :reportType AND "period" = :period LIMIT 1;',
        {
          replacements: {
            companyId,
            reportType: 'USt',
            period: periodString,
          },
        },
      );
      if (existingReports.length > 0) {
        continue;
      }
      const taxReportPayload = {
        companyId,
        reportType: 'USt',
        period: periodString,
        year: period.year,
        status: period.status,
        data: JSON.stringify(reportData),
        generatedAt: now,
        submittedAt: period.status === 'submitted' ? now : null,
        submittedBy: userMap.accountant,
        elsterStatus: period.elsterStatus,
        elsterTransferTicket: period.ticket,
        createdAt: now,
        updatedAt: now,
      };
      await insertRecordAndReturnId(
        queryInterface,
        'tax_reports',
        taxReportPayload,
        'SELECT id FROM tax_reports WHERE "companyId" = :companyId AND "reportType" = :reportType AND "period" = :period LIMIT 1;',
        {
          companyId,
          reportType: 'USt',
          period: periodString,
        },
      );
      await logAuditEntry({
        action: 'tax_report_created',
        resourceType: 'tax_report',
        resourceId: periodString,
        userId: userMap.accountant,
        newValues: { status: period.status, vatPayable },
        reason: AUDIT_LOG_REASONS.taxReport,
      });
    }

    console.log('[DEMO SEED] Demo data seeding complete.');
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

    await queryInterface.bulkDelete('audit_logs', { reason: Object.values(AUDIT_LOG_REASONS) }, {});

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

    const bankTransactionReferences = BANK_TRANSACTION_SPECS.map((spec) =>
      spec.reference || spec.matchReference || spec.label,
    );
    await queryInterface.bulkDelete(
      'bank_transactions',
      { companyId, reference: bankTransactionReferences },
      {},
    );

    await queryInterface.bulkDelete(
      'transactions',
      { company_id: companyId, reference: [...INVOICE_TEMPLATES.map((t) => t.invoiceNumber), ...EXPENSE_TEMPLATES.map((t) => t.description)] },
      {},
    );

    await queryInterface.bulkDelete('bank_statements', { companyId, fileName: BANK_STATEMENT_TEMPLATE.fileName }, {});

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
};

module.exports.buildInvoiceItems = buildInvoiceItems;
