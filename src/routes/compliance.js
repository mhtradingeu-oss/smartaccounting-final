const express = require('express');
const vatComplianceService = require('../services/vatComplianceService');
const { authenticate, requireRole } = require('../middleware/authMiddleware');
const AuditLogService = require('../services/auditLogService');

const router = express.Router();

// VAT/UStG compliance validation endpoint
router.post('/validate-transaction', authenticate, async (req, res) => {
  const { net, vat, gross, vatRate, currency } = req.body;
  const result = vatComplianceService.validateTransaction({ net, vat, gross, vatRate, currency });
  if (!result.valid) {
    return res.status(422).json({ success: false, errors: result.errors });
  }
  res.json({ success: true });
});
// GoBD audit log export endpoint
router.get('/gobd/export', authenticate, requireRole(['auditor']), async (req, res) => {
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
    res.status(500).json({ success: false, message: 'Failed to export GoBD audit logs' });
  }
});

router.get('/test', authenticate, (req, res) => {
  res.json({
    message: 'Compliance route is working',
    timestamp: new Date().toISOString(),
  });
});

router.get('/overview', authenticate, async (req, res) => {
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
router.get('/reports/:type', (req, res) => {
  const authenticatedCompanyId = req.user?.companyId;
  const tokenCompanyId = req.tokenCompanyId;

  if (!req.user || !authenticatedCompanyId) {
    return res.status(403).json({
      success: false,
      message: 'Company context required',
    });
  }

  // Enforce tenant safety: JWT companyId must match user's real companyId
  if (tokenCompanyId && tokenCompanyId !== authenticatedCompanyId) {
    return res.status(403).json({
      success: false,
      message: 'Forbidden: companyId mismatch',
    });
  }

  if (typeof req.companyId !== 'undefined' && req.companyId !== authenticatedCompanyId) {
    return res.status(403).json({
      success: false,
      message: 'Forbidden: company context mismatch',
    });
  }

  const { type } = req.params;

  const allowedTypes = ['vat', 'tax', 'audit'];
  if (!allowedTypes.includes(type)) {
    return res.status(400).json({
      success: false,
      message: 'Unsupported report type',
    });
  }

  return res.status(200).json({
    success: true,
    data: {
      type,
      companyId: req.user.companyId,
      generatedAt: new Date().toISOString(),
    },
  });
});

router.get('/deadlines', authenticate, async (req, res) => {
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
