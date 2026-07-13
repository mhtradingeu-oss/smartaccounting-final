const express = require('express');
const router = express.Router();

const {
  requireCompany,
  requireRole,
} = require('../../middleware/authMiddleware');

const {
  explainEntity,
  explainChain,
} = require('../../services/ai/reasoning/aiReasoningEngine');

const ALLOWED_REASONING_ROLES = [
  'auditor',
];

router.use(requireCompany);
router.use(requireRole(ALLOWED_REASONING_ROLES));

/**
 * Explain single entity
 */
router.get('/explain/:type/:id', (req, res) => {
  try {
    const { type, id } = req.params;
    const result = explainEntity(type, id, req.companyId);

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
    const result = explainChain(req.companyId);

    res.json(result);

  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

module.exports = router;
