const UNIT_MULTIPLIERS = {
  ms: 1,
  s: 1000,
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000,
};

function parseDurationToMs(value, fallback = 0) {
  if (!value) {
    return fallback;
  }

  const normalized = value.toString().trim().toLowerCase();
  const matches = normalized.match(/^(\d+)(ms|s|m|h|d)?$/);
  if (!matches) {
    return fallback;
  }

  const amount = Number(matches[1]);
  if (!Number.isFinite(amount)) {
    return fallback;
  }

  const unit = matches[2] || 'ms';
  const multiplier = UNIT_MULTIPLIERS[unit] || UNIT_MULTIPLIERS.ms;
  const duration = amount * multiplier;
  return duration > 0 ? duration : fallback;
}

module.exports = {
  parseDurationToMs,
};
