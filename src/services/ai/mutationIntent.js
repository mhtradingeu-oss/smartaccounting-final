const config = require('../../../shared/ai/mutationIntentConfig.json');

const compiledPatterns = config.patterns.map((pattern) => ({
  regex: new RegExp(pattern.pattern, pattern.flags || 'i'),
  reason: pattern.reason || `pattern:${pattern.pattern}`,
}));

function detectMutationIntent(prompt) {
  if (!prompt || typeof prompt !== 'string') {
    return { detected: false };
  }
  const normalized = prompt.toLowerCase();
  for (const keyword of config.keywords) {
    if (normalized.includes(keyword)) {
      return { detected: true, reason: `keyword:${keyword}` };
    }
  }
  for (const { regex, reason } of compiledPatterns) {
    if (regex.test(prompt)) {
      return { detected: true, reason };
    }
  }
  return { detected: false };
}

module.exports = {
  detectMutationIntent,
};
