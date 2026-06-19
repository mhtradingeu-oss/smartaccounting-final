const { Company } = require('../../src/models');

module.exports.createTestCompany = async (overrides = {}) => {
  return Company.create({
    name: 'Test Company',
    taxId: `DE${Date.now()}${Math.floor(Math.random() * 100000)}`,
    aiEnabled: true,
    address: 'Test Street 1',
    city: 'Berlin',
    postalCode: '10115',
    country: 'DE',
    ...overrides,
  });
};
