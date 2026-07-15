const express = require('express');
const { requireRole, requireCompany } = require('../middleware/authMiddleware');
const financialReportService = require('../services/financialReportService');

const {
  getBwaReport,
} = require('../services/reporting/bwa/bwaReportService');

const ApiError = require('../lib/errors/apiError');

const router = express.Router();


const escapeCsvValue = (value) => {
  if (value === null || value === undefined) {
    return '';
  }

  return `"${String(value).replace(/"/g, '""')}"`;
};

const REPORT_EXPORT_COLUMNS = {
  'trial-balance': [
    'accountId',
    'accountCode',
    'accountName',
    'accountType',
    'normalBalance',
    'debitTotal',
    'creditTotal',
    'balance',
  ],
  'profit-loss': [
    'section',
    'accountId',
    'accountCode',
    'accountName',
    'accountType',
    'debitTotal',
    'creditTotal',
    'balance',
  ],
  'balance-sheet': [
    'section',
    'accountId',
    'accountCode',
    'accountName',
    'accountType',
    'debitTotal',
    'creditTotal',
    'balance',
  ],
  'general-ledger': [
    'accountId',
    'accountCode',
    'accountName',
    'accountType',
    'normalBalance',
    'openingBalance',
    'closingBalance',
    'journalEntryId',
    'journalEntryLineId',
    'entryDate',
    'sourceType',
    'sourceId',
    'description',
    'debit',
    'credit',
    'balanceImpact',
  ],
  'account-ledger': [
    'accountId',
    'accountCode',
    'accountName',
    'accountType',
    'normalBalance',
    'openingBalance',
    'closingBalance',
    'journalEntryId',
    'journalEntryLineId',
    'entryDate',
    'sourceType',
    'sourceId',
    'description',
    'debit',
    'credit',
    'balanceImpact',
  ],
  'vat-summary': [
    'journalEntryId',
    'journalEntryLineId',
    'entryDate',
    'sourceType',
    'sourceId',
    'accountId',
    'accountCode',
    'accountName',
    'accountType',
    'taxCategory',
    'vatDirection',
    'taxCode',
    'vatRate',
    'debit',
    'credit',
    'amount',
    'description',
  ],
};

const getReportExportColumns = (reportType, rows = []) => {
  const configuredColumns = REPORT_EXPORT_COLUMNS[reportType] || [];
  const dynamicColumns = Array.from(
    rows.reduce((set, row) => {
      Object.keys(row || {}).forEach((key) => set.add(key));
      return set;
    }, new Set()),
  );

  return Array.from(new Set([...configuredColumns, ...dynamicColumns]));
};

const toCsv = (rows = [], reportType = null) => {
  const columns = getReportExportColumns(reportType, rows);

  const header = columns.join(',');
  const body = rows
    .map((row) => columns.map((column) => escapeCsvValue(row[column])).join(','))
    .join('\n');

  return body ? `${header}\n${body}` : `${header}\n`;
};

const flattenReportForExport = (reportType, report) => {
  if (!report) {
    return [];
  }

  if (reportType === 'trial-balance') {
    return report.rows || [];
  }

  if (reportType === 'profit-loss') {
    return [
      ...(report.revenue?.rows || []).map((row) => ({ section: 'revenue', ...row })),
      ...(report.expenses?.rows || []).map((row) => ({ section: 'expenses', ...row })),
    ];
  }

  if (reportType === 'balance-sheet') {
    return [
      ...(report.assets?.rows || []).map((row) => ({ section: 'assets', ...row })),
      ...(report.liabilities?.rows || []).map((row) => ({ section: 'liabilities', ...row })),
      ...(report.equity?.rows || []).map((row) => ({ section: 'equity', ...row })),
    ];
  }

  if (reportType === 'general-ledger') {
    return (report.accounts || []).flatMap((account) =>
      (account.movements || []).map((movement) => ({
        accountId: account.accountId,
        accountCode: account.accountCode,
        accountName: account.accountName,
        accountType: account.accountType,
        normalBalance: account.normalBalance,
        openingBalance: account.openingBalance,
        closingBalance: account.closingBalance,
        ...movement,
      })),
    );
  }

  if (reportType === 'account-ledger') {
    return (report.movements || []).map((movement) => ({
      accountId: report.account?.accountId || null,
      accountCode: report.account?.accountCode || null,
      accountName: report.account?.accountName || null,
      accountType: report.account?.accountType || null,
      normalBalance: report.account?.normalBalance || null,
      openingBalance: report.openingBalance,
      closingBalance: report.closingBalance,
      ...movement,
    }));
  }

  if (reportType === 'vat-summary') {
    return report.rows || [];
  }

  return [];
};

