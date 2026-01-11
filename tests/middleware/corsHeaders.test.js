const express = require('express');
const request = require('supertest');
const corsMiddleware = require('../../src/middleware/cors');

describe('CORS middleware', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(corsMiddleware);
    app.options('*', corsMiddleware);
    app.get('/api/companies', (_req, res) => res.status(200).json({ companies: [] }));
  });

  it('allows x-company-id headers during company preflight', async () => {
    const response = await request(app)
      .options('/api/companies')
      .set('Origin', 'http://localhost:3000')
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'x-company-id,authorization,content-type');

    expect(response.status).toBe(200);
    expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3000');
    expect(response.headers['access-control-allow-credentials']).toBe('true');
    expect(response.headers['access-control-allow-methods']).toBe(
      'GET,POST,PUT,DELETE,OPTIONS,PATCH',
    );
    expect(response.headers['access-control-allow-headers']).toMatch(/x-company-id/i);
    expect(response.headers['access-control-allow-headers']).toMatch(/authorization/i);
    expect(response.headers['access-control-allow-headers']).toMatch(/content-type/i);
  });
});
