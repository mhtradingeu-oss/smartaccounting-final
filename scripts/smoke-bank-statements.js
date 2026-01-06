const axios = require('axios');
const assert = require('assert');
const FormData = require('form-data');

const API_URL = process.env.API_URL || 'http://localhost:3000/api';
const DEMO_EMAIL = process.env.DEMO_EMAIL || 'admin@demo.de';
const DEMO_PASSWORD = process.env.DEMO_PASSWORD || 'Demo123!';

const SAMPLE_CSV_CONTENT = `date;amount;description;counterparty;reference
01.04.2026;1240;Demo income from smartaccounting;Smart Accounting GmbH;SMOKE-INCOME-001
03.04.2026;-320;Demo expense for office supplies;PB Office Supplies;SMOKE-EXPENSE-001
`;

async function loginDemo() {
  const response = await axios.post(`${API_URL}/auth/login`, {
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
  });
  assert.strictEqual(response.status, 200, 'Demo login failed');
  const token = response.data?.token;
  assert(token, 'Login response missing token');
  return token;
}

async function smokeBankStatements(token) {
  const headers = { Authorization: `Bearer ${token}` };

  const listResponse = await axios.get(`${API_URL}/bank-statements`, { headers });
  assert.strictEqual(listResponse.status, 200, 'List endpoint failed');
  assert(listResponse.data?.success === true, 'List endpoint response invalid');

  const form = new FormData();
  form.append('bankStatement', Buffer.from(SAMPLE_CSV_CONTENT, 'utf-8'), {
    filename: 'smoke-demo-statement.csv',
    contentType: 'text/csv',
  });
  form.append('format', 'CSV');

  const dryRunResponse = await axios.post(
    `${API_URL}/bank-statements/import?dryRun=true`,
    form,
    {
      headers: { ...headers, ...form.getHeaders() },
    },
  );
  assert.strictEqual(dryRunResponse.status, 200, 'Dry-run import failed');
  assert(dryRunResponse.data?.confirmationToken, 'Dry-run response missing token');

  const reconcileResponse = await axios.post(
    `${API_URL}/bank-statements/reconcile`,
    null,
    { headers },
  );
  assert.strictEqual(reconcileResponse.status, 200, 'Reconcile endpoint failed');

  console.log('Bank Statements smoke test passed.');
}

(async () => {
  try {
    const token = await loginDemo();
    await smokeBankStatements(token);
  } catch (error) {
    console.error('Smoke test failed:', error);
    process.exit(1);
  }
})();
