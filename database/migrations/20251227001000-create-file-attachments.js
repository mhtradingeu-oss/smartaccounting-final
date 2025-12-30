'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const dialect = queryInterface.sequelize.getDialect();
    if (dialect === 'postgres') {
      await queryInterface.sequelize.query('CREATE EXTENSION IF NOT EXISTS pgcrypto;');
    }
    await queryInterface.createTable('file_attachments', {
      id:
        dialect === 'sqlite'
          ? { type: Sequelize.STRING, allowNull: false, primaryKey: true }
          : {
              type: Sequelize.UUID,
              defaultValue: Sequelize.literal('gen_random_uuid()'),
              allowNull: false,
              primaryKey: true,
            },
      file_name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      original_name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      file_path: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      file_size: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      mime_type: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      file_hash: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      document_type: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      company_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'companies',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      uploaded_by: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      ocr_text: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      ocr_confidence: {
        type: Sequelize.FLOAT,
        allowNull: true,
      },
      extracted_data: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      processing_status: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      archived: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      retention_period: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 10,
      },
      expense_id: {
        type: Sequelize.UUID,
        allowNull: true,
      },
      invoice_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });
    await queryInterface.addIndex('file_attachments', ['company_id']);
    await queryInterface.addIndex('file_attachments', ['invoice_id']);
    await queryInterface.addIndex('file_attachments', ['expense_id']);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('file_attachments');
  },
};
