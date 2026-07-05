'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const dialect = queryInterface.sequelize.getDialect();

    const uuidPrimaryKey =
      dialect === 'sqlite'
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

    let tableExists = false;
    try {
      await queryInterface.describeTable('ai_approval_queue_items');
      tableExists = true;
    } catch {
      tableExists = false;
    }

    if (tableExists) {
      return;
    }

    await queryInterface.createTable('ai_approval_queue_items', {
      id: uuidPrimaryKey,
      approvalId: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      schemaVersion: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'ai_approval_queue.v1',
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
      requestedByUserId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      decidedByUserId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      status: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'pending',
      },
      decision: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      toolId: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      riskLevel: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      executionMode: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      requiresApproval: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      blocked: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      requestedBy: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      approvalReason: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      decisionReason: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      actionProposal: {
        type: Sequelize.JSON,
        allowNull: false,
      },
      metadata: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      expiresAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      decidedAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      auditRequired: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
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

    await queryInterface.addIndex('ai_approval_queue_items', ['companyId', 'status'], {
      name: 'ai_approval_queue_items_company_status',
    });
    await queryInterface.addIndex('ai_approval_queue_items', ['companyId', 'createdAt'], {
      name: 'ai_approval_queue_items_company_created',
    });
    await queryInterface.addIndex('ai_approval_queue_items', ['approvalId'], {
      unique: true,
      name: 'ai_approval_queue_items_approval_id_unique',
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('ai_approval_queue_items');
  },
};
