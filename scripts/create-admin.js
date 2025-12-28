#!/usr/bin/env node

/* eslint-disable no-console */

const bcrypt = require('bcryptjs');
const { sequelize, User, Company } = require('../src/models');

async function main() {
  try {
    console.log('🔐 Starting admin bootstrap...');

    // Ensure DB connection
    await sequelize.authenticate();

    // 1️⃣ Company
    let company = await Company.findOne({
      where: { name: 'SmartAccounting HQ' },
    });

    if (!company) {
      console.log('🏢 Creating default company...');

      company = await Company.create({
        name: 'SmartAccounting HQ',
        taxId: 'DE999999999',
        address: 'Main Street 1',
        city: 'Berlin',
        postalCode: '10115',
        country: 'DE',
      });

      console.log('✅ Company created');
    } else {
      console.log('ℹ️ Company already exists');
    }

    // 2️⃣ Admin User
    const adminEmail = 'admin@smartaccounting.local';

    let admin = await User.findOne({
      where: { email: adminEmail },
    });

    if (!admin) {
      console.log('👤 Creating admin user...');

      const passwordHash = await bcrypt.hash('Admin123!', 12);

      admin = await User.create({
        email: adminEmail,
        password: passwordHash,
        firstName: 'System',
        lastName: 'Administrator',
        role: 'admin',
        companyId: company.id,
        isActive: true,
      });

      console.log('✅ Admin user created');
    } else {
      console.log('ℹ️ Admin user already exists');
    }

    console.log('🎉 Bootstrap completed successfully');
    process.exit(0);
  } catch (err) {
    console.error('❌ Bootstrap failed:', err);
    process.exit(1);
  }
}

main();
