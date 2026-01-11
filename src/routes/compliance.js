const express = require('express');
const vatComplianceService = require('../services/vatComplianceService');
const { authenticate, requireCompany, requireRole } = require('../middleware/authMiddleware');
const AuditLogService = require('../services/auditLogService');
const ApiError = require('../lib/errors/apiError');

const router = express.Router();

router.use(authenticate);
router.use(requireCompany);

// VAT/UStG compliance validation endpoint
router.post('/validate-transaction', async (req, res, next) => {
  const { net, vat, gross, vatRate, currency } = req.body;
  const result = vatComplianceService.validateTransaction({ net, vat, gross, vatRate, currency });
  if (!result.valid) {
    return next(
      new ApiError(422, 'TRANSACTION_VALIDATION_ERROR', 'Transaction validation failed', {
        errors: result.errors,
      }),
    );
  }
  res.json({ success: true });
});
// GoBD audit log export endpoint
router.get('/gobd/export', requireRole(['auditor']), async (req, res, next) => {
  try {
    const { format = 'json', from, to } = req.query;
    const logs = await AuditLogService.exportLogs({
      format,
      from,
      to,
      companyId: req.companyId,
    });
    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      return res.send(logs);
    }
    res.json({ success: true, logs });
  } catch (err) {
    return next(new ApiError(500, 'INTERNAL_ERROR', 'Failed to export GoBD audit logs'));
  }
});

router.get('/test', (req, res) => {
  res.json({
    message: 'Compliance route is working',
    timestamp: new Date().toISOString(),
  });
});

router.get('/overview', async (req, res) => {
  try {
    const complianceData = {
      ustVoranmeldung: {
        status: 'pending',
        nextDue: '2024-02-10',
        amount: 1250.0,
      },
      jahresabschluss: {
        status: 'draft',
        year: 2023,
        dueDate: '2024-07-31',
      },
      goBD: {
        compliant: true,
        lastCheck: '2024-01-15',
      },
      elster: {
        connected: true,
        certificate: 'valid',
      },
    };

    res.json({
      success: true,
      data: complianceData,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch compliance overview',
    });
  }
});

// Tenant-safe: companyId is derived from the tenant token context
router.get('/reports/:type', (req, res, next) => {
  const tokenCompanyId = req.tokenCompanyId;

  if (tokenCompanyId && String(tokenCompanyId) !== String(req.companyId)) {
    return next(
      new ApiError(403, 'COMPANY_CONTEXT_INVALID', 'Forbidden: company context mismatch'),
    );
  }

  const { type } = req.params;

  const allowedTypes = ['vat', 'tax', 'audit'];
  if (!allowedTypes.includes(type)) {
    return next(new ApiError(400, 'BAD_REQUEST', 'Unsupported report type'));
  }

  return res.status(200).json({
    success: true,
    data: {
      type,
      companyId: req.companyId,
      generatedAt: new Date().toISOString(),
    },
  });
});

router.get('/deadlines', async (req, res) => {
  try {
    const deadlines = [
      {
        type: 'VAT Return',
        dueDate: '2024-02-10',
        status: 'pending',
      },
      {
        type: 'Annual Report',
        dueDate: '2024-07-31',
        status: 'draft',
      },
    ];

    res.json({
      success: true,
      data: deadlines,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch compliance deadlines',
    });
  }
});

module.exports = router;
