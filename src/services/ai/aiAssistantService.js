const { sanitizeContext } = require('./contextContract');
const { redactPII } = require('./governance');
const { validateAssistantResponse } = require('./assistantResponseSchema');
const { checkProviderBudget } = require('./providerBudgetGuard');
const { getProviderConfig, isProviderEnabled } = require('./providers/providerConfig');
const { getAIProvider, getProviderMetadata } = require('./providers');
const promptRegistry = require('./promptRegistry');
const { Company, Invoice, Expense, BankTransaction, AIInsight } = require('../../models');

const MAX_ITEMS = 5;
const MAX_PROMPT_CHARS = 8000;
const MAX_SUMMARY_CHARS = 1200;
const MAX_ITEM_CHARS = 240;
const MAX_LIST_ITEMS = 6;
const DEFAULT_CURRENCY = 'EUR';
const SEVERITY_ORDER = {
  high: 3,
  medium: 2,
  low: 1,
};

const resolveDataSource = (entityType) => {
  const normalized = String(entityType || '').toLowerCase();
  if (normalized.includes('invoice')) {
    return 'Invoices';
  }
  if (normalized.includes('expense')) {
    return 'Expenses';
  }
  if (normalized.includes('bank') || normalized.includes('transaction')) {
    return 'Bank transactions';
  }
  if (normalized.includes('audit')) {
    return 'Audit logs';
  }
  return 'Accounting data';
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
      .map((item) =>
        typeof item === 'object'
          ? truncateText(redactPII(JSON.stringify(item)), MAX_ITEM_CHARS)
          : truncateText(redactPII(String(item)), MAX_ITEM_CHARS),
      )
      .join('; ');
  }

  if (typeof evidence === 'object') {
    return Object.entries(evidence)
      .map(([key, value]) => `${key}: ${truncateText(redactPII(String(value)), MAX_ITEM_CHARS)}`)
      .join('; ');
  }

  return truncateText(redactPII(String(evidence)), MAX_ITEM_CHARS);
}

function truncateText(value, maxLength) {
  const text = String(value || '');
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength - 3)}...`;
}

function sanitizeText(value, maxLength) {
  return truncateText(redactPII(String(value || '')), maxLength).trim();
}

function sanitizeAccountingLine(value, maxLength = MAX_ITEM_CHARS) {
  return truncateText(String(value || ''), maxLength).trim();
}

function sanitizeList(items, maxLength = MAX_ITEM_CHARS, maxItems = MAX_LIST_ITEMS) {
  if (!Array.isArray(items)) {
    return [];
  }
  return items
    .filter(Boolean)
    .slice(0, maxItems)
    .map((item) => sanitizeText(item, maxLength))
    .filter(Boolean);
}

function sanitizeAccountingList(items, maxLength = MAX_ITEM_CHARS, maxItems = MAX_LIST_ITEMS) {
  if (!Array.isArray(items)) {
    return [];
  }
  return items
    .filter(Boolean)
    .slice(0, maxItems)
    .map((item) => sanitizeAccountingLine(item, maxLength))
    .filter(Boolean);
}

function formatRecordLabel(prefix, record, preferredField) {
  const preferred = record?.[preferredField];
  if (preferred) {
    return sanitizeText(preferred, 80);
  }
  if (record?.id !== undefined && record?.id !== null) {
    return `${prefix} #${record.id}`;
  }
  return prefix;
}

function redactContextValue(value) {
  if (typeof value === 'string') {
    return sanitizeText(value, MAX_ITEM_CHARS);
  }
  if (Array.isArray(value)) {
    return value.map(redactContextValue);
  }
  if (value && typeof value === 'object') {
    return Object.entries(value).reduce((acc, [key, item]) => {
      acc[key] = redactContextValue(item);
      return acc;
    }, {});
  }
  return value;
}

function normalizeContext(context) {
  const safeContext = context && typeof context === 'object' ? context : {};
  return {
    company: safeContext.company || {},
    invoices: Array.isArray(safeContext.invoices) ? safeContext.invoices : [],
    expenses: Array.isArray(safeContext.expenses) ? safeContext.expenses : [],
    bankTransactions: Array.isArray(safeContext.bankTransactions) ? safeContext.bankTransactions : [],
    insights: Array.isArray(safeContext.insights) ? safeContext.insights : [],
  };
}

