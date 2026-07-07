const express = require('express');
const router = express.Router();

const {
  explainReplay,
} = require('../../services/enterprise/event-replay/explanation/replayExplanationEngine');

function buildOptions(req, entityId = null) {
  return {
    entityId,
    companyId: req.query.companyId || null,
    includeSteps: false,
    includeWarnings: false,
    limit: req.query.limit || 10,
  };
}

router.get('/', async (req, res) => {
  try {
    const result = await explainReplay(buildOptions(req, null));
    return res.json(result);
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

router.get('/:entityId', async (req, res) => {
  try {
    const result = await explainReplay(buildOptions(req, req.params.entityId));
    return res.json(result);
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = router;
