'use strict';

/**
 * Fix file_attachments.expense_id type.
 *
 * The expenses primary key is INTEGER, but the original file_attachments
 * migration created expense_id as UUID. That breaks PostgreSQL joins for
 * Expense.hasMany(FileAttachment, { foreignKey: 'expenseId' }).
 *
 * This migration keeps the existing column name used by the model
 * (expenseId -> field expense_id), converts it to INTEGER safely, and adds
 * a foreign key to expenses.id when possible.
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const dialect = queryInterface.sequelize.getDialect();
    const table = await queryInterface.describeTable('file_attachments');

    if (!table.expense_id) {
      await queryInterface.addColumn('file_attachments', 'expense_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
      });
    }

    if (dialect === 'postgres') {
      const [columns] = await queryInterface.sequelize.query(`
        SELECT data_type, udt_name
        FROM information_schema.columns
        WHERE table_name = 'file_attachments'
          AND column_name = 'expense_id'
        LIMIT 1
      `);

      const expenseIdColumn = columns[0];

      if (expenseIdColumn && expenseIdColumn.udt_name !== 'int4') {
        await queryInterface.sequelize.query(`
          ALTER TABLE "file_attachments"
          ALTER COLUMN "expense_id" TYPE INTEGER
          USING CASE
            WHEN "expense_id"::text ~ '^[0-9]+$' THEN "expense_id"::text::integer
            ELSE NULL
          END
        `);
      }

      const [constraints] = await queryInterface.sequelize.query(`
        SELECT constraint_name
        FROM information_schema.table_constraints
        WHERE table_name = 'file_attachments'
          AND constraint_type = 'FOREIGN KEY'
          AND constraint_name = 'file_attachments_expense_id_fkey'
      `);

      if (!constraints.length) {
        await queryInterface.addConstraint('file_attachments', {
          fields: ['expense_id'],
          type: 'foreign key',
          name: 'file_attachments_expense_id_fkey',
          references: {
            table: 'expenses',
            field: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        });
      }
    }

    if (
      dialect !== 'postgres' &&
      table.expense_id &&
      !/INT/i.test(String(table.expense_id.type || ''))
    ) {
      return;
    }

    try {
      await queryInterface.addIndex('file_attachments', ['expense_id'], {
        name: 'file_attachments_expense_id_idx',
      });
    } catch (err) {
      if (!/already exists|Duplicate key name/i.test(err.message)) {
        throw err;
      }
    }
  },

  down: async (queryInterface, Sequelize) => {
    const dialect = queryInterface.sequelize.getDialect();

    try {
      await queryInterface.removeIndex('file_attachments', 'file_attachments_expense_id_idx');
    } catch (err) {
      if (!/does not exist|Unknown index/i.test(err.message)) {
        throw err;
      }
    }

    if (dialect === 'postgres') {
      try {
        await queryInterface.removeConstraint(
          'file_attachments',
          'file_attachments_expense_id_fkey',
        );
      } catch (err) {
        if (!/does not exist|Unknown constraint/i.test(err.message)) {
          throw err;
        }
      }

      await queryInterface.sequelize.query(`
        ALTER TABLE "file_attachments"
        ALTER COLUMN "expense_id" TYPE UUID
        USING NULL
      `);
    } else {
      void Sequelize;
    }
  },
};
