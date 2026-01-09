'use strict';

const { QueryTypes } = require('sequelize');

const CONSTRAINTS = [
  {
    table: 'ai_insights',
    name: 'ai_insights_severity_check',
    column: 'severity',
    values: ['low', 'medium', 'high'],
  },
  {
    table: 'ai_insights',
    name: 'ai_insights_entity_type_check',
    column: 'entityType',
    values: ['invoice', 'expense', 'bankTransaction', 'taxReport', 'user'],
  },
  {
    table: 'ai_insight_decisions',
    name: 'ai_insight_decisions_decision_check',
    column: 'decision',
    values: ['accepted', 'rejected', 'overridden'],
  },
  {
    table: 'bank_statement_import_dry_runs',
    name: 'bank_statement_import_dry_runs_status_check',
    column: 'status',
    values: ['PENDING', 'PROCESSING', 'CONFIRMED', 'FAILED'],
  },
];

const buildInvalidQuery = ({ table, column, values }) => {
  const columnRef = `"${column}"`;
  return `
  SELECT COUNT(*) AS invalid_count
  FROM "${table}"
  WHERE ${columnRef} IS NULL OR ${columnRef} NOT IN (${values.map((v) => `'${v}'`).join(', ')});
`;
};

module.exports = {
  async up(queryInterface) {
    const dialect = queryInterface.sequelize.getDialect();
    const transaction = await queryInterface.sequelize.transaction();
    try {
      for (const constraint of CONSTRAINTS) {
        const [result] = await queryInterface.sequelize.query(buildInvalidQuery(constraint), {
          type: QueryTypes.SELECT,
          transaction,
        });
        if (Number(result.invalid_count) > 0) {
          throw new Error(
            `Cannot add ${constraint.name} because ${result.invalid_count} records in ${constraint.table}.${constraint.column} reference unsupported values.`,
          );
        }
        if (dialect === 'postgres') {
          const columnRef = `"${constraint.column}"`;
          await queryInterface.sequelize.query(
            `
            ALTER TABLE "${constraint.table}"
            ADD CONSTRAINT "${constraint.name}"
            CHECK (${columnRef} IN (${constraint.values.map((value) => `'${value}'`).join(', ')}));
          `,
            { transaction },
          );
        } else if (dialect === 'sqlite') {
          // SQLite does not support adding/dropping constraints after table creation.
          // Data is validated, but constraint is not enforced at DB level.
        }
      }
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface) {
    const dialect = queryInterface.sequelize.getDialect();
    await queryInterface.sequelize.transaction(async (transaction) => {
      for (const constraint of CONSTRAINTS) {
        if (dialect === 'postgres') {
          await queryInterface.sequelize.query(
            `ALTER TABLE "${constraint.table}" DROP CONSTRAINT IF EXISTS "${constraint.name}";`,
            { transaction },
          );
        } else if (dialect === 'sqlite') {
          // SQLite does not support dropping constraints after table creation.
          // No-op for SQLite.
        }
      }
    });
  },
};
