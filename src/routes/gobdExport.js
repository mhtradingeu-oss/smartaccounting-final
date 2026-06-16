// GoBD / GDPdU Audit Export Route Stub
const express = require('express');
const router = express.Router();
const gobdExportService = require('../services/gobdExportService');

// POST /gobd-export/audit
router.post('/audit', async (req, res) => {
  const { bankTransactions, payments, invoices, expenses } = req.body;
  const csv = await gobdExportService.exportAuditData({
    bankTransactions,
    payments,
    invoices,
    expenses,
  });
  res.header('Content-Type', 'text/csv');
  res.send(csv);
});

module.exports = router;
