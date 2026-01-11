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
      'POST /api/invoices',
      'PUT /api/invoices/:id',
      'PATCH /api/invoices/:id/status',

      'GET /api/expenses',
      'POST /api/expenses',
      'PATCH /api/expenses/:id/status',

      'GET /api/bank-statements',
      'POST /api/bank-statements/import',
      'POST /api/bank-statements/reconcile',

      'GET /api/ai/read/*',
      'POST /api/ai/read/*',
      'GET /api/ai/insights',
      'POST /api/ai/voice/assistant',

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
      'GET /api/expenses',
      'GET /api/bank-statements',

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

      'GET /api/telemetry/client-error',
      'GET /api/ai/insights',
      'POST /api/ai/voice/assistant',
      'GET /api/ai/read/*',
      'POST /api/ai/read/*',
    ],
  },
};
