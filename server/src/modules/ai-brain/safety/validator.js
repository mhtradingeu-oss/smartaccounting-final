function validateAIOutput(analysis) {

  const allowedIntents = [
    'CREATE_EXPENSE',
    'CREATE_INVOICE',
    'MATCH_BANK',
  ];

  if (!analysis || typeof analysis !== 'object') {
    throw new Error('INVALID_AI_OUTPUT');
  }

  if (!allowedIntents.includes(analysis.intent)) {
    return {
      safe: false,
      reason: 'UNSUPPORTED_INTENT',
    };
  }

  if (analysis.amount && analysis.amount < 0) {
    return {
      safe: false,
      reason: 'NEGATIVE_AMOUNT_BLOCKED',
    };
  }

  return {
    safe: true,
    data: analysis,
  };
}

module.exports = { validateAIOutput };