const buildFinancialReportForExport = async ({ reportType, companyId, query }) => {
  if (reportType === 'trial-balance') {
    return financialReportService.getTrialBalance({
      companyId,
      from: query.from || null,
      to: query.to || null,
    });
  }

  if (reportType === 'profit-loss') {
    return financialReportService.getProfitAndLoss({
      companyId,
      from: query.from || null,
      to: query.to || null,
    });
  }

  if (reportType === 'balance-sheet') {
    return financialReportService.getBalanceSheet({
      companyId,
      asOf: query.asOf || query.to || null,
    });
  }

  if (reportType === 'general-ledger') {
    return financialReportService.getGeneralLedger({
      companyId,
      from: query.from || null,
      to: query.to || null,
      accountId: query.accountId || null,
      accountCode: query.accountCode || null,
      sourceType: query.sourceType || null,
    });
  }

  if (reportType === 'account-ledger') {
    return financialReportService.getAccountLedger({
      companyId,
      from: query.from || null,
      to: query.to || null,
      accountId: query.accountId || null,
      accountCode: query.accountCode || null,
      sourceType: query.sourceType || null,
    });
  }

  if (reportType === 'vat-summary') {
    return financialReportService.getVatSummary({
      companyId,
      from: query.from || null,
      to: query.to || null,
      taxCode: query.taxCode || null,
      vatRate: query.vatRate || null,
    });
  }

  const error = new Error('Unsupported report type');
  error.status = 400;
  error.code = 'UNSUPPORTED_REPORT_TYPE';
  throw error;
};


