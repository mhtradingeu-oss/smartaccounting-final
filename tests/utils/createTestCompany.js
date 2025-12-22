const { Company } = require('../../src/models');

module.exports.createTestCompany = async (overrides = {}) => {
  return Company.create({
    name: 'Test Company',
    taxId: 'DE123456789',
    aiEnabled: true,
    address: 'Test Street 1',
    city: 'Berlin',
    postalCode: '10115',
    country: 'DE',
    ...overrides,
  });
};
