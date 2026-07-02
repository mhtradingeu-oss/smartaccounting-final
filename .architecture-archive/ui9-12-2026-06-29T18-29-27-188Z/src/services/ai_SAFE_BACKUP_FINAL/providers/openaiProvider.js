'use strict';

const { validateAssistantResponse } = require('../assistantResponseSchema');
const { withProviderTimeout } = require('../providerTimeout');
const { assertProviderReady, getProviderConfig, buildProviderReadinessError } = require('./providerConfig');

function buildOpenAIInput({ intent, prompt, context, registryEntry }) {
  const accountingBrief = context?.accountingBrief || null;
  return [
    {
      role: 'system',
      content:
        registryEntry?.systemPolicy ||
        'You are a read-only German accounting assistant. Use only provided data and report data gaps.',
    },
    {
      role: 'user',
      content: JSON.stringify({
        intent,
        prompt,
        instructions: [
          'Use only supplied data in accountingBrief and context.',
          'Do not infer missing amounts, dates, tax positions, counterparties, or legal conclusions.',
          'Keep the assistant read-only and auditable.',
          'For review intent, prioritize top risk, overdue/pending invoices, unreconciled bank transactions, evidence references, safe next actions, and data gaps.',
          'For risks intent, rank high, medium, and low risks and cite entity/source/evidence in each risk line.',
          'For explain_transaction and why_flagged, explain why it matters, source/evidence, legal/context note when available, confidence when available, and data gaps.',
          'Return JSON only with the required schema fields.',
        ],
        accountingBrief,
        context,
        responseSchema: {
          summary: 'string',
          risks: ['string'],
          requiredActions: ['string'],
          dataGaps: ['string'],
          confidence: 'null | estimated-low | estimated-medium | estimated-high',
        },
      }),
    },
  ];
}

async function loadOpenAIClient() {
  try {
    return await import('openai');
  } catch (error) {
    throw buildProviderReadinessError(
      'OpenAI provider is enabled but the openai package is not installed',
      'AI_PROVIDER_PACKAGE_MISSING',
    );
  }
}

function parseProviderJson(rawText) {
  try {
    return JSON.parse(rawText);
  } catch (error) {
    const err = new Error('OpenAI provider returned invalid JSON');
    err.code = 'AI_PROVIDER_INVALID_RESPONSE';
    err.errorCode = 'AI_PROVIDER_INVALID_RESPONSE';
    err.status = 502;
    throw err;
  }
}

async function generateAssistantResponse(input = {}) {
  const config = getProviderConfig();
  assertProviderReady(config);

  const openaiModule = await loadOpenAIClient();
  const OpenAI = openaiModule.default || openaiModule.OpenAI;
  if (typeof OpenAI !== 'function') {
    throw buildProviderReadinessError(
      'OpenAI provider client is unavailable',
      'AI_PROVIDER_CLIENT_UNAVAILABLE',
    );
  }

  const client = new OpenAI({ apiKey: config.openaiApiKey });
  const request = client.chat.completions.create({
    model: config.openaiModel,
    messages: buildOpenAIInput(input),
    temperature: 0,
    max_tokens: config.maxOutputTokens,
    response_format: { type: 'json_object' },
  });

  const completion = await withProviderTimeout(request, config.timeoutMs, {
    provider: 'openai',
    requestId: input.requestId,
  });
  const content = completion?.choices?.[0]?.message?.content || '';
  const payload = parseProviderJson(content);
  const validation = validateAssistantResponse(payload);
  if (!validation.success) {
    const err = new Error('OpenAI provider response failed schema validation');
    err.code = 'AI_PROVIDER_SCHEMA_INVALID';
    err.errorCode = 'AI_PROVIDER_SCHEMA_INVALID';
    err.status = 502;
    throw err;
  }
  return validation.data;
}

module.exports = {
  name: 'openai',
  generateAssistantResponse,
};
