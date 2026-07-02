'use strict';

function buildProviderTimeoutError(timeoutMs, metadata = {}) {
  const error = new Error(`AI provider timed out after ${timeoutMs}ms`);
  error.name = 'AIProviderTimeoutError';
  error.code = 'AI_PROVIDER_TIMEOUT';
  error.errorCode = 'AI_PROVIDER_TIMEOUT';
  error.status = 504;
  error.statusCode = 504;
  error.metadata = metadata;
  return error;
}

function withProviderTimeout(promise, timeoutMs, metadata = {}) {
  const parsedTimeout = Number(timeoutMs);
  const safeTimeoutMs = Number.isInteger(parsedTimeout) && parsedTimeout > 0 ? parsedTimeout : 8000;

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(buildProviderTimeoutError(safeTimeoutMs, metadata));
    }, safeTimeoutMs);

    Promise.resolve(promise)
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

module.exports = {
  buildProviderTimeoutError,
  withProviderTimeout,
};
