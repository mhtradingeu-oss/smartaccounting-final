'use strict';

const ENTITY_TYPE_ENUM_NAME = 'enum_ai_insights_entityType';
const SEVERITY_ENUM_NAME = 'enum_ai_insights_severity';
const ENTITY_TYPE_VALUES = ['invoice', 'expense', 'bankTransaction', 'taxReport', 'user'];
const SEVERITY_VALUES = ['low', 'medium', 'high'];

const changeColumns = async (queryInterface, columns, transaction) => {
  for (const column of columns) {
    await queryInterface.changeColumn('ai_insights', column.name, column.definition, { transaction });
  }
};

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    const isPostgres = queryInterface.sequelize.getDialect() === 'postgres';

    try {
      if (isPostgres) {
        await queryInterface.sequelize.query(
          'ALTER TABLE "ai_insights" ALTER COLUMN "entityType" TYPE VARCHAR(32) USING "entityType"::VARCHAR;',
          { transaction },
        );
        await queryInterface.sequelize.query(
          'ALTER TABLE "ai_insights" ALTER COLUMN "severity" TYPE VARCHAR(32) USING "severity"::VARCHAR;',
          { transaction },
        );
      }

      await changeColumns(queryInterface, [
        {
          name: 'severity',
          definition: {
            type: Sequelize.STRING,
            allowNull: true,
          },
        },
        {
          name: 'confidenceScore',
          definition: {
            type: Sequelize.FLOAT,
            allowNull: true,
          },
        },
        {
          name: 'summary',
          definition: {
            type: Sequelize.TEXT,
            allowNull: true,
          },
        },
        {
          name: 'why',
          definition: {
            type: Sequelize.TEXT,
            allowNull: true,
          },
        },
        {
          name: 'legalContext',
          definition: {
            type: Sequelize.TEXT,
            allowNull: true,
          },
        },
        {
          name: 'evidence',
          definition: {
            type: isPostgres ? Sequelize.JSONB : Sequelize.TEXT,
            allowNull: true,
          },
        },
        {
          name: 'ruleId',
          definition: {
            type: Sequelize.STRING,
            allowNull: true,
          },
        },
        {
          name: 'modelVersion',
          definition: {
            type: Sequelize.STRING,
            allowNull: true,
          },
        },
        {
          name: 'featureFlag',
          definition: {
            type: Sequelize.STRING,
            allowNull: true,
          },
        },
        {
          name: 'disclaimer',
          definition: {
            type: Sequelize.STRING,
            allowNull: true,
          },
        },
      ], transaction);

      if (isPostgres) {
        await queryInterface.sequelize.query(
          `DROP TYPE IF EXISTS "${SEVERITY_ENUM_NAME}";`,
          { transaction },
        );
        await queryInterface.sequelize.query(
          `DROP TYPE IF EXISTS "${ENTITY_TYPE_ENUM_NAME}";`,
          { transaction },
        );
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    const isPostgres = queryInterface.sequelize.getDialect() === 'postgres';

    try {
      if (isPostgres) {
        await queryInterface.sequelize.query(
          `CREATE TYPE IF NOT EXISTS "${ENTITY_TYPE_ENUM_NAME}" AS ENUM(${ENTITY_TYPE_VALUES
            .map((value) => `'${value}'`)
            .join(', ')});`,
          { transaction },
        );
        await queryInterface.sequelize.query(
          `CREATE TYPE IF NOT EXISTS "${SEVERITY_ENUM_NAME}" AS ENUM(${SEVERITY_VALUES
            .map((value) => `'${value}'`)
            .join(', ')});`,
          { transaction },
        );
      }

      await changeColumns(queryInterface, [
        {
          name: 'confidenceScore',
          definition: {
            type: Sequelize.FLOAT,
            allowNull: false,
          },
        },
        {
          name: 'summary',
          definition: {
            type: Sequelize.TEXT,
            allowNull: false,
          },
        },
        {
          name: 'why',
          definition: {
            type: Sequelize.TEXT,
            allowNull: false,
          },
        },
        {
          name: 'legalContext',
          definition: {
            type: Sequelize.TEXT,
            allowNull: false,
          },
        },
        {
          name: 'evidence',
          definition: {
            type: isPostgres ? Sequelize.JSONB : Sequelize.TEXT,
            allowNull: false,
          },
        },
        {
          name: 'ruleId',
          definition: {
            type: Sequelize.STRING,
            allowNull: false,
          },
        },
        {
          name: 'modelVersion',
          definition: {
            type: Sequelize.STRING,
            allowNull: false,
          },
        },
        {
          name: 'featureFlag',
          definition: {
            type: Sequelize.STRING,
            allowNull: false,
          },
        },
        {
          name: 'disclaimer',
          definition: {
            type: Sequelize.STRING,
            allowNull: false,
          },
        },
      ], transaction);

      if (isPostgres) {
        await queryInterface.changeColumn(
          'ai_insights',
          'entityType',
          {
            type: Sequelize.ENUM(...ENTITY_TYPE_VALUES),
            allowNull: false,
          },
          { transaction },
        );
        await queryInterface.changeColumn(
          'ai_insights',
          'severity',
          {
            type: Sequelize.ENUM(...SEVERITY_VALUES),
            allowNull: false,
          },
          { transaction },
        );
      } else {
        await queryInterface.changeColumn(
          'ai_insights',
          'entityType',
          {
            type: Sequelize.STRING,
            allowNull: false,
          },
          { transaction },
        );
        await queryInterface.changeColumn(
          'ai_insights',
          'severity',
          {
            type: Sequelize.STRING,
            allowNull: false,
          },
          { transaction },
        );
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
