const express = require('express');
const router = express.Router();

const ObservabilityController =
  require('../../services/enterprise/observability/api/observability.controller');

/**
 * ENTERPRISE OBSERVABILITY DASHBOARD API
 */

router.get('/health', ObservabilityController.getSystemHealth);
router.get('/events', ObservabilityController.getEventStream);
router.get('/dlq', ObservabilityController.getDLQ);

module.exports = router;
