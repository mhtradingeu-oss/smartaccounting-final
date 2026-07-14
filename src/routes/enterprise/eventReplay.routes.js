const express = require('express');
const router = express.Router();

const ApiError = require('../../lib/errors/apiError');
const {
  requireCompany,
  requireRole,
} = require('../../middleware/authMiddleware');

const {
  replayTimeline,
} = require('../../services/enterprise/event-replay/eventReplayEngine');

const ALLOWED_REPLAY_ROLES = [
  'admin',
  'auditor',
];

function rejectClientCompanyScope(req, _res, next) {
  if (
    Object.prototype.hasOwnProperty.call(
      req.query || {},
      'companyId',
    )
  ) {
    return next(
      new ApiError(
        400,
        'COMPANY_SCOPE_CLIENT_OVERRIDE_FORBIDDEN',
        'Company scope must be derived from authenticated context',
      ),
    );
  }

  return next();
}

router.use(requireCompany);
router.use(requireRole(ALLOWED_REPLAY_ROLES));

function buildReplayOptions(req, entityId = null) {
  return {
    entityId,
    companyId: req.companyId,
    includeSteps: req.query.includeSteps,
    includeWarnings: req.query.includeWarnings,
    limit: req.query.limit,
  };
}

router.get('/', rejectClientCompanyScope, async (req, res, next) => {
  try {
    const result = await replayTimeline(buildReplayOptions(req, null));
    return res.json(result);
  } catch (_error) {
    return next(
      new ApiError(
        500,
        'INTERNAL_ERROR',
        'Failed to run enterprise replay',
      ),
    );
  }
});

router.get('/:entityId', rejectClientCompanyScope, async (req, res, next) => {
  try {
    const result = await replayTimeline(buildReplayOptions(req, req.params.entityId));
    return res.json(result);
  } catch (_error) {
    return next(
      new ApiError(
        500,
        'INTERNAL_ERROR',
        'Failed to run enterprise replay',
      ),
    );
  }
});

module.exports = router;
