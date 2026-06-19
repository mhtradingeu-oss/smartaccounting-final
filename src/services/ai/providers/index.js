'use strict';

const mockProvider = require('./mockProvider');
const openaiProvider = require('./openaiProvider');
const { getProviderConfig, assertProviderReady } = require('./providerConfig');

function getAIProvider(env = process.env) {
  const config = getProviderConfig(env);
  if (!config.enabled || config.provider === 'mock') {
    return mockProvider;
  }
  if (config.provider === 'openai') {
    return openaiProvider;
  }
  return mockProvider;
}

function getProviderMetadata(env = process.env) {
  const config = getProviderConfig(env);
  let readiness;
  try {
    readiness = assertProviderReady(config);
  } catch (error) {
    readiness = {
      ready: false,
      provider: config.provider,
      enabled: config.enabled,
      errorCode: error.errorCode || error.code || 'AI_PROVIDER_NOT_READY',
    };
  }

  return {
    provider: config.provider,
    enabled: config.enabled,
    model: config.provider === 'openai' ? config.openaiModel : 'mock',
    timeoutMs: config.timeoutMs,
    maxOutputTokens: config.maxOutputTokens,
    dailyBudgetCents: config.dailyBudgetCents,
    ready: readiness.ready,
    errorCode: readiness.errorCode,
  };
}

module.exports = {
  getAIProvider,
  getProviderMetadata,
};
