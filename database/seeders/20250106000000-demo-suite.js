const { hashPassword } = require('../../src/utils/authHelpers');

const DEMO_COMPANY_NAME = process.env.DEMO_COMPANY_NAME || 'SmartAccounting Demo';
const DEMO_COMPANY_TAX_ID = process.env.DEMO_COMPANY_TAX_ID || 'DE000000002';
const DEMO_COMPANY_ADDRESS = process.env.DEMO_COMPANY_ADDRESS || '2 Demo Lane';
const DEMO_COMPANY_CITY = process.env.DEMO_COMPANY_CITY || 'Berlin';
const DEMO_COMPANY_POSTAL = process.env.DEMO_COMPANY_POSTAL || '10117';
const DEMO_COMPANY_COUNTRY = process.env.DEMO_COMPANY_COUNTRY || 'DE';

const DEMO_ACCOUNTANT_EMAIL = process.env.DEMO_ACCOUNTANT_EMAIL || 'demo.accountant@example.test';
const DEMO_ACCOUNTANT_PASSWORD = process.env.DEMO_ACCOUNTANT_PASSWORD || 'Accountant123!';
const DEMO_ACCOUNTANT_FIRST_NAME = process.env.DEMO_ACCOUNTANT_FIRST_NAME || 'Demo';
const DEMO_ACCOUNTANT_LAST_NAME = process.env.DEMO_ACCOUNTANT_LAST_NAME || 'Accountant';

const DEMO_USER_EMAIL = process.env.DEMO_USER_EMAIL || 'demo.user@example.test';
const DEMO_USER_PASSWORD = process.env.DEMO_USER_PASSWORD || 'DemoUser123!';
const DEMO_USER_FIRST_NAME = process.env.DEMO_USER_FIRST_NAME || 'Demo';
const DEMO_USER_LAST_NAME = process.env.DEMO_USER_LAST_NAME || 'User';

const buildCompanyInsertPayload = (now) => ({
  name: DEMO_COMPANY_NAME,
  taxId: DEMO_COMPANY_TAX_ID,
  address: DEMO_COMPANY_ADDRESS,
  city: DEMO_COMPANY_CITY,
  postalCode: DEMO_COMPANY_POSTAL,
  country: DEMO_COMPANY_COUNTRY,
  stripeCustomerId: null,
  createdAt: now,
  updatedAt: now,
});

const buildCompanyUpdatePayload = (now, adminUserId) => ({
  name: DEMO_COMPANY_NAME,
  taxId: DEMO_COMPANY_TAX_ID,
  address: DEMO_COMPANY_ADDRESS,
  city: DEMO_COMPANY_CITY,
  postalCode: DEMO_COMPANY_POSTAL,
  country: DEMO_COMPANY_COUNTRY,
  stripeCustomerId: null,
  userId: adminUserId,
  updatedAt: now,
});

const buildUserInsertPayload = (email, passwordHash, role, companyId, firstName, lastName, now) => ({
  email,
  password: passwordHash,
  firstName,
  lastName,
  role,
  companyId,
  isActive: true,
  createdAt: now,
  updatedAt: now,
});

const buildUserUpdatePayload = (email, passwordHash, role, companyId, firstName, lastName, now) => ({
  email,
  password: passwordHash,
  firstName,
  lastName,
  role,
  companyId,
  isActive: true,
  updatedAt: now,
});

module.exports = {
  up: async (queryInterface) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      const now = new Date();

      const existingCompanyId = await queryInterface.rawSelect(
        'companies',
        { where: { taxId: DEMO_COMPANY_TAX_ID }, transaction },
        'id',
      );

      if (existingCompanyId) {
        await queryInterface.bulkUpdate(
          'companies',
          buildCompanyInsertPayload(now),
          { id: existingCompanyId },
          { transaction },
        );
      } else {
        await queryInterface.bulkInsert('companies', [buildCompanyInsertPayload(now)], { transaction });
      }

      const companyId = await queryInterface.rawSelect(
        'companies',
        { where: { taxId: DEMO_COMPANY_TAX_ID }, transaction },
        'id',
      );

      const accountantPasswordHash = await hashPassword(DEMO_ACCOUNTANT_PASSWORD);
      const regularPasswordHash = await hashPassword(DEMO_USER_PASSWORD);

      let accountantId = await queryInterface.rawSelect(
        'users',
        { where: { email: DEMO_ACCOUNTANT_EMAIL }, transaction },
        'id',
      );

      if (accountantId) {
        await queryInterface.bulkUpdate(
          'users',
          buildUserUpdatePayload(
            DEMO_ACCOUNTANT_EMAIL,
            accountantPasswordHash,
            'accountant',
            companyId,
            DEMO_ACCOUNTANT_FIRST_NAME,
            DEMO_ACCOUNTANT_LAST_NAME,
            now,
          ),
          { id: accountantId },
          { transaction },
        );
      } else {
        await queryInterface.bulkInsert(
          'users',
          [
            buildUserInsertPayload(
              DEMO_ACCOUNTANT_EMAIL,
              accountantPasswordHash,
              'accountant',
              companyId,
              DEMO_ACCOUNTANT_FIRST_NAME,
              DEMO_ACCOUNTANT_LAST_NAME,
              now,
            ),
          ],
          { transaction },
        );
        accountantId = await queryInterface.rawSelect(
          'users',
          { where: { email: DEMO_ACCOUNTANT_EMAIL }, transaction },
          'id',
        );
      }

      let regularUserId = await queryInterface.rawSelect(
        'users',
        { where: { email: DEMO_USER_EMAIL }, transaction },
        'id',
      );

      if (regularUserId) {
        await queryInterface.bulkUpdate(
          'users',
          buildUserUpdatePayload(
            DEMO_USER_EMAIL,
            regularPasswordHash,
            'viewer',
            companyId,
            DEMO_USER_FIRST_NAME,
            DEMO_USER_LAST_NAME,
            now,
          ),
          { id: regularUserId },
          { transaction },
        );
      } else {
        await queryInterface.bulkInsert(
          'users',
          [
            buildUserInsertPayload(
              DEMO_USER_EMAIL,
              regularPasswordHash,
              'viewer',
              companyId,
              DEMO_USER_FIRST_NAME,
              DEMO_USER_LAST_NAME,
              now,
            ),
          ],
          { transaction },
        );
        regularUserId = await queryInterface.rawSelect(
          'users',
          { where: { email: DEMO_USER_EMAIL }, transaction },
          'id',
        );
      }

      await queryInterface.bulkUpdate(
        'companies',
        buildCompanyUpdatePayload(now, accountantId),
        { id: companyId },
        { transaction },
      );

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      const { Op } = Sequelize;
      await queryInterface.bulkDelete(
        'users',
        { email: { [Op.in]: [DEMO_ACCOUNTANT_EMAIL, DEMO_USER_EMAIL] } },
        { transaction },
      );
      await queryInterface.bulkDelete(
        'companies',
        { taxId: DEMO_COMPANY_TAX_ID },
        { transaction },
      );
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