function buildSafeContextSummary(context) {
  const invoices = context.invoices || [];
  const expenses = context.expenses || [];
  const bankTransactions = context.bankTransactions || [];
  const insights = context.insights || [];
  const overdueCount = invoices.filter(
    (invoice) => String(invoice.status).toUpperCase() === 'OVERDUE',
  ).length;
  const unreconciledCount = bankTransactions.filter((tx) => !tx.isReconciled).length;
  const severityCounts = insights.reduce(
    (acc, insight) => {
      const severity = insight.severity || 'low';
      acc[severity] = (acc[severity] || 0) + 1;
      return acc;
    },
    { high: 0, medium: 0, low: 0 },
  );

  const summary = [
    `Invoices: ${invoices.length} total, ${overdueCount} overdue.`,
    `Expenses: ${expenses.length} total.`,
    `Bank transactions: ${bankTransactions.length} total, ${unreconciledCount} unreconciled.`,
    `Insights: ${insights.length} total (high ${severityCounts.high}, medium ${severityCounts.medium}, low ${severityCounts.low}).`,
  ].join(' ');

  return truncateText(summary, 600);
}

function resolveDataGaps(context) {
  const gaps = [];
  if (!context.invoices?.length) {
    gaps.push('Invoices data not available');
  }
  if (!context.expenses?.length) {
    gaps.push('Expenses data not available');
  }
  if (!context.bankTransactions?.length) {
    gaps.push('Bank transactions data not available');
  }
  if (!context.insights?.length) {
    gaps.push('AI insights data not available');
  }
  return gaps;
}

function estimateConfidenceLabel(context) {
  const insights = context.insights || [];
  const withConfidence = insights.find((insight) =>
    Number.isFinite(Number(insight.confidenceScore)),
  );
  if (!withConfidence) {
    return null;
  }
  const score = Number(withConfidence.confidenceScore);
  if (score >= 0.8) {
    return 'estimated-high';
  }
  if (score >= 0.5) {
    return 'estimated-medium';
  }
  return 'estimated-low';
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
  const lastEvaluated = plain.updatedAt || plain.createdAt || null;
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
    dataSource: resolveDataSource(plain.entityType),
    lastEvaluated,
    createdAt: plain.createdAt,
    updatedAt: plain.updatedAt,
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
  return sortInsightsBySeverity(insights)[0];
}

function normalizeSeverity(severity) {
  const normalized = String(severity || 'low').toLowerCase();
  return SEVERITY_ORDER[normalized] ? normalized : 'low';
}

function sortInsightsBySeverity(insights = []) {
  return [...insights].sort((a, b) => {
    const severityDiff =
      (SEVERITY_ORDER[normalizeSeverity(b.severity)] || 0) -
      (SEVERITY_ORDER[normalizeSeverity(a.severity)] || 0);
    if (severityDiff !== 0) {
      return severityDiff;
    }
    return new Date(b.lastEvaluated || b.updatedAt || b.createdAt || 0) -
      new Date(a.lastEvaluated || a.updatedAt || a.createdAt || 0);
  });
}

function buildEvidenceReferences({ insights = [], invoices = [], bankTransactions = [] } = {}) {
  const references = [];

  sortInsightsBySeverity(insights)
    .slice(0, 3)
    .forEach((insight) => {
      const parts = [
        `Insight #${sanitizeText(insight.id || 'unknown', 40)}`,
        `source ${sanitizeText(insight.dataSource || resolveDataSource(insight.entityType), 80)}`,
        `entity ${sanitizeText(insight.entityType || 'unknown', 80)} ${sanitizeText(
          insight.entityId || 'unknown',
          80,
        )}`,
      ];
      if (insight.ruleId) {
        parts.push(`rule ${sanitizeText(insight.ruleId, 80)}`);
      }
      references.push(parts.join('; '));
    });

  invoices
    .filter((invoice) => String(invoice.status).toUpperCase() === 'OVERDUE')
    .slice(0, 2)
    .forEach((invoice) => {
      references.push(
        `Invoice ${formatRecordLabel('invoice', invoice, 'invoiceNumber')}; status ${sanitizeText(
          invoice.status,
          40,
        )}; due ${formatDate(invoice.dueDate) || 'date not available'}; amount ${
          formatCurrency(invoice.total, invoice.currency) || 'amount not available'
        }`,
      );
    });

  bankTransactions
    .filter((tx) => !tx.isReconciled)
    .slice(0, 2)
    .forEach((tx) => {
      references.push(
        `Bank transaction #${sanitizeText(tx.id || 'unknown', 40)}; unreconciled; date ${
          formatDate(tx.transactionDate) || 'date not available'
        }; amount ${formatCurrency(tx.amount, tx.currency) || 'amount not available'}`,
      );
    });

  return sanitizeAccountingList(references, MAX_ITEM_CHARS, MAX_LIST_ITEMS);
}

