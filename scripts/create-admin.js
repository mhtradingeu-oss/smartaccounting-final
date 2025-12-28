#!/usr/bin/env node

/* eslint-disable no-console */

require('dotenv').config();
const bcrypt = require('bcryptjs');
const { sequelize, User, Company } = require('../src/models');

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
    if (item === '--help') {
      options.help = true;
      continue;
    }
    if (item === '-h') {
      options.h = true;
      continue;
    }
    if (!item.startsWith('--')) {
      continue;
    }
    const key = item.slice(2);
    if (!key) {
      continue;
    }
    const nextValue = argv[i + 1];
    if (!nextValue || nextValue.startsWith('--')) {
      throw new Error(`Missing value for --${key}`);
    }
    options[key] = nextValue;
    i += 1;
  }
  return options;
};

const cliOptions = parseArgs(process.argv.slice(2));

const showUsage = () => {
  console.log('Usage: node scripts/create-admin.js [options]');
  console.log('Options can be provided via CLI or environment variables. Supported flags:');
  REQUIRED_OPTIONS.forEach(({ cli, env, label }) => {
    console.log(`  --${cli} (env ${env}) — ${label}`);
  });
};

const getValue = (cliKey, envKey) => {
  if (Object.prototype.hasOwnProperty.call(cliOptions, cliKey)) {
    return cliOptions[cliKey];
  }
  return process.env[envKey];
};

const assertRequiredInputs = () => {
  const missing = REQUIRED_OPTIONS.filter(({ cli, env }) => !getValue(cli, env));
  if (missing.length > 0) {
    console.error(
      'Missing required admin bootstrap inputs:',
      missing.map((item) => item.label).join(', '),
    );
    showUsage();
    process.exit(1);
  }
};

const buildCompanyPayload = () => ({
  name: getValue('company-name', 'ADMIN_COMPANY_NAME'),
  taxId: getValue('company-tax-id', 'ADMIN_COMPANY_TAX_ID'),
  address: getValue('company-address', 'ADMIN_COMPANY_ADDRESS'),
  city: getValue('company-city', 'ADMIN_COMPANY_CITY'),
  postalCode: getValue('company-postal', 'ADMIN_COMPANY_POSTAL'),
  country: getValue('company-country', 'ADMIN_COMPANY_COUNTRY'),
});

const buildUserPayload = () => ({
  email: getValue('user-email', 'ADMIN_EMAIL'),
  password: getValue('user-password', 'ADMIN_PASSWORD'),
  firstName: getValue('user-first-name', 'ADMIN_FIRST_NAME'),
  lastName: getValue('user-last-name', 'ADMIN_LAST_NAME'),
});

async function main() {
  try {
    if (cliOptions.help || cliOptions.h) {
      showUsage();
      process.exit(0);
    }

    assertRequiredInputs();

    const companyPayload = buildCompanyPayload();
    const userPayload = buildUserPayload();

    console.log('🔐 Starting admin bootstrap...');
    await sequelize.authenticate();

    let company = await Company.findOne({ where: { taxId: companyPayload.taxId } });
    if (!company) {
      console.log('🏢 Creating company record...');
      company = await Company.create({
        ...companyPayload,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      console.log('✅ Company created.');
    } else {
      console.log('ℹ️ Company already exists.');
    }

    const existingUser = await User.findOne({ where: { email: userPayload.email } });
    if (existingUser) {
      console.log('ℹ️ Admin user already exists.');
      console.log('🎉 Bootstrap completed successfully');
      process.exit(0);
    }

    console.log('👤 Creating admin user...');
    const passwordHash = await bcrypt.hash(userPayload.password, 12);
    await User.create({
      email: userPayload.email,
      password: passwordHash,
      firstName: userPayload.firstName,
      lastName: userPayload.lastName,
      role: 'admin',
      companyId: company.id,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log('✅ Admin user created.');

    console.log('🎉 Bootstrap completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Bootstrap failed:', error.message);
    process.exit(1);
  }
}

main();
