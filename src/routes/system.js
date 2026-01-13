const express = require('express');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const ApiError = require('../lib/errors/apiError');
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
const { getSystemPlansFallback } = require('../services/planService');
const demoSimulationService = require('../services/demoSimulationService');

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

router.get('/overview', async (req, res, next) => {
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
    next(new ApiError(500, 'System overview failed', 'SYSTEM_OVERVIEW_ERROR'));
  }
});

router.get('/health-detailed', async (req, res, next) => {
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
    next(new ApiError(500, 'Health check failed', 'SYSTEM_HEALTH_ERROR'));
  }
});

router.get('/stats', async (req, res, next) => {
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
    next(new ApiError(500, 'Internal server error', 'SYSTEM_STATS_ERROR'));
  }
});

router.get('/db-test', async (req, res, next) => {
  try {
    await sequelize.authenticate();
    res.json({
      status: 'connected',
      database: sequelize.config.database,
      host: sequelize.config.host,
    });
  } catch (error) {
    logger.error('Database test error:', error);
    next(new ApiError(500, 'Database connection failed', 'DB_CONNECTION_ERROR'));
  }
});

router.get('/companies', async (req, res, next) => {
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
          sequelize.literal(
            '(SELECT COUNT(*) FROM users WHERE users."companyId" = "Company"."id")',
          ),
          'userCount',
        ],
      ],
      order: [['createdAt', 'DESC']],
    });

    res.json({ companies });
  } catch (error) {
    logger.error('System companies list error:', error);
    next(new ApiError(500, 'Failed to load companies', 'COMPANIES_LIST_ERROR'));
  }
});

router.post('/companies', async (req, res, next) => {
  try {
    const { name, taxId, address, city, postalCode, country, ownerUserId } = req.body || {};
    const required = { name, taxId, address, city, postalCode, country };
    const missing = Object.entries(required)
      .filter(([, value]) => !value)
      .map(([key]) => key);
    if (missing.length) {
      return next(
        new ApiError(
          400,
          `Missing required fields: ${missing.join(', ')}`,
          'MISSING_REQUIRED_FIELDS',
        ),
      );
    }

    let owner = null;
    if (ownerUserId) {
      owner = await User.findByPk(ownerUserId);
      if (!owner) {
        return next(new ApiError(404, 'Owner user not found', 'OWNER_USER_NOT_FOUND'));
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
    next(new ApiError(500, 'Failed to create company', 'COMPANY_CREATE_ERROR'));
  }
});

router.patch('/companies/:companyId/suspend', async (req, res, next) => {
  try {
    const company = await Company.findByPk(req.params.companyId);
    if (!company) {
      return next(new ApiError(404, 'Company not found', 'COMPANY_NOT_FOUND'));
    }

    const reason = (req.body?.reason || '').trim();
    await company.update({
      isActive: false,
      suspendedAt: new Date(),
    });

    res.json({ company, reason: reason || null });
  } catch (error) {
    logger.error('System company suspend error:', error);
    next(new ApiError(500, 'Failed to suspend company', 'COMPANY_SUSPEND_ERROR'));
  }
});

router.patch('/companies/:companyId/restore', async (req, res, next) => {
  try {
    const company = await Company.findByPk(req.params.companyId);
    if (!company) {
      return next(new ApiError(404, 'Company not found', 'COMPANY_NOT_FOUND'));
    }

    await company.update({
      isActive: true,
      suspendedAt: null,
    });

    res.json({ company });
  } catch (error) {
    logger.error('System company restore error:', error);
    next(new ApiError(500, 'Failed to restore company', 'COMPANY_RESTORE_ERROR'));
  }
});

router.patch('/companies/:companyId/flags', async (req, res, next) => {
  try {
    const company = await Company.findByPk(req.params.companyId);
    if (!company) {
      return next(new ApiError(404, 'Company not found', 'COMPANY_NOT_FOUND'));
    }

    const updates = {};
    if (typeof req.body?.aiEnabled === 'boolean') {
      updates.aiEnabled = req.body.aiEnabled;
    }
    if (typeof req.body?.ttsEnabled === 'boolean') {
      updates.ttsEnabled = req.body.ttsEnabled;
    }

    if (!Object.keys(updates).length) {
      return next(new ApiError(400, 'No flag updates provided', 'NO_FLAG_UPDATES'));
    }

    await company.update(updates);
    res.json({ company });
  } catch (error) {
    logger.error('System company flag update error:', error);
    next(new ApiError(500, 'Failed to update company flags', 'COMPANY_FLAGS_UPDATE_ERROR'));
  }
});

router.delete('/companies/:companyId', async (req, res, next) => {
  try {
    const company = await Company.findByPk(req.params.companyId);
    if (!company) {
      return next(new ApiError(404, 'Company not found', 'COMPANY_NOT_FOUND'));
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
      return next(
        new ApiError(
          409,
          'Company has existing records and cannot be deleted. Suspend the company instead.',
          'COMPANY_DELETE_CONFLICT',
          {
            counts: {
              users: userCount,
              invoices: invoiceCount,
              expenses: expenseCount,
              bankStatements: statementCount,
              bankTransactions: transactionCount,
              taxReports: reportCount,
            },
          },
        ),
      );
    }

    await company.destroy();
    res.json({ success: true });
  } catch (error) {
    logger.error('System company delete error:', error);
    next(new ApiError(500, 'Failed to delete company', 'COMPANY_DELETE_ERROR'));
  }
});

router.get('/users', async (req, res, next) => {
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
    next(new ApiError(500, 'Failed to load users', 'USERS_LIST_ERROR'));
  }
});

router.post('/users', async (req, res, next) => {
  try {
    const { email, password, firstName, lastName, role, companyId } = req.body || {};
    if (!email || !password || !firstName || !lastName) {
      return next(new ApiError(400, 'Missing required fields', 'MISSING_REQUIRED_FIELDS'));
    }

    const normalizedEmail = normalizeEmail(email);
    const existing = await User.findOne({ where: { email: normalizedEmail } });
    if (existing) {
      return next(new ApiError(400, 'Email already registered', 'EMAIL_ALREADY_REGISTERED'));
    }

    const resolvedRole = role || 'viewer';
    if (!companyId && resolvedRole !== 'admin') {
      return next(new ApiError(400, 'System users must have admin role', 'SYSTEM_USER_ROLE_ERROR'));
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
    next(new ApiError(500, 'Failed to create user', 'USER_CREATE_ERROR'));
  }
});

router.patch('/users/:userId', async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.userId);
    if (!user) {
      return next(new ApiError(404, 'User not found', 'USER_NOT_FOUND'));
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
      return next(new ApiError(400, 'No updates provided', 'NO_UPDATES_PROVIDED'));
    }

    const nextCompanyId = Object.prototype.hasOwnProperty.call(updates, 'companyId')
      ? updates.companyId
      : user.companyId;
    const nextRole = updates.role || user.role;
    if ((nextCompanyId === null || nextCompanyId === undefined) && nextRole !== 'admin') {
      return next(new ApiError(400, 'System users must have admin role', 'SYSTEM_USER_ROLE_ERROR'));
    }

    await user.update(updates);
    res.json({ user: user.toJSON() });
  } catch (error) {
    logger.error('System user update error:', error);
    next(new ApiError(500, 'Failed to update user', 'USER_UPDATE_ERROR'));
  }
});

