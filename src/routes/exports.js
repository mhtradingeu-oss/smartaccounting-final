const express = require('express');
const { authenticate, requireRole } = require('../middleware/authMiddleware');
const {
  Invoice,
  InvoiceItem,
  Expense,
  TaxReport,
  AIInsight,
  AIInsightDecision,
} = require('../models');
const AuditLogService = require('../services/auditLogService');
const { Op } = require('sequelize');

const router = express.Router();

const SUPPORTED_FORMATS = ['json', 'csv'];

const ensureFormat = (value) => {
  const fmt = (value || 'json').toLowerCase();
  if (!SUPPORTED_FORMATS.includes(fmt)) {
    const err = new Error(`Unsupported format: ${value}`);
    err.status = 400;
    throw err;
  }
  return fmt;
};

const parseDate = (value) => {
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const buildDateWhere = (field, from, to) => {
  const range = {};
  if (from) {
    range[Op.gte] = from;
  }
  if (to) {
    range[Op.lte] = to;
  }
  if (!Object.keys(range).length) {
    return {};
  }
  return { [field]: range };
};

const serializeCsv = (headers, rows) => {
  const escape = (value) => {
    if (value === null || value === undefined) {
      return '';
    }
    const stringified = typeof value === 'string' ? value : JSON.stringify(value);
    return `"${stringified.replace(/"/g, '""')}"`;
  };
  const lines = [
    headers.map(escape).join(','),
    ...rows.map((row) => headers.map((h) => escape(row[h])).join(',')),
  ];
  return lines.join('\n');
};

const sendCsvResponse = (res, filename, headers, rows) => {
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(serializeCsv(headers, rows));
};

router.get('/audit-logs', authenticate, requireRole(['auditor']), async (req, res) => {
  try {
    const format = ensureFormat(req.query.format);
    const from = parseDate(req.query.from);
    const to = parseDate(req.query.to);
    const logs = await AuditLogService.exportLogs({
      format,
      from,
      to,
      companyId: req.companyId,
    });
    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="audit-logs.csv"');
      return res.send(logs);
    }
    return res.json({ success: true, logs });
  } catch (error) {
    res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Failed to export audit logs',
    });
  }
});

router.get('/accounting-records', authenticate, requireRole(['auditor']), async (req, res) => {
  try {
    const format = ensureFormat(req.query.format);
    const from = parseDate(req.query.from);
    const to = parseDate(req.query.to);
    const invoiceWhere = {
      companyId: req.companyId,
      ...buildDateWhere('date', from, to),
    };
    const expenseWhere = {
      companyId: req.companyId,
      ...buildDateWhere('expenseDate', from, to),
    };
    const invoices = await Invoice.findAll({
      where: invoiceWhere,
      include: [{ model: InvoiceItem, as: 'items' }],
      order: [['date', 'ASC']],
    });
    const expenses = await Expense.findAll({
      where: expenseWhere,
      order: [['expenseDate', 'ASC']],
    });
    const payload = {
      invoices: invoices.map((invoice) => invoice.get({ plain: true })),
      expenses: expenses.map((expense) => expense.get({ plain: true })),
    };
    if (format === 'csv') {
      const headers = [
        'recordType',
        'id',
        'reference',
        'date',
        'status',
        'netAmount',
        'vatAmount',
        'grossAmount',
        'currency',
        'payload',
      ];
      const rows = [
        ...payload.invoices.map((invoice) => ({
          recordType: 'invoice',
          id: invoice.id,
          reference: invoice.invoiceNumber,
          date: invoice.date,
          status: invoice.status,
          netAmount: invoice.subtotal,
          vatAmount: invoice.total - invoice.subtotal,
          grossAmount: invoice.total,
          currency: invoice.currency,
          payload: JSON.stringify({
            dueDate: invoice.dueDate,
            items: invoice.items,
          }),
        })),
        ...payload.expenses.map((expense) => ({
          recordType: 'expense',
          id: expense.id,
          reference: expense.vendorName || 'manual-expense',
          date: expense.expenseDate,
          status: expense.status,
          netAmount: expense.netAmount,
          vatAmount: expense.vatAmount,
          grossAmount: expense.grossAmount,
          currency: expense.currency,
          payload: JSON.stringify({
            category: expense.category,
            notes: expense.notes,
          }),
        })),
      ];
      return sendCsvResponse(res, 'accounting-records.csv', headers, rows);
    }
    return res.json({
      success: true,
      records: payload,
    });
  } catch (error) {
    res.status(error.status || 500).json({
      success: false,
      message: 'Failed to export accounting records',
    });
  }
});

