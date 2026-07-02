const { generateIntent } = require('./intent.engine');
const safeExecutor = require('../../accounting-execution/safeExecutor');

async function processSafePipeline(transcript, tenant) {

  const analysis = await generateIntent(transcript);

  const execution = await safeExecutor.execute({
    ...analysis,
    companyId: tenant.companyId,
  });

  return {
    transcript,
    analysis,
    execution,
    status: execution.status === 'BLOCKED'
      ? 'REJECTED_BY_AI_BRAIN'
      : 'EXECUTED_BY_LLM_BRAIN',
  };
}

module.exports = { processSafePipeline };
