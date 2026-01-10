const express = require('express');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const {
  Company,
  User,
  Invoice,
  Expense,
  BankStatement,
  BankTransaction,
  TaxReport,
  AuditLog,
  sequelize,
} = require('../models');
const { authenticate, requireSystemAdmin } = require('../middleware/authMiddleware');
const { getMaintenanceState, setMaintenanceState } = require('../lib/maintenanceMode');
const { performanceMonitor } = require('../middleware/performance');
const logger = require('../lib/logger');
const buildMetadata = require('../config/buildMetadata');
const StripeService = require('../services/stripeService');
const { getSystemPlansFallback } = require('../services/planService');

const router = express.Router();

const normalizeEmail = (email) => (email || '').toLowerCase().trim();

const parseLimit = (value, fallback = 200) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.min(parsed, 1000);
};

router.get('/version', (req, res) => {
  res.json({
    success: true,
    metadata: buildMetadata,
  });
});

router.use(authenticate);
router.use(requireSystemAdmin);

router.get('/info', (req, res) => {
  res.json({
    status: 'SmartAccounting System',
    version: buildMetadata.packageVersion,
    environment: process.env.NODE_ENV || 'development',
    features: {
      multiTenant: true,
      germanTaxCompliance: true,
      ocrProcessing: true,
      taxAccountingEngine: true,
      skr03Classification: true,
      elsterExport: true,
      gobdCompliant: true,
      stripeIntegration: !!process.env.STRIPE_SECRET_KEY,
    },
    timestamp: new Date().toISOString(),
  });
});

router.get('/overview', async (req, res) => {
  try {
    const [totalUsers, totalCompanies, totalInvoices, totalTaxReports] = await Promise.all([
      User.count(),
      Company.count(),
      Invoice.count(),
      TaxReport.count(),
    ]);

    const monitoring = performanceMonitor.getMetrics();

    res.json({
      status: 'SmartAccounting System',
      version: buildMetadata.packageVersion,
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      counts: {
        users: totalUsers,
        companies: totalCompanies,
        invoices: totalInvoices,
        taxReports: totalTaxReports,
      },
      maintenance: getMaintenanceState(),
      monitoring: {
        requests: monitoring.requests,
        errors: monitoring.errors,
        averageResponseTime: monitoring.averageResponseTime,
        errorRate: monitoring.errorRate,
        slowRequestRate: monitoring.slowRequestRate,
        uptime: monitoring.uptime,
        memory: monitoring.memory,
      },
    });
  } catch (error) {
    logger.error('System overview error:', error);
    res.status(500).json({ error: 'System overview failed' });
  }
});

router.get('/health-detailed', async (req, res) => {
  try {
    let databaseStatus = 'unknown';

    try {
      await sequelize.authenticate();
      databaseStatus = 'connected';
    } catch (error) {
      databaseStatus = 'disconnected';
    }

    res.json({
      status: 'healthy',
      database: databaseStatus,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ error: 'Health check failed' });
  }
});

