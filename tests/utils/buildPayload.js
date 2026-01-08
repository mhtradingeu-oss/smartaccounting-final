// Centralized payload builders for Expense, Company, Invoice
// Usage: const payload = buildExpensePayload({ overrides })

function buildExpensePayload(overrides = {}) {
  return {
    vendorName: 'Test Vendor',
    description: 'Test expense',
    category: 'Travel',
    netAmount: 100,
    vatAmount: 19,
    grossAmount: 119,
    vatRate: 0.19,
    expenseDate: new Date().toISOString().slice(0, 10),
    date: new Date().toISOString().slice(0, 10),
    companyId: overrides.companyId || 1,
    createdByUserId: overrides.createdByUserId || 1,
    userId: overrides.userId || 1,
    amount: 119,
    currency: 'EUR',
    status: 'draft',
    source: 'manual',
    ...overrides,
  };
}

function buildCompanyPayload(overrides = {}) {
  return {
    name: `Test Company ${Date.now()}`,
    taxId: `DE${Math.random().toString().slice(2, 11)}`,
    address: 'Test Address 123',
    city: 'Berlin',
    postalCode: '10115',
    country: 'Germany',
    aiEnabled: true,
    userId: overrides.userId || 1,
    ...overrides,
  };
}

function buildInvoicePayload(overrides = {}) {
  // Calculate item fields if items are present
  let items = overrides.items || [];
  let subtotal = 0;
  let total = 0;
  if (Array.isArray(items) && items.length > 0) {
    items = items.map((item) => {
      const quantity = parseFloat(item.quantity);
      const unitPrice = parseFloat(item.unitPrice ?? item.price);
      const vatRate = parseFloat(item.vatRate);
      const lineNet = +(quantity * unitPrice).toFixed(2);
      const lineVat = +(lineNet * vatRate).toFixed(2);
      const lineGross = +(lineNet + lineVat).toFixed(2);
      subtotal += lineNet;
      total += lineGross;
      return {
        ...item,
        lineNet,
        lineVat,
        lineGross,
      };
    });
  }
  return {
    invoiceNumber: `INV-TEST-${Date.now()}`,
    subtotal: subtotal || 1000.0,
    total: total || 1000.0,
    amount: total || 1000.0,
    currency: 'EUR',
    status: 'SENT',
    date: new Date().toISOString().slice(0, 10),
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    clientName: 'Test Client',
    userId: overrides.userId || 1,
    companyId: overrides.companyId || 1,
    ...overrides,
    items,
  };
}

module.exports = {
  buildExpensePayload,
  buildCompanyPayload,
  buildInvoicePayload,
};
