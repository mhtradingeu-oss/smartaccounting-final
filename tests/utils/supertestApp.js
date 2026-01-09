// test/utils/supertestApp.js
const supertest = require('supertest');

/**
 * Wraps an Express app for supertest-based requests.
 * Usage: supertestApp(app).get('/route')
 */
module.exports = (app) => supertest(app);
