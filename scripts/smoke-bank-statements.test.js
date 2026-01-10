// This test file replaces the old smoke-bank-statements.js script to use supertest and the Express app handler directly.
// It does NOT start a server or use URLs. It runs fully in-memory.

const supertest = require('supertest');
const path = require('path');
const fs = require('fs');
const assert = require('assert');
require('dotenv').config();

// Import the Express app from server.js (which re-exports app.js)
const { startServer } = require('../src/server');
const app = require('../src/app');

const CONTRACT_PATH = path.join(__dirname, 'demo-contract.json');
assert(fs.existsSync(CONTRACT_PATH), 'Missing demo-contract.json');
const DEMO_CONTRACT = JSON.parse(fs.readFileSync(CONTRACT_PATH, 'utf-8'));
const ADMIN_USER = DEMO_CONTRACT.users.find((u) => u.role === 'admin');
assert(ADMIN_USER, 'Admin demo user not defined in demo-contract.json');
const DEMO_EMAIL = ADMIN_USER.email;
const DEMO_PASSWORD = DEMO_CONTRACT.credentials?.password;
assert(DEMO_PASSWORD, 'Demo password missing in demo-contract.json');

const SAMPLE_CSV_CONTENT =
  'date;amount;description;counterparty;reference\n01.04.2026;1240;Demo income from smartaccounting;Smart Accounting GmbH;SMOKE-INCOME-001\n03.04.2026;-320;Demo expense for office supplies;PB Office Supplies;SMOKE-EXPENSE-001\n';

describe('Smoke: Bank Statements', () => {
  let token;
  let companyId;
  let agent;

  beforeAll(async () => {
    agent = supertest(app);
    // Login
    const res = await agent.post('/api/auth/login').send({
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
    });
    expect(res.status).toBe(200);
    token = res.body?.token || res.body?.accessToken;
    companyId = res.body?.user?.companyId;
    expect(token).toBeTruthy();
    expect(companyId).toBeTruthy();
  });

  it('should list bank statements', async () => {
    const res = await agent
      .get('/api/bank-statements')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Company-Id', companyId);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body) || Array.isArray(res.body?.data)).toBe(true);
  });

  it('should upload dry-run CSV', async () => {
    const formData = {
      bankStatement: Buffer.from(SAMPLE_CSV_CONTENT, 'utf-8'),
      format: 'CSV',
    };
    const res = await agent
      .post('/api/bank-statements/import?dryRun=true')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Company-Id', companyId)
      .attach('bankStatement', formData.bankStatement, 'smoke-demo-statement.csv')
      .field('format', 'CSV');
    expect(res.status).toBe(200);
    expect(res.body.dryRunId).toBeTruthy();
  });
});
