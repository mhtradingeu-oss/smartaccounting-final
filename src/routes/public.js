const express = require('express');
const { getPublicPlansPayload } = require('../services/planService');

const router = express.Router();

router.get('/plans', (req, res) => {
  const payload = getPublicPlansPayload();
  res.json(payload);
});

module.exports = router;