function formatInsightLine(insight, fallbackSeverity) {
  const severity = normalizeSeverity(insight?.severity || fallbackSeverity);
  const source = sanitizeText(insight?.dataSource || resolveDataSource(insight?.entityType), 80);
  const entityType = sanitizeText(insight?.entityType || 'entity', 80);
  const entityId = sanitizeText(insight?.entityId || 'unknown', 80);
  const summary = sanitizeText(insight?.summary || insight?.why || 'Summary data not available', 160);
  const evidence = formatEvidence(insight?.evidence);
  const rule = insight?.ruleId ? ` Rule: ${sanitizeText(insight.ruleId, 80)}.` : '';
  return `${severity.toUpperCase()} risk: ${summary} Source: ${source}; entity: ${entityType} ${entityId}; evidence: ${evidence}.${rule}`;
}

function buildAccountingSnapshot(context) {
  const normalizedContext = normalizeContext(context);
  const overdueInvoices = normalizedContext.invoices.filter(
    (invoice) => String(invoice.status).toUpperCase() === 'OVERDUE',
  );
  const pendingInvoices = normalizedContext.invoices.filter((invoice) =>
    ['SENT', 'DRAFT', 'PENDING'].includes(String(invoice.status).toUpperCase()),
  );
  const unreconciledTransactions = normalizedContext.bankTransactions.filter((tx) => !tx.isReconciled);
  const rankedInsights = sortInsightsBySeverity(normalizedContext.insights);

  return {
    counts: {
      invoices: normalizedContext.invoices.length,
      overdueInvoices: overdueInvoices.length,
      pendingInvoices: pendingInvoices.length,
      expenses: normalizedContext.expenses.length,
      bankTransactions: normalizedContext.bankTransactions.length,
      unreconciledBankTransactions: unreconciledTransactions.length,
      insights: normalizedContext.insights.length,
    },
    topRisk: rankedInsights[0] ? formatInsightLine(rankedInsights[0]) : 'Top risk data not available',
    overdueInvoices: overdueInvoices
      .slice(0, MAX_LIST_ITEMS)
      .map(
        (invoice) =>
          `Invoice ${formatRecordLabel('invoice', invoice, 'invoiceNumber')} overdue; due ${
            formatDate(invoice.dueDate) || 'date not available'
          }; amount ${formatCurrency(invoice.total, invoice.currency) || 'amount not available'}`,
      ),
    pendingInvoices: pendingInvoices
      .slice(0, MAX_LIST_ITEMS)
      .map(
        (invoice) =>
          `Invoice ${formatRecordLabel('invoice', invoice, 'invoiceNumber')} pending; status ${sanitizeText(
            invoice.status || 'pending',
            40,
          )}; amount ${formatCurrency(invoice.total, invoice.currency) || 'amount not available'}`,
      ),
    unreconciledBankTransactions: unreconciledTransactions
      .slice(0, MAX_LIST_ITEMS)
      .map(
        (tx) =>
          `Transaction #${sanitizeText(tx.id || 'unknown', 40)} unreconciled; date ${
            formatDate(tx.transactionDate) || 'date not available'
          }; amount ${formatCurrency(tx.amount, tx.currency) || 'amount not available'}; description ${sanitizeText(
            tx.description || 'description not available',
            120,
          )}`,
      ),
    rankedRisks: rankedInsights.slice(0, MAX_LIST_ITEMS).map(formatInsightLine),
    evidenceReferences: buildEvidenceReferences(normalizedContext),
    dataGaps: resolveDataGaps(normalizedContext),
  };
}

