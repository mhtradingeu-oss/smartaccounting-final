const express = require('express');
const router = express.Router();

const {
  explainEntity,
  explainChain,
} = require('../../services/ai/reasoning/aiReasoningEngine');

/**
 * Explain single entity
 */
router.get('/explain/:type/:id', (req, res) => {
  try {
    const { type, id } = req.params;
    const { companyId } = req.query;

    const result = explainEntity(type, id, companyId);

    res.json(result);

  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

/**
 * Explain full system chain
 */
router.get('/chain', (req, res) => {
  try {
    const { companyId } = req.query;

    const result = explainChain(companyId);

    res.json(result);

  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

module.exports = router;
