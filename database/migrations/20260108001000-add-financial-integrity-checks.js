'use strict';

const POSTGRES_CONSTRAINTS = [
  {
    table: '"expenses"',
    name: 'expenses_net_vat_gross_consistency',
    sql: `
      ALTER TABLE "expenses"
      ADD CONSTRAINT expenses_net_vat_gross_consistency
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
  },
  {
    table: '"invoice_items"',
    name: 'invoice_items_line_consistency',
    sql: `
      ALTER TABLE "invoice_items"
      ADD CONSTRAINT invoice_items_line_consistency
      CHECK (
        "lineNet" >= 0
        AND "lineVat" >= 0
        AND "lineGross" >= 0
        AND "vatRate" >= 0
        AND "lineGross" = "lineNet" + "lineVat"
        AND "lineVat" = "lineNet" * "vatRate"
      );
    `,
  },
  {
    table: '"transactions"',
    name: 'transactions_vat_credit_debit_checks',
    sql: `
      ALTER TABLE "transactions"
      ADD CONSTRAINT transactions_vat_credit_debit_checks
      CHECK (
        "amount" >= 0
        AND ("credit_amount" IS NULL OR "credit_amount" >= 0)
        AND ("debit_amount" IS NULL OR "debit_amount" >= 0)
        AND (
          "vat_amount" IS NULL
          OR (
            "vat_rate" IS NOT NULL
            AND "vat_rate" >= 0
            AND "vat_amount" >= 0
            AND "vat_amount" * (1 + "vat_rate") = "amount" * "vat_rate"
          )
        )
      );
    `,
  },
];

module.exports = {
  up: async (queryInterface) => {
    if (queryInterface.sequelize.getDialect() !== 'postgres') {
      return;
    }
    for (const constraint of POSTGRES_CONSTRAINTS) {
      await queryInterface.sequelize.query(constraint.sql);
    }
  },
  down: async (queryInterface) => {
    if (queryInterface.sequelize.getDialect() !== 'postgres') {
      return;
    }
    for (const constraint of POSTGRES_CONSTRAINTS) {
      await queryInterface.sequelize.query(
        `ALTER TABLE ${constraint.table} DROP CONSTRAINT IF EXISTS ${constraint.name};`,
      );
    }
  },
};
