const ROUTE_PATTERNS = [
  {
    pattern: /^\/dashboard\/?$/,
    context: {
      module: 'dashboard',
      routeName: 'dashboard',
      label: 'Dashboard',
    },
  },
  {
    pattern: /^\/ai-manager\/?$/,
    context: {
      module: 'ai_manager',
      routeName: 'ai_manager',
      label: 'AI Manager',
    },
  },
  {
    pattern: /^\/ai-assistant\/?$/,
    context: {
      module: 'ai_assistant',
      routeName: 'ai_assistant',
      label: 'AI Assistant',
    },
  },
  {
    pattern: /^\/ai-advisor\/?$/,
    context: {
      module: 'ai_insights',
      routeName: 'ai_insights',
      label: 'AI Insights',
    },
  },
  {
    pattern: /^\/invoices\/import\/?$/,
    context: {
      module: 'invoices',
      routeName: 'invoice_import',
      entityType: null,
      label: 'Invoice import',
    },
  },
  {
    pattern: /^\/invoices\/create\/?$/,
    context: {
      module: 'invoices',
      routeName: 'invoice_create',
      entityType: null,
      label: 'Create invoice',
    },
  },
  {
    pattern: /^\/invoices\/([^/]+)\/edit\/?$/,
    context: {
      module: 'invoices',
      routeName: 'invoice_edit',
      entityType: 'invoice',
      label: 'Invoice edit',
    },
    entityKey: 'invoiceId',
  },
  {
    pattern: /^\/invoices\/?$/,
    context: {
      module: 'invoices',
      routeName: 'invoice_list',
      entityType: null,
      label: 'Invoices',
    },
  },
  {
    pattern: /^\/expenses\/create\/?$/,
    context: {
      module: 'expenses',
      routeName: 'expense_create',
      entityType: null,
      label: 'Create expense',
    },
  },
  {
    pattern: /^\/expenses\/?$/,
    context: {
      module: 'expenses',
      routeName: 'expense_list',
      entityType: null,
      label: 'Expenses',
    },
  },
  {
    pattern: /^\/bank-statements\/import\/?$/,
    context: {
      module: 'bank_statements',
      routeName: 'bank_statement_import',
      entityType: null,
      label: 'Bank statement import',
    },
  },
  {
    pattern: /^\/bank-statements\/([^/]+)\/reconcile\/?$/,
    context: {
      module: 'bank_statements',
      routeName: 'bank_statement_reconciliation',
      entityType: 'bank_statement',
      label: 'Bank reconciliation',
    },
    entityKey: 'statementId',
  },
  {
    pattern: /^\/bank-statements\/([^/]+)\/?$/,
    context: {
      module: 'bank_statements',
      routeName: 'bank_statement_detail',
      entityType: 'bank_statement',
      label: 'Bank statement detail',
    },
    entityKey: 'statementId',
  },
  {
    pattern: /^\/bank-statements\/?$/,
    context: {
      module: 'bank_statements',
      routeName: 'bank_statement_list',
      entityType: null,
      label: 'Bank statements',
    },
  },
  {
    pattern: /^\/tax-reports\/?$/,
    context: {
      module: 'tax_reports',
      routeName: 'tax_reports',
      entityType: null,
      label: 'Tax reports',
    },
  },
  {
    pattern: /^\/german-tax-reports\/?$/,
    context: {
      module: 'tax_reports',
      routeName: 'german_tax_reports',
      entityType: null,
      label: 'German tax reports',
    },
  },
  {
    pattern: /^\/exports\/datev\/?$/,
    context: {
      module: 'datev_export',
      routeName: 'datev_export',
      entityType: null,
      label: 'DATEV export',
    },
  },
  {
    pattern: /^\/exports\/?$/,
    context: {
      module: 'exports',
      routeName: 'exports',
      entityType: null,
      label: 'Exports',
    },
  },
  {
    pattern: /^\/audit-logs\/?$/,
    context: {
      module: 'audit_logs',
      routeName: 'audit_logs',
      entityType: null,
      label: 'Audit logs',
    },
  },
  {
    pattern: /^\/analytics\/?$/,
    context: {
      module: 'analytics',
      routeName: 'analytics',
      entityType: null,
      label: 'Analytics',
    },
  },
];

const sanitizeEntityId = (value) => {
  if (!value) {
    return null;
  }
  const normalized = decodeURIComponent(String(value)).trim();
  if (!/^[a-zA-Z0-9_-]{1,80}$/.test(normalized)) {
    return null;
  }
  return normalized;
};

export function getAIPageContext(pathname = '/') {
  const path = String(pathname || '/').split('?')[0].split('#')[0] || '/';

  for (const route of ROUTE_PATTERNS) {
    const match = path.match(route.pattern);
    if (match) {
      return {
        module: route.context.module,
        routeName: route.context.routeName,
        entityType: route.context.entityType ?? null,
        entityId: route.entityKey ? sanitizeEntityId(match[1]) : null,
        label: route.context.label,
      };
    }
  }

  return {
    module: 'unknown',
    routeName: 'unknown',
    entityType: null,
    entityId: null,
    label: 'Current page',
  };
}

export function formatAIPageContextForPrompt(pageContext) {
  if (!pageContext || pageContext.routeName === 'unknown') {
    return 'Safe page context: current page is not recognized.';
  }

  const parts = [
    `module=${pageContext.module}`,
    `routeName=${pageContext.routeName}`,
  ];

  if (pageContext.entityType) {
    parts.push(`entityType=${pageContext.entityType}`);
  }

  if (pageContext.entityId) {
    parts.push(`entityId=${pageContext.entityId}`);
  }

  return `Safe page context: ${parts.join(', ')}.`;
}

export default getAIPageContext;
