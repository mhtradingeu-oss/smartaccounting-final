const REQUIRED_CLIENT_ENV = ['VITE_API_URL', 'VITE_APP_ENV'];
const SENSITIVE_SERVER_ENV = [
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'DATABASE_URL',
  'STRIPE_SECRET_KEY',
  'EMAIL_USER',
  'EMAIL_PASS',
  'REDIS_URL',
  'ELSTER_CERTIFICATE_PATH',
  'CACHE_TTL',
  'FRONTEND_URL',
];

const normalize = (value) => (typeof value === 'string' ? value.trim() : value);

export function validateClientEnv() {
  if (import.meta.env.TEST) {
    return;
  }

  if (import.meta.env.PROD) {
    const missing = REQUIRED_CLIENT_ENV.filter((name) => !normalize(import.meta.env[name]));
    if (missing.length) {
      console.warn(
        `[SmartAccounting] Missing required frontend environment variable${missing.length > 1 ? 's' : ''} in production: ${missing.join(
          ', ',
        )}`,
      );
    }
  }

  const exposed = SENSITIVE_SERVER_ENV.filter((name) => normalize(import.meta.env[name]));
  if (exposed.length) {
    console.error(
      `[SmartAccounting] Unsafe server environment exposed to client: ${exposed.join(
        ', ',
      )}. Remove or rename these values.`,
    );
  }
}
