// Matching Engine Route Stub
const express = require('express');
const router = express.Router();
const matchingEngineService = require('../services/matchingEngineService');

// POST /matching-engine/suggest
router.post('/suggest', async (req, res) => {
  const { bankTransactions, invoices, expenses } = req.body;
  const proposals = await matchingEngineService.suggestMatches(
    bankTransactions,
    invoices,
    expenses,
  );
  res.json({ proposals });
});

module.exports = router;
