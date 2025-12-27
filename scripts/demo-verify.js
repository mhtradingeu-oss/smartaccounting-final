#!/usr/bin/env node
const { EventEmitter } = require('events');
const httpMocks = require('node-mocks-http');

require('dotenv').config();

// Default to the local demo stack when env is missing.
process.env.NODE_ENV = process.env.NODE_ENV || 'development';
process.env.USE_SQLITE = process.env.USE_SQLITE || 'true';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'demo-jwt-secret';

const app = require('../src/app');
const authService = require('../src/services/authService');

const requestApp = ({ method = 'GET', url = '/', headers = {}, body }) =>
  new Promise((resolve, reject) => {
    const req = httpMocks.createRequest({ method, url, headers, body });
    req.socket = req.socket || {
      setTimeout: () => {},
      setNoDelay: () => {},
      setKeepAlive: () => {},
    };
    if (typeof req.setTimeout !== 'function') {
      req.setTimeout = function (timeout) {
        if (this.socket && typeof this.socket.setTimeout === 'function') {
          this.socket.setTimeout(timeout);
        }
      };
    }
    const res = httpMocks.createResponse({ eventEmitter: EventEmitter });
    res.on('end', () => {
      const raw = res._getData();
      let parsed = raw;
      if (typeof raw === 'string') {
        try {
          parsed = JSON.parse(raw);
        } catch (err) {
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

const verifySeededEndpoints = async () => {
  console.log('[DEMO VERIFY] Logging in as seeded demo admin...');
  const credentials = { email: 'demo-admin@demo.com', password: 'demopass1' };
  const loginResult = await authService.login(credentials);
  if (!loginResult?.token) {
    throw new Error('Demo login did not return a token');
  }
  const token = loginResult.token;
  const routes = ['/api/companies', '/api/invoices', '/api/bank-statements'];

  for (const route of routes) {
    const response = await requestApp({
      method: 'GET',
      url: route,
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (![200, 201].includes(response.status)) {
      throw new Error(`Unexpected response for ${route}: ${response.status}`);
    }

    const resultList =
      response.body?.companies ||
      response.body?.invoices ||
      response.body?.statements ||
      response.body?.data ||
      [];
    const itemsCount = Array.isArray(resultList) ? resultList.length : 0;
    console.log(`[DEMO VERIFY] ${route} returned status ${response.status} with ${itemsCount} seeded items`);
  }
};

verifySeededEndpoints()
  .then(() => {
    console.log('[DEMO VERIFY] All seeded endpoints responded as expected.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('[DEMO VERIFY] Verification failed:', error);
    process.exit(1);
  });
