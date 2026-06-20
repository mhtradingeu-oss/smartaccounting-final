'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const dialect = queryInterface.sequelize.getDialect();

    const uuidPrimaryKey = dialect === 'sqlite'
      ? {
          type: Sequelize.STRING,
          primaryKey: true,
        }
      : {
          type: Sequelize.UUID,
          defaultValue: Sequelize.literal('gen_random_uuid()'),
          primaryKey: true,
        };

    if (dialect === 'postgres') {
      await queryInterface.sequelize.query('CREATE EXTENSION IF NOT EXISTS pgcrypto;');
    }

    await queryInterface.createTable('chart_accounts', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      companyId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'companies',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      code: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      type: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      normalBalance: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      taxCategory: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      isSystem: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      metadata: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });

    await queryInterface.addIndex('chart_accounts', ['companyId']);
    await queryInterface.addIndex('chart_accounts', ['companyId', 'code'], {
      unique: true,
      name: 'chart_accounts_company_code_unique',
    });

    await queryInterface.createTable('journal_entries', {
      id: uuidPrimaryKey,
      companyId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'companies',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      entryDate: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      sourceType: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      sourceId: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      status: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'draft',
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      currency: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'EUR',
      },
      createdBy: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      postedBy: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      postedAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      reversedAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      reversalOfId: {
        type: uuidPrimaryKey.type,
        allowNull: true,
        references: {
          model: 'journal_entries',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      metadata: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });

    await queryInterface.addIndex('journal_entries', ['companyId']);
    await queryInterface.addIndex('journal_entries', ['companyId', 'sourceType', 'sourceId'], {
      name: 'journal_entries_company_source',
    });
    await queryInterface.addIndex('journal_entries', ['companyId', 'status']);

    await queryInterface.createTable('journal_entry_lines', {
      id: uuidPrimaryKey,
      journalEntryId: {
        type: uuidPrimaryKey.type,
        allowNull: false,
        references: {
          model: 'journal_entries',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      companyId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'companies',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      accountId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'chart_accounts',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      debit: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
      },
      credit: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
      },
      currency: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'EUR',
      },
      taxCode: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      vatRate: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true,
      },
      counterpartyName: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      metadata: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });

    await queryInterface.addIndex('journal_entry_lines', ['companyId']);
    await queryInterface.addIndex('journal_entry_lines', ['journalEntryId']);
    await queryInterface.addIndex('journal_entry_lines', ['accountId']);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('journal_entry_lines');
    await queryInterface.dropTable('journal_entries');
    await queryInterface.dropTable('chart_accounts');
  },
};
