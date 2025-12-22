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
  it('should reject mutation requests', async () => {
    const res = await request(app)
      .post('/api/ai/suggest')
      .send({ userId: 1, companyId: 1, prompt: 'delete invoice', context: {} });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Mutation intent detected/);
  });

  it('should allow advisory suggestions only', async () => {
    const res = await request(app)
      .post('/api/ai/suggest')
      .send({ userId: 1, companyId: 1, prompt: 'review overdue invoices', context: {} });
    expect(res.status).toBe(200);
    expect(res.body.advisory).toBe(true);
  });
});