router.get('/', authenticate, async (req, res, next) => {
  try {
    const companyId = req.user.companyId; // 🔒 المصدالوحيدر

    const expenses = await Expense.findAll({
      where: { companyId },
      order: [['createdAt', 'DESC']],
    });

    res.json({ success: true, data: expenses });
  } catch (err) {
    next(err);
  }
});

router.get('/vat-summaries', authenticate, requireRole(['auditor']), async (req, res) => {
  try {
    const format = ensureFormat(req.query.format);
    const from = parseDate(req.query.from);
    const to = parseDate(req.query.to);
    const where = {
      companyId: req.companyId,
      ...buildDateWhere('createdAt', from, to),
    };
    const reports = await TaxReport.findAll({
      where,
      order: [['createdAt', 'DESC']],
    });
    if (format === 'csv') {
      const headers = [
        'id',
        'reportType',
        'period',
        'status',
        'year',
        'generatedAt',
        'submittedAt',
        'data',
      ];
      const rows = reports.map((report) => ({
        id: report.id,
        reportType: report.reportType,
        period: report.period,
        status: report.status,
        year: report.year,
        generatedAt: report.generatedAt,
        submittedAt: report.submittedAt,
        data: JSON.stringify(report.data),
      }));
      return sendCsvResponse(res, 'vat-summaries.csv', headers, rows);
    }
    return res.json({
      success: true,
      reports: reports.map((report) => report.get({ plain: true })),
    });
  } catch (error) {
    res.status(error.status || 500).json({
      success: false,
      message: 'Failed to export VAT summaries',
    });
  }
});

router.get('/ai-decisions', authenticate, requireRole(['auditor']), async (req, res) => {
  try {
    const format = ensureFormat(req.query.format);
    const from = parseDate(req.query.from);
    const to = parseDate(req.query.to);
    const where = {
      companyId: req.companyId,
      ...buildDateWhere('createdAt', from, to),
    };
    const insights = await AIInsight.findAll({
      where,
      include: [{ model: AIInsightDecision, as: 'decisions' }],
      order: [['createdAt', 'ASC']],
    });
    const payload = insights.map((insight) => insight.get({ plain: true }));
    if (format === 'csv') {
      const headers = [
        'insightId',
        'decisionId',
        'decision',
        'actorUserId',
        'reason',
        'insightSummary',
        'insightWhy',
        'modelVersion',
      ];
      const rows = [];
      payload.forEach((insight) => {
        (insight.decisions || []).forEach((decision) => {
          rows.push({
            insightId: insight.id,
            decisionId: decision.id,
            decision: decision.decision,
            actorUserId: decision.actorUserId,
            reason: decision.reason,
            insightSummary: insight.summary,
            insightWhy: insight.why,
            modelVersion: insight.modelVersion,
          });
        });
        if (!insight.decisions || insight.decisions.length === 0) {
          rows.push({
            insightId: insight.id,
            decisionId: 'pending',
            decision: 'pending',
            actorUserId: 'system',
            reason: 'awaiting review',
            insightSummary: insight.summary,
            insightWhy: insight.why,
            modelVersion: insight.modelVersion,
          });
        }
      });
      return sendCsvResponse(res, 'ai-decisions.csv', headers, rows);
    }
    return res.json({ success: true, insights: payload });
  } catch (error) {
    res.status(error.status || 500).json({
      success: false,
      message: 'Failed to export AI decisions',
    });
  }
});

module.exports = router;
