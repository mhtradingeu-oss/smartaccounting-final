const SCRIPT_TAG_REGEX = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi;

const sanitizeString = (value) => {
  if (typeof value !== 'string') {
    return value;
  }

  return value.replace(SCRIPT_TAG_REGEX, '');
};

const sanitizePayload = (payload) => {
  if (Array.isArray(payload)) {
    return payload.map((item) => sanitizePayload(item));
  }

  if (payload && typeof payload === 'object') {
    const sanitized = {};
    Object.entries(payload).forEach(([key, value]) => {
      sanitized[key] = sanitizePayload(value);
    });
    return sanitized;
  }

  return sanitizeString(payload);
};

const containsNoSqlOperators = (value) => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  if (Array.isArray(value)) {
    return value.some((item) => containsNoSqlOperators(item));
  }

  return Object.keys(value).some((key) => {
    if (key.startsWith('$')) {
      return true;
    }

    return containsNoSqlOperators(value[key]);
  });
};

module.exports = {
  sanitizePayload,
  containsNoSqlOperators,
};
