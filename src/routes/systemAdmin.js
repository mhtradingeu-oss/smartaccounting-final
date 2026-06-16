const express = require('express');
const requireSystemAdmin = require('../middleware/requireSystemAdmin');
const router = express.Router();

router.use(requireSystemAdmin);

router.get('/overview', async (req, res) => {
  // return safe system status summary (no company financial data)
  res.json({ ok: true });
});

module.exports = router;
