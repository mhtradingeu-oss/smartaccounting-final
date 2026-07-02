const brain = require('../../ai-brain/llm/brain.llm');

async function generateIntent(transcript) {
  return await brain.analyze(transcript);
}

module.exports = { generateIntent };
