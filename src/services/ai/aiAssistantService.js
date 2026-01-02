const { sanitizeContext } = require('./contextContract');
const { Company, Invoice, Expense, BankTransaction, AIInsight } = require('../../models');

const MAX_ITEMS = 5;
const DEFAULT_CURRENCY = 'EUR';
const SEVERITY_ORDER = {
  high: 3,
  medium: 2,
  low: 1,
};

const INTENT_LABELS = {
  review: 'What should I review?',
  risks: 'Are there risks?',
  explain_transaction: 'Explain this transaction',
  why_flagged: 'Why is this flagged?',
};

function formatCurrency(value, currency = DEFAULT_CURRENCY, locale = 'de-DE') {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return '';
  }
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(Number(value));
}

function formatDate(value, locale = 'de-DE') {
  if (!value) {
    return '';
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  }).format(date);
}

function formatEvidence(evidence) {
  if (!evidence) {
    return 'Evidence not provided.';
  }
  if (Array.isArray(evidence)) {
    return evidence
      .map((item) => (typeof item === 'object' ? JSON.stringify(item) : String(item)))
      .join('; ');
  }

  if (typeof evidence === 'object') {
    return Object.entries(evidence)
      .map(([key, value]) => `${key}: ${value}`)
      .join('; ');
  }

  return String(evidence);
}

function mapInvoiceRecord(invoice) {
  const plain = invoice.get ? invoice.get({ plain: true }) : invoice;
  return {
    id: plain.id,
    invoiceNumber: plain.invoiceNumber,
    status: plain.status,
    total: plain.total,
    currency: plain.currency,
    date: plain.date,
    dueDate: plain.dueDate,
    clientName: plain.clientName,
  };
}

function mapExpenseRecord(expense) {
  const plain = expense.get ? expense.get({ plain: true }) : expense;
  return {
    id: plain.id,
    description: plain.description,
    vendorName: plain.vendorName,
    status: plain.status,
    grossAmount: plain.grossAmount,
    currency: plain.currency,
    expenseDate: plain.expenseDate,
  };
}

function mapTransactionRecord(transaction) {
  const plain = transaction.get ? transaction.get({ plain: true }) : transaction;
  return {
    id: plain.id,
    description: plain.description,
    amount: plain.amount,
    currency: plain.currency,
    isReconciled: plain.isReconciled,
    transactionDate: plain.transactionDate,
    category: plain.category,
    counterpartyName: plain.counterpartyName,
  };
}

function mapInsightRecord(insight) {
  const plain = insight.get ? insight.get({ plain: true }) : insight;
  return {
    id: plain.id,
    entityType: plain.entityType,
    entityId: plain.entityId,
    type: plain.type,
    severity: plain.severity,
    confidenceScore: plain.confidenceScore,
    summary: plain.summary,
    why: plain.why,
    legalContext: plain.legalContext,
    evidence: plain.evidence,
    ruleId: plain.ruleId,
    disclaimer: plain.disclaimer,
  };
}

function buildContextResponse({ company, invoices, expenses, bankTransactions, insights }) {
  return {
    company,
    invoices,
    expenses,
    bankTransactions,
    insights,
  };
}

async function ensureCompanyAIEnabled(companyId) {
  const company = await Company.findByPk(companyId, {
    attributes: ['id', 'name', 'taxId', 'city', 'country', 'aiEnabled'],
  });
  if (!company) {
    const err = new Error('Company not found');
    err.status = 404;
    throw err;
  }
  if (company.aiEnabled === false) {
    const err = new Error('AI is disabled for this company');
    err.status = 501;
    throw err;
  }
  return company;
}

async function getContext(companyId) {
  const company = await ensureCompanyAIEnabled(companyId);
  const [invoices, expenses, bankTransactions, insights] = await Promise.all([
    Invoice.findAll({
      where: { companyId },
      order: [['date', 'DESC']],
      limit: MAX_ITEMS,
      attributes: [
        'id',
        'invoiceNumber',
        'status',
        'total',
        'currency',
        'date',
        'dueDate',
        'clientName',
      ],
    }),
    Expense.findAll({
      where: { companyId },
      order: [['expenseDate', 'DESC']],
      limit: MAX_ITEMS,
      attributes: [
        'id',
        'description',
        'vendorName',
        'status',
        'grossAmount',
        'currency',
        'expenseDate',
      ],
    }),
    BankTransaction.findAll({
      where: { companyId },
      order: [['transactionDate', 'DESC']],
      limit: MAX_ITEMS,
      attributes: [
        'id',
        'description',
        'amount',
        'currency',
        'isReconciled',
        'transactionDate',
        'category',
        'counterpartyName',
      ],
    }),
    AIInsight.findAll({
      where: { companyId },
      order: [['createdAt', 'DESC']],
      limit: MAX_ITEMS,
    }),
  ]);

  const rawContext = buildContextResponse({
    company: company.get({ plain: true }),
    invoices: invoices.map(mapInvoiceRecord),
    expenses: expenses.map(mapExpenseRecord),
    bankTransactions: bankTransactions.map(mapTransactionRecord),
    insights: insights.map(mapInsightRecord),
  });

  return sanitizeContext(rawContext);
}

function selectInsight(insights = [], insightId) {
  if (!insights.length) {
    return null;
  }
  if (insightId) {
    const matched = insights.find((insight) => insight.id === insightId);
    if (matched) {
      return matched;
    }
  }
  const sorted = [...insights].sort(
    (a, b) => (SEVERITY_ORDER[b.severity] || 0) - (SEVERITY_ORDER[a.severity] || 0),
  );
  return sorted[0];
}

