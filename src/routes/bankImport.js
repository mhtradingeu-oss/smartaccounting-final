// Bank Import Route Stub
const express = require('express');
const router = express.Router();
const bankImportService = require('../services/bankImportService');

// POST /bank-import/camt053
router.post('/camt053', async (req, res) => {
  const { xmlString } = req.body;
  const transactions = await bankImportService.importCAMT053(xmlString);
  res.json({ transactions });
});

// POST /bank-import/mt940
router.post('/mt940', async (req, res) => {
  const { mt940String } = req.body;
  const transactions = await bankImportService.importMT940(mt940String);
  res.json({ transactions });
});

// POST /bank-import/ocr
router.post('/ocr', async (req, res) => {
  const { pdfBuffer } = req.body;
  const transactions = await bankImportService.importOCR(pdfBuffer);
  res.json({ transactions });
});

module.exports = router;
