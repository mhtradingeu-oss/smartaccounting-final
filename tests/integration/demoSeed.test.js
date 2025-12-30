'use strict';

const { v4: uuidv4 } = require('uuid');
const { sequelize } = require('../../src/models');
const demoSeed = require('../../database/seeders/demo/20251226-demo-seed.js');

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const SAMPLE_ITEMS = [
  { description: 'Demo consulting block', quantity: 4, unitPrice: 120, vatRate: 0.19 },
  { description: 'Support retainer', quantity: 2, unitPrice: 250, vatRate: 0.19 },
];

describe('demo invoice item helper', () => {
  let company;
  let invoice;

  beforeAll(async () => {
    const { Company, Invoice } = sequelize.models;
    company = await Company.create({
      name: 'Seed Test Co',
      taxId: `SEED-${Date.now()}`,
      address: '1 Seed St',
      city: 'Testville',
      postalCode: '00000',
      country: 'DE',
      aiEnabled: true,
    });
    if (global.testUser) {
      await global.testUser.update({ companyId: company.id });
    }
    invoice = await Invoice.create({
      invoiceNumber: `SEED-INV-${Date.now()}`,
      subtotal: 1000,
      total: 1180,
      amount: 1180,
      currency: 'EUR',
      status: 'DRAFT',
      date: '2025-01-01',
      dueDate: '2025-01-14',
      clientName: 'Seed Client',
      notes: 'Validating invoice item uuids',
      userId: global.testUser?.id || null,
      companyId: company.id,
    });
  });

  afterAll(async () => {
    const queryInterface = sequelize.getQueryInterface();
    if (invoice) {
      await queryInterface.bulkDelete('InvoiceItems', { invoiceId: invoice.id }, {});
      await sequelize.models.Invoice.destroy({ where: { id: invoice.id }, force: true });
    }
    if (company) {
      await company.destroy({ force: true });
    }
    if (global.testUser) {
      await global.testUser.update({ companyId: null });
    }
  });

  it('records invoice items with generated UUID ids', async () => {
    const queryInterface = sequelize.getQueryInterface();
    const now = new Date();
    const builtItems = demoSeed.buildInvoiceItems(SAMPLE_ITEMS);
    const itemRecords = builtItems.map((item) => ({
      id: uuidv4(),
      ...item,
      invoiceId: invoice.id,
      createdAt: now,
      updatedAt: now,
    }));

    await queryInterface.bulkInsert('InvoiceItems', itemRecords, {});
    const [rows] = await sequelize.query(
      'SELECT id FROM "InvoiceItems" WHERE "invoiceId" = :invoiceId;',
      { replacements: { invoiceId: invoice.id } },
    );

    expect(rows.length).toBe(itemRecords.length);
    rows.forEach(({ id }) => {
      expect(id).toBeTruthy();
      expect(id).toMatch(UUID_REGEX);
    });
  });
});
