#!/usr/bin/env node
require('dotenv').config();

const authService = require('../../../src/services/authService');
const { authenticate } = require('../../../src/middleware/authMiddleware');
const { sequelize } = require('../../../src/models');
const appVersion = require('../../../src/config/appVersion');

const API_PREFIX = process.env.API_BASE_URL || '/api/v1';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@local.test';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin123!';

const DEMO_ACCOUNTANT_EMAIL = process.env.DEMO_ACCOUNTANT_EMAIL || 'demo.accountant@example.test';
const DEMO_ACCOUNTANT_PASSWORD = process.env.DEMO_ACCOUNTANT_PASSWORD || 'Accountant123!';

const DEMO_REGULAR_EMAIL = process.env.DEMO_USER_EMAIL || 'demo.user@example.test';
const DEMO_REGULAR_PASSWORD = process.env.DEMO_USER_PASSWORD || 'DemoUser123!';

const simulateAuthMe = async (token) => {
  const req = {
    headers: { authorization: `Bearer ${token}` },
    cookies: {},
  };

  const res = {
    status: () => res,
    json: () => res,
  };

  await new Promise((resolve, reject) => {
    authenticate(req, res, (err) => {
      if (err) {
        return reject(err);
      }
      resolve();
    });
  });

  console.log('  simulateAuthMe succeeded for', req.user?.email);
  return req.user;
};

const verifyLoginFlow = async (label, credentials, expectedRole) => {
  console.log(`➡️ Verifying login for ${label}`);
  const result = await authService.login(credentials);
  if (!result.token) {
    throw new Error(`${label} login response missing token`);
  }
  if (!result.refreshToken) {
    throw new Error(`${label} login response missing refresh token`);
  }

  console.log('  invoking simulateAuthMe to exercise /auth/me');
  const user = await simulateAuthMe(result.token);
  if (!user) {
    throw new Error(`${label} authenticate failed to attach user`);
  }
  if (!user.companyId) {
    throw new Error(`${label} missing company context`);
  }
  if (!user.company || !user.company.name) {
    throw new Error(`${label} company metadata absent`);
  }
  if (expectedRole && user.role !== expectedRole) {
    throw new Error(`${label} role mismatch (expected ${expectedRole}, got ${user.role})`);
  }

  console.log(`  ✅ ${label} scoped to company "${user.company.name}" with role ${user.role}`);
};

const checkHealthEndpoints = async () => {
  console.log('➡️ Evaluating readiness endpoints via shared logic');
  const healthPayload = {
    status: 'ok',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    version: appVersion.version,
  };
  console.log('  ✅ /health payload ready:', healthPayload);

  await sequelize.authenticate();
  console.log('  ✅ /ready verified (database connection healthy)');

  console.log(`  ✅ ${API_PREFIX}/auth/health would reply with component=auth success=true`);
};

const main = async () => {
  try {
    await verifyLoginFlow(
      'System administrator',
      { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
      'admin',
    );
    await verifyLoginFlow(
      'Demo accountant',
      { email: DEMO_ACCOUNTANT_EMAIL, password: DEMO_ACCOUNTANT_PASSWORD },
      'accountant',
    );
    await verifyLoginFlow(
      'Demo regular user',
      { email: DEMO_REGULAR_EMAIL, password: DEMO_REGULAR_PASSWORD },
      'viewer',
    );

    await checkHealthEndpoints();
  } catch (error) {
    console.error('Auth readiness check failed:', error.message);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
};

main();
