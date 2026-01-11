const express = require('express');
const aiReadOnlyRouter = require('./aiReadOnly');
const aiSuggestRouter = require('../aiSuggest');
const governanceRouter = require('./governance');
const voiceRouter = require('./voice');
const ApiError = require('../../lib/errors/apiError');

const router = express.Router();

// Mount read-only AI endpoints under /api/ai/read
router.use('/read', aiReadOnlyRouter);

// Mount suggestions endpoint under /api/ai/suggest
router.use('/suggest', aiSuggestRouter);
router.get('/suggest', (req, res, next) => {
  return next(new ApiError(501, 'AI_SUGGEST_NOT_READY', 'AI suggestions are not production-ready'));
});

// Mount governance endpoint under /api/ai/governance
router.use('/governance', governanceRouter);
// Mount voice input endpoints under /api/ai/voice
router.use('/voice', voiceRouter);

module.exports = router;
