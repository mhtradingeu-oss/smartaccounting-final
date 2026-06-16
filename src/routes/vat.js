// VAT API endpoint for UStVA preparation
const express = require('express');
const router = express.Router();
const { runVatDemo } = require('../utils/vat/vatDemo');

// POST /api/vat/ustva
router.post('/ustva', async (req, res) => {
  try {
    const { companyId, periodFrom, periodTo, journalTotals, datevTotals } = req.body;
    const result = await runVatDemo(companyId, periodFrom, periodTo, journalTotals, datevTotals);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
