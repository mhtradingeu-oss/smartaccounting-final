const express = require('express');
const router = express.Router();

const { buildGraph, traceEntity } = require('../../services/audit/graph/TimelineGraphEngine');

/**
 * GET FULL GRAPH
 */
router.get('/full', (req, res) => {
  try {
    const { companyId } = req.query;

    const graph = buildGraph(companyId);

    res.json({
      success: true,
      graph,
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

/**
 * TRACE SINGLE ENTITY
 */
router.get('/trace/:type/:id', (req, res) => {
  try {
    const { type, id } = req.params;
    const { companyId } = req.query;

    const node = traceEntity(type, id, companyId);

    res.json({
      success: true,
      node,
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

module.exports = router;
