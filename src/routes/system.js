const express = require('express');
const { Company, User, Invoice, TaxReport, sequelize } = require('../models');
const { authenticate, requireRole } = require('../middleware/authMiddleware');
const logger = require('../lib/logger');
const buildMetadata = require('../config/buildMetadata');

const router = express.Router();

router.get('/info', authenticate, requireRole(['admin']), (req, res) => {
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

router.get('/version', (req, res) => {
  res.json({
    success: true,
    metadata: buildMetadata,
  });
});

router.get('/health-detailed', authenticate, requireRole(['admin']), async (req, res) => {
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

router.get('/stats', authenticate, requireRole(['admin']), async (req, res) => {
  try {
    const [
      totalUsers,
      totalCompanies,
      totalInvoices,
      totalTaxReports,
    ] = await Promise.all([
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

router.get('/db-test', authenticate, requireRole(['admin']), async (req, res) => {
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

module.exports = router;
