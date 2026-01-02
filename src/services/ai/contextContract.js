// src/services/ai/contextContract.js
'use strict';

/**
 * This file defines the ONLY allowed AI context shape.
 * Any change here is a breaking, audited change.
 */

const CONTEXT_VERSION = '1.0.0';

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
      amount: t.amount,
      currency: t.currency,
      isReconciled: t.isReconciled,
    })),

    insights: enforceArrayLimit(raw.insights).map((i) => ({
      id: i.id,
      type: i.type,
      severity: i.severity,
      summary: i.summary,
      ruleId: i.ruleId,
    })),
  };
}

module.exports = {
  CONTEXT_VERSION,
  sanitizeContext,
};
