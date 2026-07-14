const express = require('express');
const router = express.Router();

const {
  requireCompany,
  requireRole,
} = require('../../middleware/authMiddleware');

const {
  buildGraph,
  traceEntity,
} = require('../../services/audit/graph/TimelineGraphEngine');

const ALLOWED_GRAPH_ROLES = [
  'admin',
  'accountant',
  'auditor',
  'viewer',
];

router.use(requireCompany);
router.use(requireRole(ALLOWED_GRAPH_ROLES));

/**
 * GET FULL GRAPH
 */
router.get('/full', async (req, res) => {
  try {
    const graph = await buildGraph(req.companyId);

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
router.get('/trace/:type/:id', async (req, res) => {
  try {
    const { type, id } = req.params;
    const node = await traceEntity(type, id, req.companyId);

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
