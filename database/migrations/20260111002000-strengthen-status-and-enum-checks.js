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

        const columnRef = `"${constraint.column}"`;
        await queryInterface.sequelize.query(
          `
          ALTER TABLE "${constraint.table}"
          ADD CONSTRAINT "${constraint.name}"
          CHECK (${columnRef} IN (${constraint.values.map((value) => `'${value}'`).join(', ')}));
        `,
          { transaction },
        );
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      for (const constraint of CONSTRAINTS) {
        await queryInterface.sequelize.query(
          `ALTER TABLE "${constraint.table}" DROP CONSTRAINT IF EXISTS "${constraint.name}";`,
          { transaction },
        );
      }
    });
  },
};
