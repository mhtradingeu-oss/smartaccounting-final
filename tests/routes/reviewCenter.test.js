const request = require('supertest');
const app = require('../../src/app');
const {
  sequelize,
  User,
  Company,
  Invoice,
  Expense,
} = require('../../src/models');

const { hashPassword } = require('../../src/utils/authHelpers');

async function createAuthUser(role = 'admin') {
  const company = await Company.create({
    name: `Review Center GmbH ${Date.now()}-${Math.random()}`,
    taxId: `DE${Math.floor(Math.random() * 1000000000)}`,
    address: 'Berlin',
    city: 'Berlin',
    postalCode: '10115',
    country: 'DE',
    isActive: true,
    subscriptionStatus: 'active',
  });

  const user = await User.create({
    firstName: 'Review',
    lastName: 'Tester',
    email: `review-${role}-${Date.now()}-${Math.random()}@example.com`,
    password: await hashPassword('Password123!'),
    role,
    companyId: company.id,
    isActive: true,
  });

  const login = await request(app)
    .post('/api/auth/login')
    .send({ email: user.email, password: 'Password123!' })
    .expect(200);

  return {
    company,
    user,
    token: login.body.token || login.body.accessToken,
  };
}

describe('Smart Review Center API', () => {
  beforeEach(async () => {
    await sequelize.sync({ force: true });
  });

  it('returns a read-only company-scoped review summary for admin', async () => {
    const { company, user, token } = await createAuthUser('admin');

    await Invoice.create({
      companyId: company.id,
      userId: user.id,
      invoiceNumber: `RC-DRAFT-${Date.now()}`,
      clientName: 'Draft Client',
      clientEmail: 'client@example.com',
      subtotal: 100,
      taxAmount: 19,
      total: 119,
      amount: 100,
      totalAmount: 119,
      vatRate: 0.19,
      currency: 'EUR',
      status: 'DRAFT',
      date: '2026-01-02',
      issueDate: '2026-01-02',
      dueDate: '2026-01-15',
    });

    await Expense.create({
      companyId: company.id,
      userId: user.id,
      createdByUserId: user.id,
      vendorName: 'No Receipt Vendor',
      description: 'Expense without attachment',
      category: 'software',
      amount: 100,
      netAmount: 100,
      vatAmount: 19,
      grossAmount: 119,
      totalAmount: 119,
      taxAmount: 19,
      vatRate: 0.19,
      currency: 'EUR',
      status: 'draft',
      expenseDate: '2026-01-03',
      date: '2026-01-03',
    });

    const res = await request(app)
      .get('/api/review-center/summary')
      .set('Authorization', `Bearer ${token}`)
      .set('x-company-id', String(company.id))
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.product).toBe('SmartAccounting Smart Review Center');
    expect(res.body.mode).toBe('read_only_preparation');
    expect(res.body.companyId).toBe(company.id);

    expect(res.body.readiness).toEqual(
      expect.objectContaining({
        overall: expect.any(Number),
        datev: expect.any(Number),
        tax: expect.any(Number),
        audit: expect.any(Number),
        bank: expect.any(Number),
        documents: expect.any(Number),
        ai: expect.any(Number),
      }),
    );

    expect(res.body.counts).toEqual(
      expect.objectContaining({
        draftInvoices: 1,
        totalExpenses: 1,
        expensesWithoutAttachments: 1,
        pendingAIApprovals: 0,
      }),
    );

    expect(res.body.nextActions.some((action) => action.code === 'ATTACH_EXPENSE_RECEIPTS')).toBe(true);

    expect(res.body.sourceBoundaries).toEqual(
      expect.arrayContaining([
        'No accounting posting is performed.',
        'No DATEV upload is performed.',
        'No ELSTER submission is performed.',
      ]),
    );

    expect(JSON.stringify(res.body)).not.toMatch(/"approve"|"reject"|"execute"/i);
  });

  it('allows auditor role to read summary without write actions', async () => {
    const { company, token } = await createAuthUser('auditor');

    const res = await request(app)
      .get('/api/review-center/summary')
      .set('Authorization', `Bearer ${token}`)
      .set('x-company-id', String(company.id))
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.mode).toBe('read_only_preparation');
    expect(JSON.stringify(res.body)).not.toMatch(/"approve"|"reject"|"execute"/i);
  });
});