router.get('/plans', async (req, res, next) => {
  try {
    const plans = getSystemPlansFallback();
    res.json({ plans });
  } catch (error) {
    logger.error('System plans error:', error);
    next(new ApiError(500, 'Failed to load plans', 'PLANS_LIST_ERROR'));
  }
});

router.get('/subscriptions', async (req, res, next) => {
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
    next(new ApiError(500, 'Failed to load subscriptions', 'SUBSCRIPTIONS_LIST_ERROR'));
  }
});

router.get('/feature-flags', async (req, res, next) => {
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
    next(new ApiError(500, 'Failed to load feature flags', 'FEATURE_FLAGS_ERROR'));
  }
});

router.get('/audit-logs', async (req, res, next) => {
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

    // If no logs and demo mode enabled, generate demo logs
    if (logs.length === 0 && demoSimulationService.DEMO_MODE_ENABLED) {
      demoSimulationService.logDemoSimulation('system_audit_logs', { limit });
      const demoLogs = demoSimulationService.generateDemoAuditLogs(null, null, Math.min(limit, 10));

      return res.json({
        logs: demoLogs,
        demo: true,
        _simulated: true,
        message: 'Simulated audit logs for demo environment',
      });
    }

    res.json({
      logs,
      demo: false,
    });
  } catch (error) {
    logger.error('System audit logs error:', error);
    next(new ApiError(500, 'Failed to load audit logs', 'AUDIT_LOGS_ERROR'));
  }
});

router.get('/backups', async (req, res, next) => {
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
    next(new ApiError(500, 'Failed to load backups', 'BACKUPS_ERROR'));
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
