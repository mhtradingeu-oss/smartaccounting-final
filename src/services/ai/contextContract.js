// src/services/ai/contextContract.js
'use strict';

/**
 * This file defines the ONLY allowed AI context shape.
 * Any change here is a breaking, audited change.
 */

const CONTEXT_VERSION = '1.1.0';

const MAX_ITEMS = 5;

function enforceArrayLimit(arr) {
  return Array.isArray(arr) ? arr.slice(0, MAX_ITEMS) : [];
}

function sanitizeContext(raw) {
  if (!raw || typeof raw !== 'object') {
    return { version: CONTEXT_VERSION };
  }

  return {
    version: CONTEXT_VERSION,

    company: raw.company
      ? {
          id: raw.company.id,
          name: raw.company.name,
          country: raw.company.country,
          city: raw.company.city,
          aiEnabled: raw.company.aiEnabled,
        }
      : undefined,

    invoices: enforceArrayLimit(raw.invoices).map((i) => ({
      id: i.id,
      status: i.status,
      total: i.total,
      currency: i.currency,
      dueDate: i.dueDate,
    })),

    expenses: enforceArrayLimit(raw.expenses).map((e) => ({
      id: e.id,
      status: e.status,
      grossAmount: e.grossAmount,
      currency: e.currency,
    })),

    bankTransactions: enforceArrayLimit(raw.bankTransactions).map((t) => ({
      id: t.id,
      description: t.description,
      amount: t.amount,
      currency: t.currency,
      isReconciled: t.isReconciled,
      transactionDate: t.transactionDate,
    })),

    insights: enforceArrayLimit(raw.insights).map((i) => ({
      id: i.id,
      entityType: i.entityType,
      entityId: i.entityId,
      type: i.type,
      severity: i.severity,
      summary: i.summary,
      ruleId: i.ruleId,
      why: i.why,
      confidenceScore: i.confidenceScore,
      dataSource: i.dataSource,
      lastEvaluated: i.lastEvaluated,
      legalContext: i.legalContext,
    })),
  };
}

module.exports = {
  CONTEXT_VERSION,
  sanitizeContext,
};
