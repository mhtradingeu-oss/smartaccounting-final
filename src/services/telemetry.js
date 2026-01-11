const TELEMETRY_ENABLED = process.env.TELEMETRY_ENABLED === 'true';

async function reportError({
  error,
  requestId,
  userId,
  companyId,
  route,
  status,
  errorCode,
  details,
}) {
  if (!TELEMETRY_ENABLED) {return;}
  // Minimal safe contract: log to console
  console.error('[Telemetry] Error:', {
    error: error?.message || error,
    requestId,
    userId,
    companyId,
    route,
    status,
    errorCode,
    details,
  });
}

function log(level, message, meta) {
  if (!TELEMETRY_ENABLED) {return;}
  console.log(`[Telemetry][${level}]`, message, meta || {});
}

module.exports = { reportError, log };
