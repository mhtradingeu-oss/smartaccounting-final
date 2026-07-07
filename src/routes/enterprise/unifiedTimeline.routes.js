const express = require('express');
const router = express.Router();

const {
  getUnifiedTimeline,
} = require('../../services/enterprise/unified-read-model/unifiedTimelineService');

router.get('/:entityId', async (req, res) => {
  try {
    const { entityId } = req.params;
    const { companyId } = req.query;

    const result = await getUnifiedTimeline(entityId, companyId);

    return res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

router.get('/', async (req, res) => {
  try {
    const { companyId } = req.query;

    const result = await getUnifiedTimeline(null, companyId);

    return res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = router;
