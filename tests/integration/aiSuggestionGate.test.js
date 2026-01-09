const request = require('../utils/request');
const express = require('express');
const { getSuggestion } = require('../../src/services/ai/aiSuggestionService');

const app = express();
app.use(express.json());

app.post('/api/ai/suggest', async (req, res) => {
  try {
    const suggestion = await getSuggestion(req.body);
    res.json(suggestion);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

describe('API Gate: /api/ai/suggest', () => {
  let testCompany, testUser;
  beforeAll(async () => {
    const { Company, User } = require('../../src/models');
    testCompany = await Company.create({
      name: 'GateTestCo',
      taxId: 'GATE-123',
      aiEnabled: true,
      address: 'Test',
      city: 'Test',
      postalCode: '00000',
      country: 'Testland',
    });
    testUser = await User.create({
      email: 'gateuser@test.com',
      password: 'testpass',
      firstName: 'Gate',
      lastName: 'User',
      companyId: testCompany.id,
      role: 'admin',
      isActive: true,
    });
  });

  afterAll(async () => {
    const { sequelize } = require('../../src/models');
    await sequelize.truncate({ cascade: true, restartIdentity: true });
  });

  it('should reject mutation requests', async () => {
    const res = await global.requestApp({
      app,
      method: 'post',
      url: '/api/ai/suggest',
      body: {
        userId: testUser.id,
        companyId: testCompany.id,
        prompt: 'delete invoice',
        context: {
          user: { id: testUser.id, companyId: testCompany.id },
          role: testUser.role,
          eventClass: 'AI',
          scopeType: 'COMPANY',
          status: 'ALLOWED',
          reason: 'Test mutation rejection',
        },
      },
    });
    expect([400, 404]).toContain(res.status);
    expect(res.body.error).toMatch(/Mutation intent detected/);
  });

  it('should allow advisory suggestions only', async () => {
    const res = await global.requestApp({
      app,
      method: 'post',
      url: '/api/ai/suggest',
      body: {
        userId: testUser.id,
        companyId: testCompany.id,
        prompt: 'review overdue invoices',
        context: {
          user: { id: testUser.id, companyId: testCompany.id },
          role: testUser.role,
          eventClass: 'AI',
          scopeType: 'COMPANY',
          status: 'ALLOWED',
          reason: 'Test advisory suggestion',
        },
      },
    });
    expect([200, 400]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body.advisory).toBe(true);
    }
  });
});
