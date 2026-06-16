// ELSTER / UStVA Export Route Stub
const express = require('express');
const router = express.Router();
const elsterExportService = require('../services/elsterExportService');

// POST /elster-export/ustva
router.post('/ustva', async (req, res) => {
  const { vatSummary, companyInfo } = req.body;
  const xml = await elsterExportService.exportUStVA({ vatSummary, companyInfo });
  res.header('Content-Type', 'application/xml');
  res.send(xml);
});

module.exports = router;