function rejectBwaClientCompanyScope(req, _res, next) {
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

function parseStrictIntegerQuery(value) {
  if (
    typeof value !== 'string' ||
    !/^\d+$/.test(value)
  ) {
    return null;
  }

  const parsed = Number(value);

  return Number.isSafeInteger(parsed)
    ? parsed
    : null;
}

function mapBwaRouteError(error) {
  const status =
    error?.status ||
    error?.statusCode ||
    500;

  if (
    status >= 400 &&
    status < 500 &&
    error?.code
  ) {
    return error;
  }

  return new ApiError(
    500,
    'INTERNAL_ERROR',
    'Failed to generate BWA report',
  );
}

router.use(requireCompany);



router.get(
  '/bwa',
  requireRole([
    'admin',
    'accountant',
    'auditor',
    'viewer',
  ]),
  rejectBwaClientCompanyScope,
  async (req, res, next) => {
    try {
      const year = parseStrictIntegerQuery(
        req.query.year,
      );

      if (year === null) {
        return next(
          new ApiError(
            400,
            'BWA_REPORT_INVALID_YEAR_QUERY',
            'year must be an integer query parameter',
          ),
        );
      }

      const toMonth = parseStrictIntegerQuery(
        req.query.toMonth,
      );

      if (
        toMonth === null ||
        toMonth < 1 ||
        toMonth > 12
      ) {
        return next(
          new ApiError(
            400,
            'BWA_REPORT_INVALID_MONTH_QUERY',
            'toMonth must be an integer from 1 through 12',
          ),
        );
      }

      const report = await getBwaReport({
        companyId: req.companyId,
        year,
        toMonth,
        definitionId:
          req.query.definitionId || undefined,
      });

      return res.status(200).json({
        success: true,
        report,
      });
    } catch (error) {
      return next(
        mapBwaRouteError(error),
      );
    }
  },
);

router.get('/export', requireRole(['admin', 'accountant', 'auditor']), async (req, res, next) => {
  try {
    const reportType = String(req.query.reportType || '').toLowerCase();
    const format = String(req.query.format || 'json').toLowerCase();

    if (!reportType) {
      return res.status(400).json({
        success: false,
        error: true,
        message: 'reportType is required',
        errorCode: 'REPORT_TYPE_REQUIRED',
      });
    }

    if (!['json', 'csv'].includes(format)) {
      return res.status(400).json({
        success: false,
        error: true,
        message: 'Unsupported export format',
        errorCode: 'UNSUPPORTED_EXPORT_FORMAT',
      });
    }

    const report = await buildFinancialReportForExport({
      reportType,
      companyId: req.companyId,
      query: req.query,
    });

    const rows = flattenReportForExport(reportType, report);

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment;filename="${reportType}.csv"`);
      return res.status(200).send(toCsv(rows, reportType));
    }

    return res.status(200).json({
      success: true,
      meta: {
        companyId: req.companyId,
        reportType,
        format,
        count: rows.length,
        filters: report.filters || {},
      },
      report,
      rows,
    });
  } catch (error) {
    return next(error);
  }
});

router.get('/trial-balance', requireRole(['admin', 'accountant', 'auditor', 'viewer']), async (req, res, next) => {
  try {
    const report = await financialReportService.getTrialBalance({
      companyId: req.companyId,
      from: req.query.from || null,
      to: req.query.to || null,
    });

    return res.status(200).json({
      success: true,
      report,
    });
  } catch (error) {
    return next(error);
  }
});


router.get('/profit-loss', requireRole(['admin', 'accountant', 'auditor', 'viewer']), async (req, res, next) => {
  try {
    const report = await financialReportService.getProfitAndLoss({
      companyId: req.companyId,
      from: req.query.from || null,
      to: req.query.to || null,
    });

    return res.status(200).json({
      success: true,
      report,
    });
  } catch (error) {
    return next(error);
  }
});


router.get('/balance-sheet', requireRole(['admin', 'accountant', 'auditor', 'viewer']), async (req, res, next) => {
  try {
    const report = await financialReportService.getBalanceSheet({
      companyId: req.companyId,
      asOf: req.query.asOf || req.query.to || null,
    });

    return res.status(200).json({
      success: true,
      report,
    });
  } catch (error) {
    return next(error);
  }
});


router.get('/general-ledger', requireRole(['admin', 'accountant', 'auditor', 'viewer']), async (req, res, next) => {
  try {
    const report = await financialReportService.getGeneralLedger({
      companyId: req.companyId,
      from: req.query.from || null,
      to: req.query.to || null,
      accountId: req.query.accountId || null,
      accountCode: req.query.accountCode || null,
      sourceType: req.query.sourceType || null,
    });

    return res.status(200).json({
      success: true,
      report,
    });
  } catch (error) {
    return next(error);
  }
});


router.get('/account-ledger', requireRole(['admin', 'accountant', 'auditor', 'viewer']), async (req, res, next) => {
  try {
    const report = await financialReportService.getAccountLedger({
      companyId: req.companyId,
      from: req.query.from || null,
      to: req.query.to || null,
      accountId: req.query.accountId || null,
      accountCode: req.query.accountCode || null,
      sourceType: req.query.sourceType || null,
    });

    return res.status(200).json({
      success: true,
      report,
    });
  } catch (error) {
    return next(error);
  }
});


router.get('/vat-summary', requireRole(['admin', 'accountant', 'auditor', 'viewer']), async (req, res, next) => {
  try {
    const report = await financialReportService.getVatSummary({
      companyId: req.companyId,
      from: req.query.from || null,
      to: req.query.to || null,
      taxCode: req.query.taxCode || null,
      vatRate: req.query.vatRate || null,
    });

    return res.status(200).json({
      success: true,
      report,
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
