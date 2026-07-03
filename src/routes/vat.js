// VAT API endpoint for UStVA preparation only.
// This route prepares review/export data and does not submit anything to ELSTER or Finanzamt.
const express = require('express');

const router = express.Router();
const { runVatDemo } = require('../utils/vat/vatDemo');

const VAT_PREPARATION_BOUNDARIES = [
  'UStVA preparation data only.',
  'No ELSTER submission is performed.',
  'No transmission to Finanzamt is performed.',
  'Review with a qualified Steuerberater before filing.',
];

const isValidDateString = (value) =>
  typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);

const normalizeCompanyId = (bodyCompanyId, requestCompanyId) => {
  const value = bodyCompanyId ?? requestCompanyId;
  const numeric = Number(value);

  if (!Number.isInteger(numeric) || numeric <= 0) {
    return null;
  }

  return numeric;
};

const validateUstvaPreparationPayload = (req) => {
  const companyId = normalizeCompanyId(req.body?.companyId, req.companyId);

  if (!companyId) {
    return {
      error: {
        code: 'VAT_USTVA_COMPANY_REQUIRED',
        message: 'A valid companyId is required to prepare UStVA data.',
      },
    };
  }

  if (!isValidDateString(req.body?.periodFrom) || !isValidDateString(req.body?.periodTo)) {
    return {
      error: {
        code: 'VAT_USTVA_PERIOD_REQUIRED',
        message: 'Valid periodFrom and periodTo dates are required in YYYY-MM-DD format.',
      },
    };
  }

  return {
    value: {
      companyId,
      periodFrom: req.body.periodFrom,
      periodTo: req.body.periodTo,
      journalTotals: req.body.journalTotals || {},
      datevTotals: req.body.datevTotals || {},
    },
  };
};

// POST /api/vat/ustva
router.post('/ustva', async (req, res) => {
  const { error, value } = validateUstvaPreparationPayload(req);

  if (error) {
    return res.status(400).json({
      success: false,
      mode: 'preparation_only',
      error,
      sourceBoundaries: VAT_PREPARATION_BOUNDARIES,
    });
  }

  try {
    const result = await runVatDemo(
      value.companyId,
      value.periodFrom,
      value.periodTo,
      value.journalTotals,
      value.datevTotals,
    );

    res.setHeader(
      'X-Export-Disclaimer',
      'Prepared for tax advisor / UStVA preparation only. No ELSTER submission or certification.',
    );

    return res.json({
      success: true,
      mode: 'preparation_only',
      product: 'SmartAccounting Tax Bridge',
      sourceBoundaries: VAT_PREPARATION_BOUNDARIES,
      ...result,
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      mode: 'preparation_only',
      error: {
        code: 'VAT_USTVA_PREPARATION_FAILED',
        message: err.message || 'Failed to prepare UStVA data.',
      },
      sourceBoundaries: VAT_PREPARATION_BOUNDARIES,
    });
  }
});

module.exports = router;
