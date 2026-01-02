// src/services/ai/promptRegistry.js
'use strict';

// Central registry for all AI prompts (read-only mode).
// This must remain deterministic, versioned, and auditable.

const POLICY_VERSION = '10.0.0';
const MODEL_VERSION = process.env.AI_MODEL_VERSION || 'mock';

const PROMPTS = Object.freeze({
  assistant_general: {
    promptVersion: '1.0.0',
    ruleId: 'ASSISTANT_GENERAL',
    description: 'General read-only assistant responses',
  },
  invoice_summary: {
    promptVersion: '1.0.0',
    ruleId: 'INVOICE_SUMMARY',
    description: 'Summarize invoice and highlight risks',
  },
  monthly_overview: {
    promptVersion: '1.0.0',
    ruleId: 'MONTHLY_OVERVIEW',
    description: 'Monthly accounting overview (read-only)',
  },
  reconciliation_summary: {
    promptVersion: '1.0.0',
    ruleId: 'RECONCILIATION_SUMMARY',
    description: 'Bank reconciliation summary (read-only)',
  },
});

function getPromptMeta(queryType) {
  const meta = PROMPTS[queryType] || PROMPTS.assistant_general;
  return {
    policyVersion: POLICY_VERSION,
    modelVersion: MODEL_VERSION,
    promptVersion: meta.promptVersion,
    ruleId: meta.ruleId,
  };
}

module.exports = {
  POLICY_VERSION,
  MODEL_VERSION,
  getPromptMeta,
};
