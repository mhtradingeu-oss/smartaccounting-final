// Reconciliation & Locking Route Stub
const express = require('express');
const router = express.Router();
const reconciliationService = require('../services/reconciliationService');

// POST /reconciliation/confirm
router.post('/confirm', async (req, res) => {
  const { bankTransaction, invoiceOrExpense, amountPaid, paymentDate } = req.body;
  const result = await reconciliationService.reconcile({
    bankTransaction,
    invoiceOrExpense,
    amountPaid,
    paymentDate,
  });
  res.json(result);
});

module.exports = router;
