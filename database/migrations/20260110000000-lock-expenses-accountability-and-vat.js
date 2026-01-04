'use strict';

const { QueryTypes } = require('sequelize');

const NEW_CONSTRAINT = 'expenses_vat_math_consistency';
const LEGACY_CONSTRAINT = 'expenses_net_vat_gross_consistency';

const buildMissingCountsError = (counts) => {
  const entries = Object.entries(counts || {})
    .filter(([, value]) => Number(value) > 0)
    .map(([key, value]) => `${key}=${value}`);

  if (!entries.length) {
    return null;
  }

  return `expenses contain unexpected nulls: ${entries.join(', ')}`;
};

module.exports = {
  async up(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      await queryInterface.sequelize.query(
        `
        UPDATE "expenses"
        SET "createdByUserId" = "userId"
        WHERE "createdByUserId" IS NULL AND "userId" IS NOT NULL;
      `,
        { transaction },
      );

      await queryInterface.sequelize.query(
        `
        UPDATE "expenses"
        SET "expenseDate" = "date"
        WHERE "expenseDate" IS NULL;
      `,
        { transaction },
      );

      await queryInterface.sequelize.query(
        `
        UPDATE "expenses"
        SET "category" = 'UNCATEGORIZED'
        WHERE "category" IS NULL;
      `,
        { transaction },
      );

      await queryInterface.sequelize.query(
        `
        UPDATE "expenses"
        SET "currency" = 'EUR'
        WHERE "currency" IS NULL;
      `,
        { transaction },
      );

      await queryInterface.sequelize.query(
        `
        UPDATE "expenses"
        SET "vatAmount" = "grossAmount" - "netAmount"
        WHERE "vatAmount" IS NULL
          AND "grossAmount" IS NOT NULL
          AND "netAmount" IS NOT NULL;
      `,
        { transaction },
      );

      await queryInterface.sequelize.query(
        `
        UPDATE "expenses"
        SET "grossAmount" = "netAmount" + "vatAmount"
        WHERE "grossAmount" IS NULL
          AND "netAmount" IS NOT NULL
          AND "vatAmount" IS NOT NULL;
      `,
        { transaction },
      );

      await queryInterface.sequelize.query(
        `
        UPDATE "expenses"
        SET "vatRate" = CASE
          WHEN "netAmount" = 0 THEN 0
          ELSE "vatAmount" / NULLIF("netAmount", 0)
        END
        WHERE "vatRate" IS NULL
          AND "netAmount" IS NOT NULL
          AND "vatAmount" IS NOT NULL;
      `,
        { transaction },
      );

      const [missingCounts] = await queryInterface.sequelize.query(
        `
        SELECT
          SUM(CASE WHEN "createdByUserId" IS NULL THEN 1 ELSE 0 END) AS createdByMissing,
          SUM(CASE WHEN "netAmount" IS NULL THEN 1 ELSE 0 END) AS netMissing,
          SUM(CASE WHEN "vatAmount" IS NULL THEN 1 ELSE 0 END) AS vatAmountMissing,
          SUM(CASE WHEN "grossAmount" IS NULL THEN 1 ELSE 0 END) AS grossMissing,
          SUM(CASE WHEN "vatRate" IS NULL THEN 1 ELSE 0 END) AS vatRateMissing
        FROM "expenses";
      `,
        { transaction, type: QueryTypes.SELECT },
      );

      const errorMessage = buildMissingCountsError(missingCounts);
      if (errorMessage) {
        throw new Error(errorMessage);
      }

      await queryInterface.sequelize.query(
        `ALTER TABLE "expenses" DROP CONSTRAINT IF EXISTS "${LEGACY_CONSTRAINT}";`,
        { transaction },
      );

      await queryInterface.sequelize.query(
        `
        ALTER TABLE "expenses"
        ADD CONSTRAINT "${NEW_CONSTRAINT}"
        CHECK (
          "netAmount" >= 0
          AND "vatAmount" >= 0
          AND "grossAmount" >= 0
          AND "vatRate" >= 0
          AND "grossAmount" = "netAmount" + "vatAmount"
          AND "vatAmount" = "netAmount" * "vatRate"
        );
      `,
        { transaction },
      );

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(
        `ALTER TABLE "expenses" DROP CONSTRAINT IF EXISTS "${NEW_CONSTRAINT}";`,
        { transaction },
      );

      await queryInterface.sequelize.query(
        `
        ALTER TABLE "expenses"
        ADD CONSTRAINT "${LEGACY_CONSTRAINT}"
        CHECK (
          ("netAmount" IS NULL AND "vatAmount" IS NULL AND "grossAmount" IS NULL AND "vatRate" IS NULL)
          OR
          (
            "netAmount" IS NOT NULL
            AND "vatAmount" IS NOT NULL
            AND "grossAmount" IS NOT NULL
            AND "vatRate" IS NOT NULL
            AND "netAmount" >= 0
            AND "vatAmount" >= 0
            AND "grossAmount" >= 0
            AND "vatRate" >= 0
            AND "grossAmount" = "netAmount" + "vatAmount"
            AND "vatAmount" = "netAmount" * "vatRate"
          )
        );
      `,
        { transaction },
      );
    });
  },
};
