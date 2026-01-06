#!/usr/bin/env node
'use strict';

/* eslint-disable no-console */

require('dotenv').config();
const bcrypt = require('bcryptjs');

let sequelize;
let User;
let Company;

try {
  const models = require('../src/models');
  sequelize = models.sequelize || models;
  User = models.User;
  Company = models.Company;
} catch (err) {
  console.error('[ADMIN-BOOTSTRAP] Failed to load models');
  console.error(err.message);
  process.exit(1);
}

const REQUIRED_OPTIONS = [
  { cli: 'company-name', env: 'ADMIN_COMPANY_NAME', label: 'Company name' },
  { cli: 'company-tax-id', env: 'ADMIN_COMPANY_TAX_ID', label: 'Company tax ID' },
  { cli: 'company-address', env: 'ADMIN_COMPANY_ADDRESS', label: 'Company address' },
  { cli: 'company-city', env: 'ADMIN_COMPANY_CITY', label: 'Company city' },
  { cli: 'company-postal', env: 'ADMIN_COMPANY_POSTAL', label: 'Company postal code' },
  { cli: 'company-country', env: 'ADMIN_COMPANY_COUNTRY', label: 'Company country' },
  { cli: 'user-email', env: 'ADMIN_EMAIL', label: 'Admin email' },
  { cli: 'user-password', env: 'ADMIN_PASSWORD', label: 'Admin password' },
  { cli: 'user-first-name', env: 'ADMIN_FIRST_NAME', label: 'Admin first name' },
  { cli: 'user-last-name', env: 'ADMIN_LAST_NAME', label: 'Admin last name' },
];

const parseArgs = (argv) => {
  const options = {};
  for (let i = 0; i < argv.length; i += 1) {
    const item = argv[i];
    if (item === '--help' || item === '-h') {
      options.help = true;
      continue;
    }
    if (!item.startsWith('--')) {
      continue;
    }

    const key = item.slice(2);
    const value = argv[i + 1];
    if (!value || value.startsWith('--')) {
      throw new Error(`Missing value for --${key}`);
    }
    options[key] = value;
    i += 1;
  }
  return options;
};

const cliOptions = parseArgs(process.argv.slice(2));

const showUsage = () => {
  console.log('Usage: node scripts/create-admin.js [options]');
  console.log('Options can be provided via CLI or ENV variables:');
  REQUIRED_OPTIONS.forEach(({ cli, env, label }) => {
    console.log(`  --${cli}  (env ${env})  → ${label}`);
  });
};

const getValue = (cliKey, envKey) =>
  Object.prototype.hasOwnProperty.call(cliOptions, cliKey)
    ? cliOptions[cliKey]
    : process.env[envKey];

const assertRequiredInputs = () => {
  const missing = REQUIRED_OPTIONS.filter(({ cli, env }) => !getValue(cli, env));
  if (missing.length) {
    console.error(
      '[ADMIN-BOOTSTRAP] Missing required inputs:',
      missing.map((m) => m.label).join(', '),
    );
    showUsage();
    process.exit(1);
  }
};

const validateInputs = (company, user) => {
  if (!user.email.includes('@')) {
    throw new Error('Invalid admin email address');
  }
  if (user.password.length < 8) {
    throw new Error('Admin password must be at least 8 characters');
  }
  if (!company.taxId || company.taxId.length < 5) {
    throw new Error('Invalid company tax ID');
  }
};

async function main() {
  console.log('[ADMIN-BOOTSTRAP] Starting admin bootstrap');

  if (cliOptions.help) {
    showUsage();
    process.exit(0);
  }

  assertRequiredInputs();

  const companyPayload = {
    name: getValue('company-name', 'ADMIN_COMPANY_NAME'),
    taxId: getValue('company-tax-id', 'ADMIN_COMPANY_TAX_ID'),
    address: getValue('company-address', 'ADMIN_COMPANY_ADDRESS'),
    city: getValue('company-city', 'ADMIN_COMPANY_CITY'),
    postalCode: getValue('company-postal', 'ADMIN_COMPANY_POSTAL'),
    country: getValue('company-country', 'ADMIN_COMPANY_COUNTRY'),
  };

  const userPayload = {
    email: getValue('user-email', 'ADMIN_EMAIL'),
    password: getValue('user-password', 'ADMIN_PASSWORD'),
    firstName: getValue('user-first-name', 'ADMIN_FIRST_NAME'),
    lastName: getValue('user-last-name', 'ADMIN_LAST_NAME'),
  };

  validateInputs(companyPayload, userPayload);

  try {
    await sequelize.authenticate();
    console.log('[ADMIN-BOOTSTRAP] Database connected');

    await sequelize.transaction(async (t) => {
      let company = await Company.findOne({
        where: { taxId: companyPayload.taxId },
        transaction: t,
      });

      if (!company) {
        console.log('[ADMIN-BOOTSTRAP] Creating company');
        company = await Company.create(
          {
            ...companyPayload,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          { transaction: t },
        );
      } else {
        console.log('[ADMIN-BOOTSTRAP] Company already exists');
      }

      const existingUser = await User.findOne({
        where: { email: userPayload.email },
        transaction: t,
      });

      if (existingUser) {
        console.log('[ADMIN-BOOTSTRAP] Admin user already exists');
        return;
      }

      console.log('[ADMIN-BOOTSTRAP] Creating admin user');
      const passwordHash = await bcrypt.hash(userPayload.password, 12);

      await User.create(
        {
          email: userPayload.email,
          password: passwordHash,
          firstName: userPayload.firstName,
          lastName: userPayload.lastName,
          role: 'admin',
          companyId: company.id,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        { transaction: t },
      );
    });

    console.log('[ADMIN-BOOTSTRAP] ✅ Bootstrap completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('[ADMIN-BOOTSTRAP] ❌ Bootstrap failed:', error.message);
    process.exit(1);
  } finally {
    try {
      await sequelize.close();
    } catch (_) {
      /* ignore */
    }
  }
}

main();
