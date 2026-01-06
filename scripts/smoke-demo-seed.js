// Demo seed verification script
const axios = require('axios');
const assert = require('assert');

const API_URL = process.env.API_URL || 'http://localhost:3000/api';
const DEMO_EMAIL = process.env.DEMO_EMAIL || 'admin@demo.de';
const DEMO_PASSWORD = process.env.DEMO_PASSWORD || 'Demo123!';

async function loginDemo() {
  const res = await axios.post(`${API_URL}/auth/login`, {
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
  });
  assert(res.status === 200, 'Login failed');
  return res.data.token;
}

async function verifyEndpoint(url, token, key, allowEmpty = false) {
  const headers = { Authorization: `Bearer ${token}` };
  const res = await axios.get(`${API_URL}${url}`, { headers });
  assert(res.status === 200, `${url} failed`);
  if (key) {
    assert(res.data[key] !== undefined, `${url} missing key: ${key}`);
    if (!allowEmpty) {
      assert(
        Array.isArray(res.data[key]) ? res.data[key].length > 0 : !!res.data[key],
        `${url} empty: ${key}`,
      );
    }
  }
  return res.data;
}

async function runDemoChecks(token) {
  // Companies
  await verifyEndpoint('/companies', token, 'data');
  // Dashboard stats
  await verifyEndpoint('/dashboard/stats', token, 'data');
  // Expenses
  await verifyEndpoint('/expenses', token, 'data');
  // Bank statements
  const statements = await verifyEndpoint('/bank-statements', token, 'data');
  const statement = statements.data[0];
  assert(statement, 'No demo bank statement found');
  // AI insights
  await verifyEndpoint('/ai/insights', token, 'data');
  // AI read endpoints (example: /ai/decisions)
  await verifyEndpoint('/ai/decisions', token, 'data', true); // allow empty if not required
  console.log('Demo seed verification passed.');
}

(async () => {
  try {
    const token = await loginDemo();
    await runDemoChecks(token);
  } catch (err) {
    console.error('Demo seed verification failed:', err);
    process.exit(1);
  }
})();
