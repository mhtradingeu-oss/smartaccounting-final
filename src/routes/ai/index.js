const express = require('express');
const aiReadOnlyRouter = require('./aiReadOnly');
const governanceRouter = require('./governance');

const router = express.Router();

// Mount read-only AI endpoints under /api/ai/read
router.use('/read', aiReadOnlyRouter);
// Mount governance endpoint under /api/ai/governance
router.use('/governance', governanceRouter);

module.exports = router;
