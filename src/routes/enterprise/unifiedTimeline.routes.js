const express = require('express');
const ApiError = require('../../lib/errors/apiError');
const {
  requireCompany,
  requireRole,
} = require('../../middleware/authMiddleware');
const {
  getUnifiedTimeline,
} = require('../../services/enterprise/unified-read-model/unifiedTimelineService');

const router = express.Router();

const ALLOWED_TIMELINE_ROLES = ['admin', 'accountant', 'auditor', 'viewer'];

function rejectClientCompanyScope(req, _res, next) {
  if (Object.prototype.hasOwnProperty.call(req.query || {}, 'companyId')) {
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

async function getTimeline(req, res, next) {
  try {
    const entityId = req.params?.entityId || null;
    const result = await getUnifiedTimeline(entityId, req.companyId);

    return res.json({
      success: true,
      ...result,
    });
  } catch (_error) {
    return next(
      new ApiError(
        500,
        'INTERNAL_ERROR',
        'Failed to load unified timeline',
      ),
    );
  }
}

router.use(requireCompany);
router.use(requireRole(ALLOWED_TIMELINE_ROLES));

router.get('/:entityId', rejectClientCompanyScope, getTimeline);
router.get('/', rejectClientCompanyScope, getTimeline);

module.exports = router;
