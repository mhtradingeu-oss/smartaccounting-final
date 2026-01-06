#!/usr/bin/env node
'use strict';

/**
 * Demo verification script
 * - Logs in using seeded demo credentials
 * - Verifies core API endpoints return data
 * - Designed for local Docker demo + CI
 */

const { EventEmitter } = require('events');
const httpMocks = require('node-mocks-http');

require('dotenv').config();

/* ------------------------------------------------------------------ */
/* Environment defaults (SAFE for demo only)                           */
/* ------------------------------------------------------------------ */

process.env.NODE_ENV = process.env.NODE_ENV || 'development';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'demo-jwt-secret';

if (process.env.DATABASE_URL) {
  process.env.USE_SQLITE = process.env.USE_SQLITE || 'false';
} else {
  process.env.USE_SQLITE = process.env.USE_SQLITE || 'true';
}

/* ------------------------------------------------------------------ */
/* App & services                                                      */
/* ------------------------------------------------------------------ */

const app = require('../src/app');
const authService = require('../src/services/authService');

/* ------------------------------------------------------------------ */
/* Internal request helper (no HTTP server needed)                     */
/* ------------------------------------------------------------------ */

function requestApp({ method = 'GET', url = '/', headers = {}, body }) {
  return new Promise((resolve, reject) => {
    const req = httpMocks.createRequest({
      method,
      url,
      headers,
      body,
    });

    req.socket = req.socket || {
      setTimeout: () => {},
      setNoDelay: () => {},
      setKeepAlive: () => {},
    };

    if (typeof req.setTimeout !== 'function') {
      req.setTimeout = function setTimeoutCompat(timeout) {
        if (this.socket && typeof this.socket.setTimeout === 'function') {
          this.socket.setTimeout(timeout);
        }
      };
    }

    const res = httpMocks.createResponse({
      eventEmitter: EventEmitter,
    });

    res.on('end', () => {
      const raw = res._getData();
      let parsed = raw;

      if (typeof raw === 'string') {
        try {
          parsed = JSON.parse(raw);
        } catch (_) {
          parsed = raw;
        }
      }

      resolve({
        status: res.statusCode,
        body: parsed,
        headers: typeof res.getHeaders === 'function' ? res.getHeaders() : {},
        text: typeof raw === 'string' ? raw : undefined,
      });
    });

    res.on('error', reject);

    app.handle(req, res, (err) => {
      if (err) {
        reject(err);
      }
    });
  });
}

/* ------------------------------------------------------------------ */
/* Demo verification logic                                             */
/* ------------------------------------------------------------------ */

async function verifySeededEndpoints() {
  console.log('[DEMO VERIFY] Logging in as demo admin...');

  const credentials = {
    email: process.env.DEMO_EMAIL || 'admin@demo.de',
    password: process.env.DEMO_PASSWORD || 'Demo123!',
  };

  const loginResult = await authService.login(credentials);

  if (!loginResult || !loginResult.token) {
    throw new Error('Demo login failed – no token returned');
  }

  const token = loginResult.token;

  const endpoints = [
    { url: '/api/companies', key: 'companies' },
    { url: '/api/invoices', key: 'invoices' },
    { url: '/api/expenses', key: 'expenses' },
    { url: '/api/bank-statements', key: 'statements' },
    { url: '/api/ai/insights', key: 'data', allowEmpty: true },
  ];

  for (const endpoint of endpoints) {
    const response = await requestApp({
      method: 'GET',
      url: endpoint.url,
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (![200, 201].includes(response.status)) {
      throw new Error(`Unexpected status ${response.status} for ${endpoint.url}`);
    }

    const payload = response.body?.[endpoint.key] ?? response.body?.data ?? [];

    const count = Array.isArray(payload) ? payload.length : 0;

    if (!endpoint.allowEmpty && count === 0) {
      throw new Error(`Endpoint ${endpoint.url} returned empty result set`);
    }

    console.log(`[DEMO VERIFY] ${endpoint.url} OK (${count} records)`);
  }
}

/* ------------------------------------------------------------------ */
/* Run                                                                 */
/* ------------------------------------------------------------------ */

(async () => {
  try {
    await verifySeededEndpoints();
    console.log('[DEMO VERIFY] ✅ Demo verification PASSED');
    process.exit(0);
  } catch (error) {
    console.error('[DEMO VERIFY] ❌ Demo verification FAILED');
    console.error(error);
    process.exit(1);
  }
})();
