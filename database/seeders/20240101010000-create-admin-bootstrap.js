const { hashPassword } = require('../../src/utils/authHelpers');

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@local.test';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin123!';
const ADMIN_COMPANY_TAX_ID = process.env.ADMIN_COMPANY_TAX_ID || 'DE000000001';
const ADMIN_COMPANY_NAME = process.env.ADMIN_COMPANY_NAME || 'SmartAccounting HQ';
const ADMIN_COMPANY_ADDRESS = process.env.ADMIN_COMPANY_ADDRESS || '1 Demo Lane';
const ADMIN_COMPANY_CITY = process.env.ADMIN_COMPANY_CITY || 'Berlin';
const ADMIN_COMPANY_POSTAL = process.env.ADMIN_COMPANY_POSTAL || '10115';
const ADMIN_COMPANY_COUNTRY = process.env.ADMIN_COMPANY_COUNTRY || 'DE';
const ADMIN_FIRST_NAME = process.env.ADMIN_FIRST_NAME || 'System';
const ADMIN_LAST_NAME = process.env.ADMIN_LAST_NAME || 'Admin';

const companyBase = {
  name: ADMIN_COMPANY_NAME,
  taxId: ADMIN_COMPANY_TAX_ID,
  address: ADMIN_COMPANY_ADDRESS,
  city: ADMIN_COMPANY_CITY,
  postalCode: ADMIN_COMPANY_POSTAL,
  country: ADMIN_COMPANY_COUNTRY,
  stripeCustomerId: null,
};

const buildCompanyInsertPayload = (now) => ({
  ...companyBase,
  createdAt: now,
  updatedAt: now,
});

const buildCompanyUpdatePayload = (now) => ({
  ...companyBase,
  updatedAt: now,
});

const buildUserBasePayload = (companyId, passwordHash) => ({
  email: ADMIN_EMAIL,
  password: passwordHash,
  firstName: ADMIN_FIRST_NAME,
  lastName: ADMIN_LAST_NAME,
  role: 'admin',
  companyId,
  isActive: true,
});

const buildUserInsertPayload = (companyId, passwordHash, now) => ({
  ...buildUserBasePayload(companyId, passwordHash),
  createdAt: now,
  updatedAt: now,
});

const buildUserUpdatePayload = (companyId, passwordHash, now) => ({
  ...buildUserBasePayload(companyId, passwordHash),
  updatedAt: now,
});

module.exports = {
  up: async (queryInterface) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      const now = new Date();
      const normalizedCompanyId = await queryInterface.rawSelect(
        'companies',
        { where: { taxId: ADMIN_COMPANY_TAX_ID }, transaction },
        'id',
      );

      if (normalizedCompanyId) {
        await queryInterface.bulkUpdate(
          'companies',
          buildCompanyUpdatePayload(now),
          { taxId: ADMIN_COMPANY_TAX_ID },
          { transaction },
        );
      } else {
        await queryInterface.bulkInsert('companies', [buildCompanyInsertPayload(now)], { transaction });
      }

      const companyId = await queryInterface.rawSelect(
        'companies',
        { where: { taxId: ADMIN_COMPANY_TAX_ID }, transaction },
        'id',
      );

      const passwordHash = await hashPassword(ADMIN_PASSWORD);
      const existingUserId = await queryInterface.rawSelect(
        'users',
        { where: { email: ADMIN_EMAIL }, transaction },
        'id',
      );

      if (existingUserId) {
        await queryInterface.bulkUpdate(
          'users',
          buildUserUpdatePayload(companyId, passwordHash, now),
          { id: existingUserId },
          { transaction },
        );
      } else {
        await queryInterface.bulkInsert(
          'users',
          [buildUserInsertPayload(companyId, passwordHash, now)],
          { transaction },
        );
      }

      const adminUserId = await queryInterface.rawSelect(
        'users',
        { where: { email: ADMIN_EMAIL }, transaction },
        'id',
      );

      await queryInterface.bulkUpdate(
        'companies',
        { userId: adminUserId, updatedAt: now },
        { id: companyId },
        { transaction },
      );

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  down: async (queryInterface) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.bulkDelete(
        'users',
        { email: ADMIN_EMAIL },
        { transaction },
      );
      await queryInterface.bulkDelete(
        'companies',
        { taxId: ADMIN_COMPANY_TAX_ID },
        { transaction },
      );
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
