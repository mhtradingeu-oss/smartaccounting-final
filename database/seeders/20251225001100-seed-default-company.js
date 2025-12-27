'use strict';

module.exports = {
  up: async (queryInterface, _Sequelize) => {
    // Check if company already exists
    const [company] = await queryInterface.sequelize.query(
      'SELECT id FROM companies WHERE name = \'Default Company\' LIMIT 1;',
    );
    if (company.length > 0) {
      // Already seeded, return existing id
      return;
    }
    // Insert Default Company
    await queryInterface.bulkInsert(
      'companies',
      [
        {
          name: 'Default Company',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      {},
    );
  },
  down: async (queryInterface, _Sequelize) => {
    await queryInterface.bulkDelete('companies', { name: 'Default Company' }, {});
  },
};
