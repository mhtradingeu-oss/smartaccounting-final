// DATEV Zahlungsverkehr Export Route Stub
const express = require('express');
const router = express.Router();
const datevExportService = require('../services/datevExportService');

// POST /datev-export/payments
router.post('/payments', async (req, res) => {
  const { payments, clearingAccounts } = req.body;
  const csv = await datevExportService.exportPayments(payments, clearingAccounts);
  res.header('Content-Type', 'text/csv');
  res.send(csv);
});

module.exports = router;
