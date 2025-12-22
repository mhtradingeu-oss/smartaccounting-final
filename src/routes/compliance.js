const express = require('express');
const router = express.Router();
const vatComplianceService = require('../services/vatComplianceService');
const { authenticate, requireRole } = require('../middleware/authMiddleware');
const { disabledFeatureHandler } = require('../utils/disabledFeatureResponse');
const AuditLogService = require('../services/auditLogService');

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

router.use(disabledFeatureHandler('Compliance overview'));

router.get('/test', (req, res) => {
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
        amount: 1250.00,
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

router.get('/reports/:companyId/:type', authenticate, async (req, res) => {
  try {
    const { companyId, type } = req.params;

    const report = {
      companyId,
      type,
      status: 'completed',
      generatedAt: new Date().toISOString(),
      data: {
        period: '2024-01',
        summary: 'Compliance report generated successfully',
      },
    };

    res.json({
      success: true,
      data: report,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to generate compliance report',
    });
  }
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
