const { Op } = require('sequelize');
const {
  Invoice,
  Expense,
  BankStatement,
  BankTransaction,
  AIInsight,
} = require('../models');

const taxBridgeReadinessService = require('./taxBridgeReadinessService');

const clampScore = (value) => Math.max(0, Math.min(100, Math.round(Number(value) || 0)));

const statusUpper = (value) => String(value || '').toUpperCase();

async function countDraftInvoices(companyId) {
  return Invoice.count({
    where: {
      companyId,
      status: {
        [Op.in]: ['DRAFT', 'draft'],
      },
    },
  });
}

async function countExpensesWithoutAttachments(companyId) {
  const expenses = await Expense.findAll({
    where: { companyId },
    attributes: ['id'],
    include: [
      {
        association: 'attachments',
        required: false,
        attributes: ['id'],
      },
    ],
  });

  return expenses.filter((expense) => {
    const attachments = expense.attachments || [];
    return attachments.length === 0;
  }).length;
}

async function countBankReviewItems(companyId) {
  const statementsNeedingReview = await BankStatement.count({
    where: {
      companyId,
      status: {
        [Op.in]: ['NEEDS_REVIEW', 'needs_review', 'PROCESSING', 'processing'],
      },
    },
  });

  const unreconciledTransactions = await BankTransaction.count({
    where: {
      companyId,
      [Op.or]: [
        { isReconciled: false },
        { isReconciled: null },
      ],
    },
  }).catch(() => 0);

  return {
    statementsNeedingReview,
    unreconciledTransactions,
    total: statementsNeedingReview + unreconciledTransactions,
  };
}

async function countAIInsights(companyId) {
  return AIInsight.count({
    where: { companyId },
  }).catch(() => 0);
}

function buildDocumentScore({ totalExpenses, expensesWithoutAttachments }) {
  if (!totalExpenses) return 100;
  const attached = Math.max(0, totalExpenses - expensesWithoutAttachments);
  return clampScore((attached / totalExpenses) * 100);
}

function buildBankScore({ bankReviewItems }) {
  if (!bankReviewItems.total) return 100;
  return clampScore(100 - Math.min(80, bankReviewItems.total * 10));
}

function normalizeWarnings(readiness) {
  const warnings = [];

  for (const warning of readiness?.warnings || []) {
    warnings.push({
      source: 'tax_bridge',
      severity: warning.severity || 'warning',
      code: warning.code || 'TAX_BRIDGE_WARNING',
      message: warning.message || 'Tax Bridge warning requires review.',
      action: warning.action || 'Review this warning before export or filing preparation.',
      evidence: warning.evidence || null,
    });
  }

  for (const issue of readiness?.issues || []) {
    warnings.push({
      source: 'tax_bridge',
      severity: issue.severity || 'error',
      code: issue.code || 'TAX_BRIDGE_ISSUE',
      message: issue.message || 'Tax Bridge issue requires review.',
      action: issue.action || 'Resolve this issue before continuing.',
      evidence: issue.evidence || null,
    });
  }

  return warnings;
}

function buildNextActions({ draftInvoices, expensesWithoutAttachments, bankReviewItems, pendingAIApprovals }) {
  const actions = [];

  if (expensesWithoutAttachments > 0) {
    actions.push({
      priority: 'high',
      code: 'ATTACH_EXPENSE_RECEIPTS',
      title: 'Attach missing expense receipts',
      description: `${expensesWithoutAttachments} expenses do not have attachments yet.`,
      target: '/expenses',
    });
  }

  if (draftInvoices > 0) {
    actions.push({
      priority: 'medium',
      code: 'REVIEW_DRAFT_INVOICES',
      title: 'Review draft invoices before DATEV export',
      description: `${draftInvoices} draft invoices may be excluded from DATEV preparation.`,
      target: '/invoices',
    });
  }

  if (bankReviewItems.total > 0) {
    actions.push({
      priority: 'medium',
      code: 'REVIEW_BANK_ITEMS',
      title: 'Review bank statements and unreconciled transactions',
      description: `${bankReviewItems.total} bank review items need attention.`,
      target: '/bank-statements',
    });
  }

  if (pendingAIApprovals > 0) {
    actions.push({
      priority: 'medium',
      code: 'REVIEW_AI_APPROVALS',
      title: 'Review pending AI approval items',
      description: `${pendingAIApprovals} AI approval items are waiting for review.`,
      target: '/ai-manager',
    });
  }

  if (!actions.length) {
    actions.push({
      priority: 'low',
      code: 'READY_FOR_REVIEW',
      title: 'Review Steuerberater package readiness',
      description: 'No critical review center blockers were found in this summary.',
      target: '/tax-bridge',
    });
  }

  return actions;
}

async function getSmartReviewSummary({ companyId }) {
  if (!companyId) {
    const error = new Error('companyId is required');
    error.status = 400;
    error.code = 'COMPANY_REQUIRED';
    throw error;
  }

  const [
    readiness,
    totalExpenses,
    draftInvoices,
    expensesWithoutAttachments,
    bankReviewItems,
    aiInsights,
  ] = await Promise.all([
    taxBridgeReadinessService.getTaxBridgeReadiness({ companyId }),
    Expense.count({ where: { companyId } }),
    countDraftInvoices(companyId),
    countExpensesWithoutAttachments(companyId),
    countBankReviewItems(companyId),
    countAIInsights(companyId),
  ]);

  const pendingAIApprovals = 0;

  const documentScore = buildDocumentScore({ totalExpenses, expensesWithoutAttachments });
  const bankScore = buildBankScore({ bankReviewItems });

  const readinessScores = {
    overall: clampScore(readiness?.scores?.overall ?? 0),
    datev: clampScore(readiness?.scores?.datevReadiness ?? 0),
    tax: clampScore(readiness?.scores?.elsterPreparationReadiness ?? 0),
    audit: clampScore(readiness?.scores?.gobdEvidenceReadiness ?? 0),
    bank: bankScore,
    documents: documentScore,
    ai: aiInsights > 0 ? 70 : 40,
  };

  const warnings = normalizeWarnings(readiness);

  return {
    success: true,
    product: 'SmartAccounting Smart Review Center',
    mode: 'read_only_preparation',
    companyId,
    readiness: readinessScores,
    counts: {
      draftInvoices,
      totalExpenses,
      expensesWithoutAttachments,
      bankStatementsNeedingReview: bankReviewItems.statementsNeedingReview,
      unreconciledBankTransactions: bankReviewItems.unreconciledTransactions,
      pendingAIApprovals,
      aiInsights,
    },
    warnings,
    nextActions: buildNextActions({
      draftInvoices,
      expensesWithoutAttachments,
      bankReviewItems,
      pendingAIApprovals,
    }),
    sourceBoundaries: [
      'Read-only review center summary.',
      'No accounting posting is performed.',
      'No AI approval decision is performed.',
      'No DATEV upload is performed.',
      'No ELSTER submission is performed.',
      'Tax filing and payment decisions must be reviewed by the user and/or qualified Steuerberater.',
    ],
    sources: {
      taxBridge: true,
      invoices: true,
      expenses: true,
      bankStatements: true,
      aiInsights: true,
      aiApprovalQueue: 'read_only_stub',
    },
  };
}

module.exports = {
  getSmartReviewSummary,
};
