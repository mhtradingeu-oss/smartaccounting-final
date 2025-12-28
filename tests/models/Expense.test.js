const { Expense } = require('../../src/models');

describe('Expense model immutability', () => {
  let user;

  beforeEach(async () => {
    await global.testUtils.cleanDatabase();
    await Expense.destroy({ where: {}, force: true });
    user = await global.testUtils.createTestUser();
  });

  function buildExpensePayload() {
    return {
      vendorName: 'Travel Agency',
      description: 'Immutable travel expense',
      category: 'Travel',
      netAmount: 100,
      vatRate: 19,
      vatAmount: 19,
      grossAmount: 119,
      expenseDate: new Date(),
      companyId: user.companyId,
      createdByUserId: user.id,
    };
  }

  test('rejects field updates once expense is approved', async () => {
    const expense = await Expense.create(buildExpensePayload());
    expense.status = 'booked';
    await expense.save();

    expense.vendorName = 'Changed Vendor';
    await expect(expense.save()).rejects.toThrow(/correction entry/i);
  });

  test('allows status-only transition after approval', async () => {
    const expense = await Expense.create(buildExpensePayload());
    expense.status = 'booked';
    await expense.save();

    expense.status = 'archived';
    await expect(expense.save()).resolves.toBeTruthy();
  });
});
