const express = require('express');
const aiReadOnlyRouter = require('./aiReadOnly');

const router = express.Router();

// Mount read-only AI endpoints under /api/ai/read
router.use('/read', aiReadOnlyRouter);

module.exports = router;