function buildNextBestActions(context, intent) {
  const normalizedContext = normalizeContext(context);
  const actions = [];
  const snapshot = buildAccountingSnapshot(normalizedContext);

  if (snapshot.counts.overdueInvoices > 0) {
    actions.push('Review overdue invoice source documents, due dates, payment status, and customer correspondence.');
  }
  if (snapshot.counts.pendingInvoices > 0) {
    actions.push('Check pending or draft invoices for missing approval, dispatch status, and supporting evidence.');
  }
  if (snapshot.counts.unreconciledBankTransactions > 0) {
    actions.push('Reconcile unreconciled bank transactions against invoices, expenses, and bank statement evidence.');
  }
  if (normalizedContext.insights.length > 0) {
    actions.push('Inspect the referenced AI insight, rule, evidence, and legal context before making accounting decisions.');
  }
  if (['explain_transaction', 'why_flagged'].includes(intent)) {
    actions.push('Confirm the transaction period, document type, counterparty, and original evidence before relying on this explanation.');
  }

  actions.push('Keep the assistant read-only; make any record changes only through the normal reviewed accounting workflow.');

  return sanitizeList(actions, MAX_ITEM_CHARS, MAX_LIST_ITEMS);
}

function buildReviewResponse(context) {
  const { invoices, bankTransactions, insights } = context;
  const snapshot = buildAccountingSnapshot(context);
  const lines = [];
  const rankedInsights = sortInsightsBySeverity(insights);

  if (rankedInsights.length) {
    lines.push(`Top risk to review first: ${formatInsightLine(rankedInsights[0])}`);
  }

  const overdueInvoice = invoices.find(
    (invoice) => String(invoice.status).toUpperCase() === 'OVERDUE',
  );
  if (overdueInvoice) {
    const invoiceLabel = formatRecordLabel('invoice', overdueInvoice, 'invoiceNumber');
    const text = `Overdue invoice focus: Invoice ${invoiceLabel} is OVERDUE (due ${formatDate(
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
    const pendingLabel = formatRecordLabel(
      String(pending.status).toUpperCase() === 'DRAFT' ? 'draft invoice' : 'invoice',
      pending,
      'invoiceNumber',
    );
    lines.push(
      `Pending invoice focus: ${pendingLabel} (status: ${sanitizeText(pending.status || 'pending', 40)}) for ${formatCurrency(
        pending.total,
        pending.currency,
      )}.`,
    );
  }

  const unreconciled = bankTransactions.filter((tx) => !tx.isReconciled);
  if (unreconciled.length) {
    const topUnreconciled = unreconciled[0];
    lines.push(
      `Unreconciled bank transaction focus: transaction on ${formatDate(topUnreconciled.transactionDate)} (${sanitizeText(
        topUnreconciled.description || `transaction #${topUnreconciled.id}`,
        MAX_ITEM_CHARS,
      )}) for ${formatCurrency(
        topUnreconciled.amount,
        topUnreconciled.currency,
      )}.`,
    );
  }

  const message =
    lines.length > 0
      ? `Prioritized accounting review:\n- ${lines.join('\n- ')}`
      : 'No immediate review points were detected from supplied records. Data not available for any missing source areas listed below.';

  return {
    message,
    highlights: lines,
    references: snapshot.evidenceReferences,
  };
}

function buildRiskResponse(context) {
  const { insights } = context;
  const breakdown = insights.reduce(
    (acc, insight) => {
      const severity = normalizeSeverity(insight.severity);
      acc[severity] = (acc[severity] || 0) + 1;
      return acc;
    },
    { high: 0, medium: 0, low: 0 },
  );

  const rankedInsights = sortInsightsBySeverity(insights);
  const highSeverityInsight = rankedInsights.find((insight) => normalizeSeverity(insight.severity) === 'high');
  const message = highSeverityInsight
    ? `Highest ranked risk: ${formatInsightLine(highSeverityInsight)}`
    : `No high-severity AI flags right now. Medium severity alerts: ${breakdown.medium}, low severity alerts: ${breakdown.low}.`;

  const highlights = rankedInsights.slice(0, MAX_LIST_ITEMS).map(formatInsightLine);

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
        'Flagged transaction data not available. There is no supplied insight to explain.',
      highlights: [],
      references: ['AI insight data not available', 'Transaction evidence not available'],
    };
  }

  const confidenceScore = Number(insight.confidenceScore);
  const confidence = Number.isFinite(confidenceScore) ? Math.round(confidenceScore * 100) : null;
  const evidence = formatEvidence(insight.evidence);

  const legalContext = sanitizeText(insight.legalContext || 'Legal context data not available', MAX_ITEM_CHARS);
  const why = sanitizeText(insight.why || 'Reason data not available', MAX_ITEM_CHARS);
  const message = `Transaction context: ${sanitizeText(insight.entityType, 80)} ${sanitizeText(
    insight.entityId,
    80,
  )} flagged as ${sanitizeText(insight.type, 80)}. Summary: ${sanitizeText(
    insight.summary || 'Summary data not available',
    MAX_ITEM_CHARS,
  )}. Why it matters: ${why}. Source/evidence: ${evidence}. Legal/context note: ${legalContext}.`;

  return {
    message,
    highlights: [
      confidence !== null ? `Confidence: ${confidence}%` : 'Confidence: not available',
      `Legal context: ${legalContext}`,
      `Rule: ${sanitizeText(insight.ruleId || 'Not available', 80)}`,
    ],
    references: [
      `Entity: ${sanitizeText(insight.entityType, 80)} ${sanitizeText(insight.entityId, 80)}`,
    ],
  };
}

function buildWhyFlaggedResponse(insight) {
  if (!insight) {
    return {
      message:
        'Flag data not available. There is no supplied insight, rule, or evidence explaining why this was flagged.',
      highlights: [],
      references: ['AI insight data not available', 'Rule evidence not available'],
    };
  }

  const evidence = formatEvidence(insight.evidence);

  const why = sanitizeText(insight.why || insight.summary || 'Reason data not available', MAX_ITEM_CHARS);
  const legalContext = sanitizeText(insight.legalContext || 'Legal context data not available', MAX_ITEM_CHARS);
  const message = `This transaction was flagged because ${why}. Why it matters: review the referenced accounting source before relying on the record. The governing rule is ${sanitizeText(
    insight.ruleId || 'rule data not available',
    80,
  )}, with context ${legalContext}. Source/evidence: ${evidence}.`;

  const confidenceScore = Number(insight.confidenceScore);
  const confidence = Number.isFinite(confidenceScore) ? Math.round(confidenceScore * 100) : null;

  return {
    message,
    highlights: [
      `Rule: ${sanitizeText(insight.ruleId || 'Not available', 80)}`,
      `Legal context: ${legalContext}`,
      confidence !== null ? `Confidence: ${confidence}%` : 'Confidence: not available',
    ],
    references: [
      `Entity: ${sanitizeText(insight.entityType, 80)} ${sanitizeText(insight.entityId, 80)}`,
      `Source: ${sanitizeText(insight.dataSource || resolveDataSource(insight.entityType), 80)}`,
    ],
  };
}

function appendReferenceLines(highlights, references) {
  const lines = [...(highlights || [])];
  (references || []).slice(0, 2).forEach((reference) => {
    lines.push(`Evidence/reference: ${reference}`);
  });
  return lines;
}

function buildDataGaps(context, baseReferences = []) {
  const gaps = [...resolveDataGaps(context)];
  if (!baseReferences.length) {
    gaps.push('Evidence references data not available');
  }
  return gaps;
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

function applyComplianceWrapper({ intent, context, targetInsightId, prompt }) {
  const safePrompt = sanitizeText(prompt || '', MAX_PROMPT_CHARS);
  const normalizedContext = normalizeContext(context);
  const base = answerIntent({ intent, context: normalizedContext, targetInsightId });
  const companyName = normalizedContext.company?.name;
  const baseMessage =
    companyName && typeof base.message === 'string'
      ? base.message.split(companyName).join('your company')
      : base.message;
  const evidenceReferences = sanitizeAccountingList(base.references, MAX_ITEM_CHARS, MAX_LIST_ITEMS);
  const dataGaps = sanitizeList(
    buildDataGaps(normalizedContext, evidenceReferences),
    MAX_ITEM_CHARS,
    MAX_LIST_ITEMS,
  );
  const contextSummary = buildSafeContextSummary(normalizedContext);
  const risks = sanitizeAccountingList(
    appendReferenceLines(base.highlights, evidenceReferences),
    MAX_ITEM_CHARS,
    MAX_LIST_ITEMS,
  );
  const requiredActions = buildNextBestActions(normalizedContext, intent);
  const summaryBase = sanitizeAccountingLine(baseMessage || '', MAX_SUMMARY_CHARS);
  const summary =
    dataGaps.length > 0
      ? sanitizeAccountingLine(
          `${summaryBase} Data not available for: ${dataGaps
            .map((gap) => gap.replace(' data not available', ''))
            .join(', ')}.`,
          MAX_SUMMARY_CHARS,
        )
      : summaryBase;
  const response = {
    summary,
    risks,
    requiredActions,
    dataGaps,
    confidence: estimateConfidenceLabel(normalizedContext),
    contextSummary,
    evidenceReferences,
    sanitizedPrompt: safePrompt,
  };
  const validation = validateAssistantResponse(response);
  if (!validation.success) {
    return {
      summary: 'Data not available. Please provide additional records.',
      risks: [],
      requiredActions,
      dataGaps,
      confidence: null,
      contextSummary,
      evidenceReferences,
      sanitizedPrompt: safePrompt,
    };
  }
  return response;
}

function answerIntentCompliance({ intent, context, targetInsightId, prompt }) {
  const compliance = applyComplianceWrapper({ intent, context, targetInsightId, prompt });
  return {
    message: compliance.summary,
    highlights: compliance.risks,
    references: compliance.evidenceReferences?.length
      ? compliance.evidenceReferences
      : compliance.dataGaps,
    ...compliance,
  };
}

function sanitizeProviderErrorCode(error) {
  const code = error?.errorCode || error?.code || 'AI_PROVIDER_ERROR';
  return String(code).replace(/[^A-Z0-9_]/gi, '_').toUpperCase().slice(0, 80);
}

function buildSafeProviderMetadata({ providerMetadata, fallback, errorCode }) {
  return {
    provider: providerMetadata.provider,
    providerEnabled: Boolean(providerMetadata.enabled),
    providerFallback: Boolean(fallback),
    ...(errorCode ? { providerErrorCode: sanitizeProviderErrorCode({ errorCode }) } : {}),
  };
}

function pickAssistantSchemaFields(response) {
  return {
    summary: response.summary,
    risks: Array.isArray(response.risks) ? response.risks : [],
    requiredActions: Array.isArray(response.requiredActions) ? response.requiredActions : [],
    dataGaps: Array.isArray(response.dataGaps) ? response.dataGaps : [],
    confidence: response.confidence ?? null,
    ...(response.contextSummary ? { contextSummary: response.contextSummary } : {}),
  };
}

function omitProviderUnsafeFields(response) {
  const { sanitizedPrompt, prompt, rawPrompt, stack, error, ...safeResponse } = response;
  return safeResponse;
}

async function answerIntentComplianceWithProvider({
  intent,
  context,
  targetInsightId,
  prompt,
  requestId,
}) {
  const deterministic = answerIntentCompliance({ intent, context, targetInsightId, prompt });

  if (!isProviderEnabled()) {
    return deterministic;
  }

  const providerMetadata = getProviderMetadata();
  const providerMeta = (fallback, errorCode) =>
    buildSafeProviderMetadata({ providerMetadata, fallback, errorCode });
  const config = getProviderConfig();
  const budget = checkProviderBudget({ config });

  if (!budget.allowed) {
    return {
      ...omitProviderUnsafeFields(deterministic),
      ...providerMeta(true, 'AI_PROVIDER_BUDGET_DENIED'),
    };
  }

  try {
    const provider = getAIProvider();
    const safePrompt = sanitizeText(prompt || '', MAX_PROMPT_CHARS);
    const normalizedContext = normalizeContext(context);
    const accountingBrief = redactContextValue(buildAccountingSnapshot(normalizedContext));
    const safeContext = {
      ...sanitizeContext(redactContextValue(normalizedContext)),
      accountingBrief,
    };
    const registryEntry = promptRegistry.getPromptMeta
      ? promptRegistry.getPromptMeta('assistant_general')
      : undefined;
    const providerResponse = await provider.generateAssistantResponse({
      intent,
      prompt: safePrompt,
      context: safeContext,
      registryEntry,
      requestId,
    });
    const validation = validateAssistantResponse(providerResponse);
    if (!validation.success) {
      return {
        ...omitProviderUnsafeFields(deterministic),
        ...providerMeta(true, 'AI_PROVIDER_SCHEMA_INVALID'),
      };
    }
    const compliance = pickAssistantSchemaFields(validation.data);
    return {
      message: compliance.summary,
      highlights: compliance.risks,
      references: compliance.dataGaps,
      ...compliance,
      ...providerMeta(false),
    };
  } catch (error) {
    return {
      ...omitProviderUnsafeFields(deterministic),
      ...providerMeta(true, sanitizeProviderErrorCode(error)),
    };
  }
}

module.exports = {
  getContext,
  answerIntent,
  answerIntentCompliance,
  answerIntentComplianceWithProvider,
  INTENT_LABELS,
};
