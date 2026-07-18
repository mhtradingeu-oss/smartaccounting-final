const {
  AccountingPeriod,
  Expense,
  Invoice,
} = require('../../src/models');

const {
  closePeriod,
  reopenPeriod,
} = require('../../src/services/accountingPeriodService');

describe('Accounting period lock model enforcement', () => {
  let company;
  let otherCompany;
  let user;
  let otherUser;

  const closedDate = '2038-01-15';
  const openDate = '2038-02-15';

  const buildInvoicePayload = ({
    invoiceNumber,
    companyId = company.id,
    userId = user.id,
    date = openDate,
    status = 'DRAFT',
  } = {}) => ({
    invoiceNumber,
    subtotal: 100,
    total: 119,
    amount: 119,
    currency: 'EUR',
    status,
    date,
    dueDate: '2038-03-15',
    clientName: 'Period Lock Customer',
    notes: 'Accounting period lock test',
    companyId,
    userId,
  });

  const buildExpensePayload = ({
    companyId = company.id,
    userId = user.id,
    expenseDate = openDate,
    status = 'draft',
  } = {}) => ({
    description: 'Accounting period lock expense',
    vendorName: 'Period Lock Vendor',
    category: 'Professional services',
    netAmount: 100,
    vatRate: 0.19,
    vatAmount: 19,
    grossAmount: 119,
    amount: 119,
    currency: 'EUR',
    status,
    expenseDate,
    date: expenseDate,
    companyId,
    userId,
    createdByUserId: userId,
  });

  beforeEach(async () => {
    await global.testUtils.cleanDatabase();

    company = await global.testUtils.createTestCompany();
    otherCompany = await global.testUtils.createTestCompany();

    user = await global.testUtils.createTestUser({
      companyId: company.id,
    });

    otherUser = await global.testUtils.createTestUser({
      companyId: otherCompany.id,
    });

    await closePeriod({
      companyId: company.id,
      startDate: '2038-01-01',
      endDate: '2038-01-31',
      userId: user.id,
      reason: 'Targeted period lock test',
    });
  });

  test('rejects invoice creation inside a closed period', async () => {
    await expect(
      Invoice.create(
        buildInvoicePayload({
          invoiceNumber: `LOCK-INV-CREATE-${company.id}`,
          date: closedDate,
        }),
      ),
    ).rejects.toMatchObject({
      code: 'ACCOUNTING_PERIOD_CLOSED',
      status: 409,
    });
  });

  test('allows invoice creation outside the closed period', async () => {
    await expect(
      Invoice.create(
        buildInvoicePayload({
          invoiceNumber: `OPEN-INV-CREATE-${company.id}`,
          date: openDate,
        }),
      ),
    ).resolves.toBeTruthy();
  });

  test('rejects modification of an invoice whose original date is closed', async () => {
    const invoice = await Invoice.create(
      buildInvoicePayload({
        invoiceNumber: `LOCK-INV-UPDATE-${company.id}`,
        date: openDate,
      }),
    );

    await invoice.update(
      { date: closedDate },
      { hooks: false },
    );

    await invoice.reload();
    invoice.notes = 'Attempted modification in closed period';

    await expect(invoice.save()).rejects.toMatchObject({
      code: 'ACCOUNTING_PERIOD_CLOSED',
      status: 409,
    });
  });

  test('rejects moving an invoice into a closed period', async () => {
    const invoice = await Invoice.create(
      buildInvoicePayload({
        invoiceNumber: `LOCK-INV-MOVE-${company.id}`,
        date: openDate,
      }),
    );

    invoice.date = closedDate;

    await expect(invoice.save()).rejects.toMatchObject({
      code: 'ACCOUNTING_PERIOD_CLOSED',
      status: 409,
    });
  });

  test('does not apply another company closed period to this company', async () => {
    await expect(
      Invoice.create(
        buildInvoicePayload({
          invoiceNumber: `OTHER-COMPANY-${otherCompany.id}`,
          companyId: otherCompany.id,
          userId: otherUser.id,
          date: closedDate,
        }),
      ),
    ).resolves.toBeTruthy();
  });

  test('rejects expense creation inside a closed period using expenseDate', async () => {
    await expect(
      Expense.create(
        buildExpensePayload({
          expenseDate: closedDate,
        }),
      ),
    ).rejects.toMatchObject({
      code: 'ACCOUNTING_PERIOD_CLOSED',
      status: 409,
    });
  });

  test('allows expense creation outside the closed period', async () => {
    await expect(
      Expense.create(
        buildExpensePayload({
          expenseDate: openDate,
        }),
      ),
    ).resolves.toBeTruthy();
  });

  test('rejects moving an expense into a closed period', async () => {
    const expense = await Expense.create(
      buildExpensePayload({
        expenseDate: openDate,
      }),
    );

    expense.expenseDate = closedDate;
    expense.date = closedDate;

    await expect(expense.save()).rejects.toMatchObject({
      code: 'ACCOUNTING_PERIOD_CLOSED',
      status: 409,
    });
  });

  test('preserves finalized invoice immutability in an open period', async () => {
    const invoice = await Invoice.create(
      buildInvoicePayload({
        invoiceNumber: `FINAL-INV-${company.id}`,
        date: openDate,
      }),
    );

    invoice.status = 'SENT';
    await invoice.save();

    invoice.notes = 'Forbidden finalized invoice change';

    await expect(invoice.save()).rejects.toThrow(
      /correction entry/i,
    );
  });

  test('preserves booked expense immutability in an open period', async () => {
    const expense = await Expense.create(
      buildExpensePayload({
        expenseDate: openDate,
      }),
    );

    expense.status = 'booked';
    await expense.save();

    expense.vendorName = 'Forbidden changed vendor';

    await expect(expense.save()).rejects.toThrow(
      /correction entry/i,
    );
  });

  test('allows writes after the period is reopened', async () => {
    const period = await AccountingPeriod.findOne({
      where: {
        companyId: company.id,
        status: 'CLOSED',
      },
    });

    await reopenPeriod({
      periodId: period.id,
      companyId: company.id,
      userId: user.id,
      reason: 'Reopen for correction test',
    });

    await expect(
      Invoice.create(
        buildInvoicePayload({
          invoiceNumber: `REOPENED-INV-${company.id}`,
          date: closedDate,
        }),
      ),
    ).resolves.toBeTruthy();
  });
});
