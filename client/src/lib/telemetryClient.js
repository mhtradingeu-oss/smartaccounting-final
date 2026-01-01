// Minimal telemetry client for fatal error reporting
export function reportClientError({ route, version, requestId, errorType }) {
  if (import.meta.env.VITE_TELEMETRY_ENABLED !== 'true') {
    return;
  }
  try {
    fetch(import.meta.env.VITE_TELEMETRY_ENDPOINT || '/telemetry/client-error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        route,
        version,
        requestId,
        errorType,
        ts: new Date().toISOString(),
      }),
      keepalive: true,
    });
  } catch (e) {
    void e;
  }
}
