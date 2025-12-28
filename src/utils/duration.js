const UNIT_MULTIPLIERS = {
  ms: 1,
  s: 1000,
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000,
};

const DEFAULT_FALLBACK = 0;

const parseDurationMs = (value, fallbackMs = null) => {
  if (value === null || typeof value === 'undefined') {
    return fallbackMs ?? DEFAULT_FALLBACK;
  }

  const normalized = String(value).trim().toLowerCase();
  const match = normalized.match(/^(\d+)(ms|s|m|h|d)$/);
  if (match) {
    const amount = Number(match[1]);
    const unit = match[2];
    const multiplier = UNIT_MULTIPLIERS[unit] ?? 0;
    if (multiplier > 0) {
      return amount * multiplier;
    }
  }

  // Fallback: try to parse as integer milliseconds
  const fallback = Number(normalized);
  if (!Number.isNaN(fallback)) {
    return fallback;
  }

  return fallbackMs ?? DEFAULT_FALLBACK;
};

module.exports = {
  parseDurationMs,
};
