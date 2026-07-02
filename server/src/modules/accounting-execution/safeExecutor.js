const executor = require('./executor');
const { validateAIOutput } = require('../ai-brain/safety/validator');

class SafeExecutor {

  async execute(aiResult) {

    const validation = validateAIOutput(aiResult);

    if (!validation.safe) {
      return {
        status: 'BLOCKED',
        reason: validation.reason,
      };
    }

    return await executor.execute(validation.data);
  }
}

module.exports = new SafeExecutor();
