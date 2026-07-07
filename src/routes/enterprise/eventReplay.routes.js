const express = require('express');
const router = express.Router();

const {
  replayTimeline,
} = require('../../services/enterprise/event-replay/eventReplayEngine');

function buildReplayOptions(req, entityId = null) {
  return {
    entityId,
    companyId: req.query.companyId || null,
    includeSteps: req.query.includeSteps,
    includeWarnings: req.query.includeWarnings,
    limit: req.query.limit,
  };
}

router.get('/', async (req, res) => {
  try {
    const result = await replayTimeline(buildReplayOptions(req, null));
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
    const result = await replayTimeline(buildReplayOptions(req, req.params.entityId));
    return res.json(result);
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = router;
