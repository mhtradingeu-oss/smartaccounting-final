'use strict';

const FORBIDDEN_EXACT_DATABASE_NAMES = new Set([
  'smartaccounting',
  'postgres',
  'template0',
  'template1',
]);

const FORBIDDEN_PARTIAL_DATABASE_NAMES = ['production', 'prod'];

function parseDatabaseTarget(databaseUrl) {
  if (typeof databaseUrl !== 'string' || databaseUrl.trim() === '') {
    return {
      ok: false,
      protocol: 'unknown',
      host: 'unknown',
      databaseName: '',
    };
  }

  try {
    const parsed = new URL(databaseUrl.trim());
    const protocol = String(parsed.protocol || '')
      .replace(/:$/, '')
      .toLowerCase();
    const host = String(parsed.hostname || '').trim() || 'unknown';
    const pathname = String(parsed.pathname || '');
    const rawDatabaseName = pathname.startsWith('/') ? pathname.slice(1) : pathname;
    const databaseName = decodeURIComponent(rawDatabaseName).trim();

    return {
      ok: true,
      protocol,
      host,
      databaseName,
    };
  } catch (_error) {
    return {
      ok: false,
      protocol: 'unknown',
      host: 'unknown',
      databaseName: '',
    };
  }
}

function parseAllowedDatabaseNames(rawAllowedNames) {
  if (Array.isArray(rawAllowedNames)) {
    rawAllowedNames = rawAllowedNames.join(',');
  }

  if (typeof rawAllowedNames !== 'string' || rawAllowedNames.trim() === '') {
    return [];
  }

  const deduped = new Set();
  rawAllowedNames
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean)
    .forEach((name) => {
      deduped.add(name);
    });

  return Array.from(deduped);
}

function isRejectedDatabaseName(databaseName) {
  const normalized = String(databaseName || '')
    .trim()
    .toLowerCase();
  if (!normalized) {
    return false;
  }

  if (FORBIDDEN_EXACT_DATABASE_NAMES.has(normalized)) {
    return true;
  }

  return FORBIDDEN_PARTIAL_DATABASE_NAMES.some((fragment) => normalized.includes(fragment));
}

function createSafetyError({ protocol, host, databaseName, allowedNames }) {
  const allowedList =
    Array.isArray(allowedNames) && allowedNames.length > 0 ? allowedNames.join(',') : '(none)';
  const error = new Error(
    `Test database safety violation: protocol=${protocol || 'unknown'} host=${host || 'unknown'} database=${databaseName || '(empty)'} allowed=[${allowedList}]`,
  );
  error.name = 'TestDatabaseSafetyError';
  error.code = 'TEST_DATABASE_SAFETY_VIOLATION';
  return error;
}

function assertSafeTestDatabaseTarget(options = {}) {
  const env = options.env || process.env;
  const nodeEnv = String(options.nodeEnv ?? env.NODE_ENV ?? '')
    .trim()
    .toLowerCase();
  const useSqlite = String(options.useSqlite ?? env.USE_SQLITE ?? '')
    .trim()
    .toLowerCase();

  if (!(nodeEnv === 'test' && useSqlite === 'false')) {
    return {
      applicable: false,
      passed: true,
    };
  }

  const hasDatabaseUrlOption = Object.prototype.hasOwnProperty.call(options, 'databaseUrl');
  const hasAllowedNamesOption = Object.prototype.hasOwnProperty.call(options, 'allowedNames');
  const databaseUrl = hasDatabaseUrlOption ? options.databaseUrl : env.DATABASE_URL;
  const allowedNames = parseAllowedDatabaseNames(
    hasAllowedNamesOption ? options.allowedNames : env.TEST_DATABASE_ALLOWED_NAMES,
  );
  const target = parseDatabaseTarget(databaseUrl);

  if (!target.ok) {
    throw createSafetyError({
      protocol: target.protocol,
      host: target.host,
      databaseName: target.databaseName,
      allowedNames,
    });
  }

  if (target.protocol !== 'postgres' && target.protocol !== 'postgresql') {
    throw createSafetyError({
      protocol: target.protocol,
      host: target.host,
      databaseName: target.databaseName,
      allowedNames,
    });
  }

  if (!target.databaseName) {
    throw createSafetyError({
      protocol: target.protocol,
      host: target.host,
      databaseName: target.databaseName,
      allowedNames,
    });
  }

  if (allowedNames.length === 0) {
    throw createSafetyError({
      protocol: target.protocol,
      host: target.host,
      databaseName: target.databaseName,
      allowedNames,
    });
  }

  if (isRejectedDatabaseName(target.databaseName)) {
    throw createSafetyError({
      protocol: target.protocol,
      host: target.host,
      databaseName: target.databaseName,
      allowedNames,
    });
  }

  if (!allowedNames.includes(target.databaseName)) {
    throw createSafetyError({
      protocol: target.protocol,
      host: target.host,
      databaseName: target.databaseName,
      allowedNames,
    });
  }

  return {
    applicable: true,
    passed: true,
    protocol: target.protocol,
    host: target.host,
    databaseName: target.databaseName,
    allowedNames,
  };
}

module.exports = {
  parseDatabaseTarget,
  parseAllowedDatabaseNames,
  assertSafeTestDatabaseTarget,
};
