'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const dialect = queryInterface.sequelize.getDialect();

    if (dialect === 'postgres') {
      await queryInterface.sequelize.query(
        'CREATE EXTENSION IF NOT EXISTS pgcrypto;'
      );
    }

    await queryInterface.createTable('event_store', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },

      eventType: {
        type: Sequelize.STRING,
        allowNull: false,
      },

      entityType: {
        type: Sequelize.STRING,
        allowNull: false,
      },

      entityId: {
        type: Sequelize.STRING,
        allowNull: false,
      },

      companyId: {
        type: Sequelize.STRING,
        allowNull: false,
      },

      userId: {
        type: Sequelize.STRING,
        allowNull: true,
      },

      payload: {
        type: Sequelize.JSONB,
        allowNull: true,
      },

      metadata: {
        type: Sequelize.JSONB,
        allowNull: true,
      },

      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex(
      'event_store',
      ['entityType', 'entityId'],
      {
        name: 'event_store_entity_lookup_idx',
      },
    );

    await queryInterface.addIndex(
      'event_store',
      ['companyId'],
      {
        name: 'event_store_company_idx',
      },
    );

    await queryInterface.addIndex(
      'event_store',
      ['eventType'],
      {
        name: 'event_store_type_idx',
      },
    );
  },

  async down(queryInterface) {
    await queryInterface.dropTable('event_store');
  },
};
