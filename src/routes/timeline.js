const express = require('express');
const router = express.Router();

// SAFE IMPORT (no breaking dependency)
const { getTimeline } = require('../services/finance/event-consumer/eventConsumer.service');

/**
 * GET APPROVAL TIMELINE
 */
router.get('/approval/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { companyId } = req.query;

    const timeline = getTimeline(id, companyId);

    return res.json({
      success: true,
      type: 'approval',
      id,
      timeline,
      count: timeline.length,
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

/**
 * GET LEDGER TIMELINE
 */
router.get('/ledger/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { companyId } = req.query;

    const timeline = getTimeline(id, companyId);

    return res.json({
      success: true,
      type: 'ledger',
      id,
      timeline,
      count: timeline.length,
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

/**
 * GET TIMELINE BY ENTITY (Approval / Ledger / Invoice)
 */
router.get('/:entityId', async (req, res) => {
  try {
    const { entityId } = req.params;
    const { companyId } = req.query;

    const timeline = getTimeline(entityId, companyId);

    return res.json({
      success: true,
      entityId,
      companyId,
      timeline,
      count: timeline.length,
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

module.exports = router;