function buildReviewResponse(context) {
  const { company, invoices, bankTransactions, insights } = context;
  const lines = [];

  if (insights.length) {
    const topInsight = selectInsight(insights);
    lines.push(
      `AI insight (${topInsight.type}) on ${topInsight.entityType} ${topInsight.entityId}: ${topInsight.summary}`,
    );
  }

  const overdueInvoice = invoices.find(
    (invoice) => String(invoice.status).toUpperCase() === 'OVERDUE',
  );
  if (overdueInvoice) {
    const text = `Invoice ${overdueInvoice.invoiceNumber} is OVERDUE (due ${formatDate(
      overdueInvoice.dueDate,
    )}) with ${formatCurrency(overdueInvoice.total, overdueInvoice.currency)} outstanding.`;
    lines.push(text);
  }

  const pendingInvoices = invoices.filter(
    (invoice) =>
      ['SENT', 'DRAFT'].includes(String(invoice.status).toUpperCase()) ||
      (!invoice.status && invoice.dueDate && new Date(invoice.dueDate) < new Date()),
  );
  if (pendingInvoices.length) {
    const pending = pendingInvoices[0];
    lines.push(
      `Pending invoice ${pending.invoiceNumber} (status: ${pending.status || 'pending'}) for ${formatCurrency(
        pending.total,
        pending.currency,
      )}.`,
    );
  }

  const unreconciled = bankTransactions.filter((tx) => !tx.isReconciled);
  if (unreconciled.length) {
    const topUnreconciled = unreconciled[0];
    lines.push(
      `Unreconciled bank transaction on ${formatDate(topUnreconciled.transactionDate)} (${topUnreconciled.description}) for ${formatCurrency(
        topUnreconciled.amount,
        topUnreconciled.currency,
      )}.`,
    );
  }

  const message =
    lines.length > 0
      ? `For ${company.name}, focus your review on the following items:\n- ${lines.join('\n- ')}`
      : 'No immediate review points were detected. Keep monitoring the dashboard for new insights.';

  return {
    message,
    highlights: lines,
    references: [
      `Company: ${company.name}`,
      `Insights known: ${insights.length}`,
      `Invoices surfaced: ${invoices.length}`,
    ],
  };
}

function buildRiskResponse(context) {
  const { company, insights } = context;
  const breakdown = insights.reduce(
    (acc, insight) => {
      const severity = insight.severity || 'low';
      acc[severity] = (acc[severity] || 0) + 1;
      return acc;
    },
    { high: 0, medium: 0, low: 0 },
  );

  const highSeverityInsight = insights.find((insight) => insight.severity === 'high');
  const message = highSeverityInsight
    ? `High-severity risk detected (${highSeverityInsight.type}) on ${highSeverityInsight.entityType} ${highSeverityInsight.entityId}: ${highSeverityInsight.summary}`
    : `No high-severity AI flags right now for ${company.name}. Medium severity alerts: ${breakdown.medium}, low severity alerts: ${breakdown.low}.`;

  const highlights = insights
    .slice(0, 2)
    .map(
      (insight) =>
        `${insight.type} (${insight.severity}) on ${insight.entityType} ${insight.entityId}: ${insight.summary}`,
    );

  return {
    message,
    highlights,
    references: [`High: ${breakdown.high}`, `Medium: ${breakdown.medium}`, `Low: ${breakdown.low}`],
  };
}

function buildExplainResponse(insight) {
  if (!insight) {
    return {
      message:
        'There are no flagged transactions yet. The assistant is monitoring new data for insights.',
      highlights: [],
      references: [],
    };
  }

  const confidence = Math.round((insight.confidenceScore || 0) * 100);
  const evidence = formatEvidence(insight.evidence);

  const message = `Transaction context: ${insight.entityType} ${insight.entityId} flagged as ${insight.type}. Summary: ${insight.summary}. Why: ${insight.why}. Evidence: ${evidence}.`;

  return {
    message,
    highlights: [
      `Confidence: ${confidence}%`,
      `Legal context: ${insight.legalContext}`,
      `Rule: ${insight.ruleId}`,
    ],
    references: [`Entity: ${insight.entityType} ${insight.entityId}`],
  };
}

function buildWhyFlaggedResponse(insight) {
  if (!insight) {
    return {
      message:
        'No flag data is available yet. Create more transactions or wait for the next AI cycle.',
      highlights: [],
      references: [],
    };
  }

  const evidence = formatEvidence(insight.evidence);

  const message = `This transaction was flagged because ${insight.why}. The governing rule is ${insight.ruleId}, which references ${insight.legalContext}. Evidence: ${evidence}.`;

  return {
    message,
    highlights: [
      `Rule: ${insight.ruleId}`,
      `Legal context: ${insight.legalContext}`,
      `Statistic: confidence ${Math.round((insight.confidenceScore || 0) * 100)}%`,
    ],
    references: [`Entity: ${insight.entityType} ${insight.entityId}`],
  };
}

function answerIntent({ intent, context, targetInsightId }) {
  if (!INTENT_LABELS[intent]) {
    const err = new Error('Intent not supported');
    err.status = 400;
    throw err;
  }

  const selectedInsight = selectInsight(context.insights || [], targetInsightId);

  switch (intent) {
    case 'review':
      return buildReviewResponse(context);
    case 'risks':
      return buildRiskResponse(context);
    case 'explain_transaction':
      return buildExplainResponse(selectedInsight);
    case 'why_flagged':
      return buildWhyFlaggedResponse(selectedInsight);
    default:
      return {
        message: 'I am ready to assist once you select one of the supported intents.',
        highlights: [],
        references: [],
      };
  }
}

module.exports = {
  getContext,
  answerIntent,
  INTENT_LABELS,
};
