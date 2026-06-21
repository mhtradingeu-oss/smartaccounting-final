module.exports = {
  admin: {
    allow: ['*'],
  },

  accountant: {
    allow: [
      'GET /health',
      'GET /ready',
      'GET /api/auth/me',
      'POST /api/auth/logout',
      'POST /api/auth/refresh',

      'GET /api/companies',

      'GET /api/invoices',
      'GET /api/invoices/:id',
      'GET /api/invoices/:id/audit-log',
      'GET /api/invoices/:id/payments',
      'POST /api/invoices',
      'PUT /api/invoices/:id',
      'PATCH /api/invoices/:id/status',
      'POST /api/invoices/:id/payments',
      'POST /api/invoices/:id/credit-note',
      'POST /api/invoice-import/preview',
      'POST /api/invoice-import/commit',

      'GET /api/expenses',
      'GET /api/expenses/:id',
      'POST /api/expenses',
      'POST /api/expenses/:id/posting-preview',
      'POST /api/expenses/:id/post',
      'PATCH /api/expenses/:id/status',

      'GET /api/bank-statements',
      'GET /api/bank-statements/:id',
      'GET /api/bank-statements/:id/transactions',
      'GET /api/bank-statements/:id/audit-logs',
      'POST /api/bank-statements/import',
      'POST /api/bank-statements/import/confirm',
      'POST /api/bank-statements/reconcile',
      'POST /api/bank-statements/transactions/:id/reconcile',
      'POST /api/bank-statements/transactions/:id/reconcile/undo',
      'PUT /api/bank-statements/transactions/:id/categorize',

      'GET /api/ai/read/*',
      'POST /api/ai/read/*',
      'GET /api/ai/insights',
      'POST /api/ai/voice/assistant',
      'POST /api/ocr/intake/analyze',
      'POST /api/ocr/process',
      'GET /api/ocr/results/:id',
      'GET /api/ocr/validate/:id',

      'GET /api/exports/*',
      'GET /api/compliance/*',
      'GET /api/tax-reports/*',
      'POST /api/tax-reports/*',
    ],
  },

  auditor: {
    allow: [
      'GET /health',
      'GET /ready',
      'GET /api/auth/me',
      'POST /api/auth/logout',

      'GET /api/companies',

      'GET /api/invoices',
      'GET /api/invoices/:id',
      'GET /api/invoices/:id/audit-log',
      'GET /api/invoices/:id/payments',
      'GET /api/expenses',
      'GET /api/expenses/:id',
      'GET /api/bank-statements',
      'GET /api/bank-statements/:id',
      'GET /api/bank-statements/:id/transactions',
      'GET /api/bank-statements/:id/audit-logs',

      'GET /api/ai/insights',
      'POST /api/ai/voice/assistant',
      'GET /api/ai/read/*',
      'POST /api/ai/read/*',

      'GET /api/exports/*',
      'GET /api/compliance/*',
      'GET /api/tax-reports/*',
    ],
  },

  viewer: {
    allow: [
      'GET /health',
      'GET /ready',
      'GET /api/auth/me',
      'POST /api/auth/logout',

      'GET /api/companies',
      'GET /api/invoices',
      'GET /api/invoices/:id',
      'GET /api/invoices/:id/audit-log',
      'GET /api/invoices/:id/payments',
      'GET /api/expenses',
      'GET /api/expenses/:id',

      'GET /api/telemetry/client-error',
      'GET /api/ai/insights',
      'POST /api/ai/voice/assistant',
      'GET /api/ai/read/*',
      'POST /api/ai/read/*',
    ],
  },
};
