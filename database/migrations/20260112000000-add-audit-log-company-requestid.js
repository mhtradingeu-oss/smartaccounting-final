'use strict';

const Sequelize = require('sequelize');
const { QueryTypes } = Sequelize;

module.exports = {
  async up(queryInterface) {
    const dialect = queryInterface.sequelize.getDialect();
    if (dialect === 'postgres') {
      await queryInterface.sequelize.query('CREATE EXTENSION IF NOT EXISTS pgcrypto;');
    }

    if (dialect === 'postgres') {
      await queryInterface.addColumn('audit_logs', 'companyId', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'companies',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      });
      await queryInterface.addColumn('audit_logs', 'requestId', {
        type: Sequelize.UUID,
        allowNull: true,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
      });
      await queryInterface.addColumn('audit_logs', 'metadata', {
        type: Sequelize.JSON,
        allowNull: true,
      });
      await queryInterface.sequelize.transaction(async (transaction) => {
        await queryInterface.sequelize.query(
          `
          UPDATE "audit_logs"
          SET "companyId" = "users"."companyId"
          FROM "users"
          WHERE "audit_logs"."companyId" IS NULL AND "users"."id" = "audit_logs"."userId";
        `,
          { transaction },
        );
        await queryInterface.sequelize.query(
          `
          UPDATE "audit_logs"
          SET "requestId" = gen_random_uuid()
          WHERE "requestId" IS NULL;
        `,
          { transaction },
        );
        const [missing] = await queryInterface.sequelize.query(
          `
          SELECT COUNT(*) AS missing
          FROM "audit_logs"
          WHERE "companyId" IS NULL;
        `,
          { type: QueryTypes.SELECT, transaction },
        );
        if (Number(missing?.missing ?? missing?.count ?? 0) > 0) {
          throw new Error(
            'audit_logs contains records without companyId. Backfill before re-running this migration.',
          );
        }
        await queryInterface.changeColumn(
          'audit_logs',
          'companyId',
          {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
              model: 'companies',
              key: 'id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },
          { transaction },
        );
        await queryInterface.changeColumn(
          'audit_logs',
          'requestId',
          {
            type: Sequelize.UUID,
            allowNull: false,
            defaultValue: Sequelize.literal('gen_random_uuid()'),
          },
          { transaction },
        );
      });
    } else if (dialect === 'sqlite') {
      // SQLite: add columns as nullable, no default for requestId, no constraints
      await queryInterface.addColumn('audit_logs', 'companyId', {
        type: Sequelize.INTEGER,
        allowNull: true,
      });
      await queryInterface.addColumn('audit_logs', 'requestId', {
        type: Sequelize.STRING,
        allowNull: true,
      });
      await queryInterface.addColumn('audit_logs', 'metadata', {
        type: Sequelize.JSON,
        allowNull: true,
      });
      await queryInterface.sequelize.query(
        `
        UPDATE "audit_logs"
        SET "requestId" = LOWER(HEX(RANDOMBLOB(16)))
        WHERE "requestId" IS NULL;
      `,
      );
      // Do not attempt to make columns non-nullable or add constraints in SQLite
    }
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('audit_logs', 'metadata');
    await queryInterface.removeColumn('audit_logs', 'requestId');
    await queryInterface.removeColumn('audit_logs', 'companyId');
  },
};
