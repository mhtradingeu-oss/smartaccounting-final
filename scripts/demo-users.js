'use strict';

// Centralized demo users loader
// DO NOT hardcode demo emails here
// Source of truth: demo-contract.json

const path = require('path');

const demoContract = require(path.join(__dirname, 'demo-contract.json'));

const DEMO_USERS = demoContract.users.map((user) => ({
  email: user.email,
  role: user.role,
}));

const DEMO_EMAILS = DEMO_USERS.map((u) => u.email);

const DEMO_PASSWORD = demoContract.credentials.password;

module.exports = {
  DEMO_USERS,
  DEMO_EMAILS,
  DEMO_PASSWORD,
};