router.get('/stats', async (req, res) => {
  try {
    const [totalUsers, totalCompanies, totalInvoices, totalTaxReports] = await Promise.all([
      User.count(),
      Company.count(),
      Invoice.count(),
      TaxReport.count(),
    ]);

    const stats = {
      users: totalUsers,
      companies: totalCompanies,
      invoices: totalInvoices,
      taxReports: totalTaxReports,
      systemHealth: 'operational',
    };

    res.json(stats);
  } catch (error) {
    logger.error('System stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/db-test', async (req, res) => {
  try {
    await sequelize.authenticate();
    res.json({
      status: 'connected',
      database: sequelize.config.database,
      host: sequelize.config.host,
    });
  } catch (error) {
    logger.error('Database test error:', error);
    res.status(500).json({ error: 'Database connection failed' });
  }
});

router.get('/companies', async (req, res) => {
  try {
    const companies = await Company.findAll({
      attributes: [
        'id',
        'name',
        'taxId',
        'city',
        'country',
        'aiEnabled',
        'ttsEnabled',
        'isActive',
        'suspendedAt',
        'subscriptionPlan',
        'subscriptionStatus',
        'stripeCustomerId',
        'stripeSubscriptionId',
        'createdAt',
        'updatedAt',
        [
          sequelize.literal('(SELECT COUNT(*) FROM users WHERE users."companyId" = "Company"."id")'),
          'userCount',
        ],
      ],
      order: [['createdAt', 'DESC']],
    });

    res.json({ companies });
  } catch (error) {
    logger.error('System companies list error:', error);
    res.status(500).json({ error: 'Failed to load companies' });
  }
});

router.post('/companies', async (req, res) => {
  try {
    const { name, taxId, address, city, postalCode, country, ownerUserId } = req.body || {};
    const required = { name, taxId, address, city, postalCode, country };
    const missing = Object.entries(required)
      .filter(([, value]) => !value)
      .map(([key]) => key);
    if (missing.length) {
      return res.status(400).json({ error: `Missing required fields: ${missing.join(', ')}` });
    }

    let owner = null;
    if (ownerUserId) {
      owner = await User.findByPk(ownerUserId);
      if (!owner) {
        return res.status(404).json({ error: 'Owner user not found' });
      }
    }

    const company = await Company.create({
      name,
      taxId,
      address,
      city,
      postalCode,
      country,
      userId: owner?.id || null,
      isActive: true,
    });

    res.status(201).json({ company });
  } catch (error) {
    logger.error('System company create error:', error);
    res.status(500).json({ error: 'Failed to create company' });
  }
});

router.patch('/companies/:companyId/suspend', async (req, res) => {
  try {
    const company = await Company.findByPk(req.params.companyId);
    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    const reason = (req.body?.reason || '').trim();
    await company.update({
      isActive: false,
      suspendedAt: new Date(),
    });

    res.json({ company, reason: reason || null });
  } catch (error) {
    logger.error('System company suspend error:', error);
    res.status(500).json({ error: 'Failed to suspend company' });
  }
});

router.patch('/companies/:companyId/restore', async (req, res) => {
  try {
    const company = await Company.findByPk(req.params.companyId);
    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    await company.update({
      isActive: true,
      suspendedAt: null,
    });

    res.json({ company });
  } catch (error) {
    logger.error('System company restore error:', error);
    res.status(500).json({ error: 'Failed to restore company' });
  }
});

router.patch('/companies/:companyId/flags', async (req, res) => {
  try {
    const company = await Company.findByPk(req.params.companyId);
    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    const updates = {};
    if (typeof req.body?.aiEnabled === 'boolean') {
      updates.aiEnabled = req.body.aiEnabled;
    }
    if (typeof req.body?.ttsEnabled === 'boolean') {
      updates.ttsEnabled = req.body.ttsEnabled;
    }

    if (!Object.keys(updates).length) {
      return res.status(400).json({ error: 'No flag updates provided' });
    }

    await company.update(updates);
    res.json({ company });
  } catch (error) {
    logger.error('System company flag update error:', error);
    res.status(500).json({ error: 'Failed to update company flags' });
  }
});

router.delete('/companies/:companyId', async (req, res) => {
  try {
    const company = await Company.findByPk(req.params.companyId);
    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    const [userCount, invoiceCount, expenseCount, statementCount, transactionCount, reportCount] =
      await Promise.all([
        User.count({ where: { companyId: company.id } }),
        Invoice.count({ where: { companyId: company.id } }),
        Expense.count({ where: { companyId: company.id } }),
        BankStatement.count({ where: { companyId: company.id } }),
        BankTransaction.count({ where: { companyId: company.id } }),
        TaxReport.count({ where: { companyId: company.id } }),
      ]);

    if (
      userCount ||
      invoiceCount ||
      expenseCount ||
      statementCount ||
      transactionCount ||
      reportCount
    ) {
      return res.status(409).json({
        error: 'Company has existing records and cannot be deleted. Suspend the company instead.',
        counts: {
          users: userCount,
          invoices: invoiceCount,
          expenses: expenseCount,
          bankStatements: statementCount,
          bankTransactions: transactionCount,
          taxReports: reportCount,
        },
      });
    }

    await company.destroy();
    res.json({ success: true });
  } catch (error) {
    logger.error('System company delete error:', error);
    res.status(500).json({ error: 'Failed to delete company' });
  }
});

router.get('/users', async (req, res) => {
  try {
    const users = await User.findAll({
      include: [
        {
          model: Company,
          as: 'company',
          attributes: ['id', 'name'],
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    const payload = users.map((user) => {
      const item = user.toJSON();
      return {
        ...item,
        isSystemAdmin: user.role === 'admin' && !user.companyId,
      };
    });

    res.json({ users: payload });
  } catch (error) {
    logger.error('System users list error:', error);
    res.status(500).json({ error: 'Failed to load users' });
  }
});

router.post('/users', async (req, res) => {
  try {
    const { email, password, firstName, lastName, role, companyId } = req.body || {};
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const normalizedEmail = normalizeEmail(email);
    const existing = await User.findOne({ where: { email: normalizedEmail } });
    if (existing) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const resolvedRole = role || 'viewer';
    if (!companyId && resolvedRole !== 'admin') {
      return res.status(400).json({ error: 'System users must have admin role' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      email: normalizedEmail,
      password: hashedPassword,
      firstName,
      lastName,
      role: resolvedRole,
      companyId: companyId || null,
      isActive: true,
    });

    res.status(201).json({ user: user.toJSON() });
  } catch (error) {
    logger.error('System user create error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

router.patch('/users/:userId', async (req, res) => {
  try {
    const user = await User.findByPk(req.params.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const updates = {};
    if (req.body?.role) {
      updates.role = req.body.role;
    }
    if (Object.prototype.hasOwnProperty.call(req.body, 'isActive')) {
      updates.isActive = Boolean(req.body.isActive);
    }
    if (Object.prototype.hasOwnProperty.call(req.body, 'companyId')) {
      updates.companyId = req.body.companyId || null;
    }

    if (!Object.keys(updates).length) {
      return res.status(400).json({ error: 'No updates provided' });
    }

    const nextCompanyId =
      Object.prototype.hasOwnProperty.call(updates, 'companyId') ? updates.companyId : user.companyId;
    const nextRole = updates.role || user.role;
    if ((nextCompanyId === null || nextCompanyId === undefined) && nextRole !== 'admin') {
      return res.status(400).json({ error: 'System users must have admin role' });
    }

    await user.update(updates);
    res.json({ user: user.toJSON() });
  } catch (error) {
    logger.error('System user update error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

router.get('/plans', async (req, res) => {
  try {
    let plans = [];
    try {
      plans = await StripeService.getPricingPlans();
    } catch (error) {
      plans = getSystemPlansFallback();
    }

    res.json({ plans });
  } catch (error) {
    logger.error('System plans error:', error);
    res.status(500).json({ error: 'Failed to load plans' });
  }
});

router.get('/subscriptions', async (req, res) => {
  try {
    const companies = await Company.findAll({
      attributes: [
        'id',
        'name',
        'subscriptionPlan',
        'subscriptionStatus',
        'stripeCustomerId',
        'stripeSubscriptionId',
        'updatedAt',
      ],
      order: [['name', 'ASC']],
    });
    res.json({ subscriptions: companies });
  } catch (error) {
    logger.error('System subscriptions error:', error);
    res.status(500).json({ error: 'Failed to load subscriptions' });
  }
});

router.get('/feature-flags', async (req, res) => {
  try {
    const totalCompanies = await Company.count();
    const aiEnabledCount = await Company.count({ where: { aiEnabled: true } });
    const ttsEnabledCount = await Company.count({ where: { ttsEnabled: true } });

    res.json({
      flags: {
        BANK_IMPORT_ENABLED: String(process.env.BANK_IMPORT_ENABLED || 'false'),
        OCR_PREVIEW_ENABLED: String(process.env.OCR_PREVIEW_ENABLED || 'false'),
        AI_ASSISTANT_ENABLED: String(process.env.AI_ASSISTANT_ENABLED || 'true'),
        AI_VOICE_ENABLED: String(process.env.AI_VOICE_ENABLED || 'false'),
      },
      companyAI: {
        totalCompanies,
        aiEnabledCount,
        ttsEnabledCount,
      },
    });
  } catch (error) {
    logger.error('System feature flags error:', error);
    res.status(500).json({ error: 'Failed to load feature flags' });
  }
});

router.get('/audit-logs', async (req, res) => {
  try {
    const limit = parseLimit(req.query.limit);
    const logs = await AuditLog.findAll({
      order: [['timestamp', 'DESC']],
      limit,
      attributes: [
        'id',
        'action',
        'resourceType',
        'resourceId',
        'oldValues',
        'newValues',
        'ipAddress',
        'userAgent',
        'timestamp',
        'userId',
        'reason',
        'companyId',
      ],
    });
    res.json({ logs });
  } catch (error) {
    logger.error('System audit logs error:', error);
    res.status(500).json({ error: 'Failed to load audit logs' });
  }
});

router.get('/backups', async (req, res) => {
  try {
    const backupsDir = path.resolve(process.cwd(), 'backups');
    let files = [];
    try {
      const entries = await fs.promises.readdir(backupsDir);
      files = await Promise.all(
        entries.map(async (entry) => {
          const fullPath = path.join(backupsDir, entry);
          const stats = await fs.promises.stat(fullPath);
          return {
            name: entry,
            size: stats.size,
            modifiedAt: stats.mtime.toISOString(),
          };
        }),
      );
    } catch (error) {
      files = [];
    }

    const lastBackup = files
      .slice()
      .sort((a, b) => new Date(b.modifiedAt) - new Date(a.modifiedAt))[0];

    res.json({
      backups: files,
      count: files.length,
      lastBackup: lastBackup || null,
    });
  } catch (error) {
    logger.error('System backups error:', error);
    res.status(500).json({ error: 'Failed to load backups' });
  }
});

router.get('/maintenance', (req, res) => {
  res.json({ maintenance: getMaintenanceState() });
});

router.post('/maintenance', (req, res) => {
  const { enabled, reason } = req.body || {};
  const updated = setMaintenanceState({ enabled, reason });
  res.json({ maintenance: updated });
});

router.get('/config', (req, res) => {
  res.json({
    config: {
      NODE_ENV: process.env.NODE_ENV || 'development',
      API_BASE_URL: process.env.API_BASE_URL || '/api',
      PORT: process.env.PORT || null,
      CLIENT_URL: process.env.CLIENT_URL || null,
      FRONTEND_URL: process.env.FRONTEND_URL || null,
      CORS_ORIGIN: process.env.CORS_ORIGIN || null,
      LOG_LEVEL: process.env.LOG_LEVEL || null,
      STRIPE_CONFIGURED: !!process.env.STRIPE_SECRET_KEY,
    },
  });
});

router.get('/monitoring', (req, res) => {
  const metrics = performanceMonitor.getMetrics();
  res.json({
    monitoring: {
      requests: metrics.requests,
      errors: metrics.errors,
      averageResponseTime: metrics.averageResponseTime,
      errorRate: metrics.errorRate,
      slowRequestRate: metrics.slowRequestRate,
      memory: metrics.memory,
      cpu: metrics.cpu,
      uptime: metrics.uptime,
      load: metrics.load,
    },
  });
});

module.exports = router;
