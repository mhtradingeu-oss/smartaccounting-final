'use strict';

const SUPPORTED_PROVIDERS = new Set(['mock', 'openai']);

const DEFAULTS = Object.freeze({
  provider: 'mock',
  enabled: false,
  openaiModel: 'gpt-4o-mini',
  timeoutMs: 8000,
  maxOutputTokens: 900,
  dailyBudgetCents: 500,
});

function normalizeBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }
  return String(value).toLowerCase() === 'true';
}

function normalizeProvider(value) {
  const provider = String(value || DEFAULTS.provider).toLowerCase();
  return SUPPORTED_PROVIDERS.has(provider) ? provider : DEFAULTS.provider;
}

function normalizePositiveInteger(value, fallback) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function buildProviderReadinessError(message, code = 'AI_PROVIDER_NOT_READY') {
  const error = new Error(message);
  error.name = 'AIProviderReadinessError';
  error.code = code;
  error.errorCode = code;
  error.status = 503;
  error.statusCode = 503;
  error.expose = true;
  return error;
}

function getProviderConfig(env = process.env) {
  const provider = normalizeProvider(env.AI_PROVIDER);
  const enabled = normalizeBoolean(env.AI_PROVIDER_ENABLED, DEFAULTS.enabled);

  return {
    provider,
    enabled,
    openaiApiKey: env.OPENAI_API_KEY || '',
    openaiModel: env.OPENAI_MODEL || DEFAULTS.openaiModel,
    timeoutMs: normalizePositiveInteger(env.AI_PROVIDER_TIMEOUT_MS, DEFAULTS.timeoutMs),
    maxOutputTokens: normalizePositiveInteger(
      env.AI_PROVIDER_MAX_OUTPUT_TOKENS,
      DEFAULTS.maxOutputTokens,
    ),
    dailyBudgetCents: normalizePositiveInteger(
      env.AI_PROVIDER_DAILY_BUDGET_CENTS,
      DEFAULTS.dailyBudgetCents,
    ),
  };
}

function isProviderEnabled(env = process.env) {
  return getProviderConfig(env).enabled;
}

function assertProviderReady(config = getProviderConfig()) {
  if (!config.enabled) {
    return {
      ready: true,
      provider: config.provider,
      enabled: false,
      reason: 'provider_disabled',
    };
  }

  if (!SUPPORTED_PROVIDERS.has(config.provider)) {
    throw buildProviderReadinessError(
      `AI provider "${config.provider}" is not supported`,
      'AI_PROVIDER_UNSUPPORTED',
    );
  }

  if (config.provider === 'openai' && !config.openaiApiKey) {
    throw buildProviderReadinessError(
      'OpenAI provider is enabled but OPENAI_API_KEY is not configured',
      'AI_PROVIDER_MISSING_KEY',
    );
  }

  return {
    ready: true,
    provider: config.provider,
    enabled: config.enabled,
    model: config.provider === 'openai' ? config.openaiModel : 'mock',
  };
}

module.exports = {
  DEFAULTS,
  SUPPORTED_PROVIDERS,
  buildProviderReadinessError,
  getProviderConfig,
  isProviderEnabled,
  assertProviderReady,
};
