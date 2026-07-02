// automationEngine.js
// Phase 13: AI Automation Engine (Read-only, Explainable, Auditable)
// All automations must be human-in-the-loop, explainable, and logged.

// Runs detectors in read-only mode, returns suggestions only
const { assertReadOnlyContext, assertNoMutationIntent, assertSuggestionValid } = require('./automationGuard');
const { logAutomationEvent, safeHash } = require('./automationAuditLogger');
const { buildSuggestionFromFinding } = require('./recommendationBuilder');

/**
 * Runs automation detectors and returns suggestions (read-only)
 * @param {Object} params - { userId, companyId, context, method }
 * @returns {Promise<AutomationSuggestion[]>}
 */
async function runAutomation({ userId, companyId, context, method = 'GET', requestId }) {
  assertReadOnlyContext({ method });
  assertNoMutationIntent(context?.prompt);

  // Log triggered event (hash only)
  await logAutomationEvent({
    eventType: 'AUTOMATION_TRIGGERED',
    userId,
    companyId,
    requestId,
    meta: { contextHash: safeHash(JSON.stringify(context)) },
  });

  // Run detectors (real)
  const findings = await runDetectors(context);

  // Convert findings to suggestions
  const suggestions = findings.map(buildSuggestionFromFinding);

  // Validate and log each suggestion
  for (const suggestion of suggestions) {
    try {
      assertSuggestionValid(suggestion);
      await logAutomationEvent({
        eventType: 'AUTOMATION_PRODUCED',
        userId,
        companyId,
        requestId,
        meta: { suggestionId: suggestion.id, type: suggestion.type },
      });
    } catch (err) {
      await logAutomationEvent({
        eventType: 'AUTOMATION_REJECTED',
        userId,
        companyId,
        requestId,
        meta: { error: err.message },
      });
      throw err;
    }
  }
  return suggestions;
}


// Runs all detectors and aggregates findings
async function runDetectors(context) {
  const { companyId, invoices, bankTransactions, invoicePayments, bankBalance } = context || {};
  const findings = [];
  // Duplicate Invoice Detector
  const { detectDuplicateInvoices } = require('./detectors/duplicateInvoiceDetector');
  findings.push(...(await detectDuplicateInvoices({ companyId, invoices })));
  // Unmatched Bank Transaction Detector
  const { detectUnmatchedBankTransactions } = require('./detectors/unmatchedBankTransactionDetector');
  findings.push(...(await detectUnmatchedBankTransactions({ companyId, bankTransactions, invoicePayments })));
  // Cash Flow Risk Detector
  const { detectCashFlowRisk } = require('./detectors/cashFlowRiskDetector');
  findings.push(...(await detectCashFlowRisk({ companyId, invoices, bankBalance })));
  return findings;
}

module.exports = { runAutomation };
