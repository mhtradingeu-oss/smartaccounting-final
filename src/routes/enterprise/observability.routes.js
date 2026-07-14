const express = require('express');
const router = express.Router();

const {
  requireCompany,
  requireRole,
} = require('../../middleware/authMiddleware');

const ObservabilityController =
  require('../../services/enterprise/observability/api/observability.controller');

const ALLOWED_OBSERVABILITY_ROLES = [
  'admin',
  'auditor',
];

/**
 * ENTERPRISE OBSERVABILITY DASHBOARD API
 */

router.use(requireCompany);
router.use(requireRole(ALLOWED_OBSERVABILITY_ROLES));

router.get('/health', ObservabilityController.getSystemHealth);
router.get('/events', ObservabilityController.getEventStream);
router.get('/dlq', ObservabilityController.getDLQ);

module.exports = router;
