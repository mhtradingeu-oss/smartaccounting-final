'use strict';

const { validateAssistantResponse } = require('../assistantResponseSchema');

function resolveDataGaps(context = {}) {
  const gaps = [];
  if (!Array.isArray(context.invoices) || context.invoices.length === 0) {
    gaps.push('Invoices data not available');
  }
  if (!Array.isArray(context.expenses) || context.expenses.length === 0) {
    gaps.push('Expenses data not available');
  }
  if (!Array.isArray(context.bankTransactions) || context.bankTransactions.length === 0) {
    gaps.push('Bank transactions data not available');
  }
  if (!Array.isArray(context.insights) || context.insights.length === 0) {
    gaps.push('AI insights data not available');
  }
  return gaps;
}

function buildSummary({ intent, context = {}, registryEntry }) {
  const label = registryEntry?.description || intent || 'assistant request';
  const invoices = Array.isArray(context.invoices) ? context.invoices.length : 0;
  const expenses = Array.isArray(context.expenses) ? context.expenses.length : 0;
  const bankTransactions = Array.isArray(context.bankTransactions)
    ? context.bankTransactions.length
    : 0;
  const insights = Array.isArray(context.insights) ? context.insights.length : 0;

  return `${label}: reviewed ${invoices} invoices, ${expenses} expenses, ${bankTransactions} bank transactions, and ${insights} insights.`;
}

async function generateAssistantResponse({
  intent,
  prompt,
  context,
  registryEntry,
  requestId,
} = {}) {
  const dataGaps = resolveDataGaps(context);
  const response = {
    summary: buildSummary({ intent, context, registryEntry }),
    risks: [],
    requiredActions: ['Review source records before making accounting decisions.'],
    dataGaps,
    confidence: dataGaps.length ? null : 'estimated-medium',
    provider: 'mock',
    requestId,
    sanitizedPrompt: String(prompt || '').slice(0, 8000),
  };

  const validation = validateAssistantResponse(response);
  if (!validation.success) {
    return {
      summary: 'Data not available. Please provide additional records.',
      risks: [],
      requiredActions: ['Review source records before making accounting decisions.'],
      dataGaps: dataGaps.length ? dataGaps : ['Accounting data not available'],
      confidence: null,
      provider: 'mock',
      requestId,
    };
  }

  return validation.data;
}

module.exports = {
  name: 'mock',
  generateAssistantResponse,
};
