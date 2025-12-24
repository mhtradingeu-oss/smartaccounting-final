const INDEX_DEFINITIONS = [
  { table: 'invoices', columns: ['companyId'], name: 'idx_invoices_company_id' },
  { table: 'invoices', columns: ['userId'], name: 'idx_invoices_user_id' },
  { table: 'invoices', columns: ['status'], name: 'idx_invoices_status' },
  { table: 'invoices', columns: ['createdAt'], name: 'idx_invoices_created_at' },
  { table: 'expenses', columns: ['companyId'], name: 'idx_expenses_company_id' },
  { table: 'expenses', columns: ['createdByUserId'], name: 'idx_expenses_created_by_user_id' },
  { table: 'expenses', columns: ['status'], name: 'idx_expenses_status' },
  { table: 'expenses', columns: ['createdAt'], name: 'idx_expenses_created_at' },
  { table: 'bank_statements', columns: ['companyId'], name: 'idx_bank_statements_company_id' },
  { table: 'bank_statements', columns: ['userId'], name: 'idx_bank_statements_user_id' },
  { table: 'bank_statements', columns: ['status'], name: 'idx_bank_statements_status' },
  { table: 'bank_statements', columns: ['createdAt'], name: 'idx_bank_statements_created_at' },
  { table: 'bank_transactions', columns: ['companyId'], name: 'idx_bank_transactions_company_id' },
  { table: 'bank_transactions', columns: ['bankStatementId'], name: 'idx_bank_transactions_statement_id' },
  { table: 'bank_transactions', columns: ['createdAt'], name: 'idx_bank_transactions_created_at' },
  { table: 'tax_reports', columns: ['companyId'], name: 'idx_tax_reports_company_id' },
  { table: 'tax_reports', columns: ['submittedBy'], name: 'idx_tax_reports_submitted_by' },
  { table: 'tax_reports', columns: ['status'], name: 'idx_tax_reports_status' },
  { table: 'tax_reports', columns: ['createdAt'], name: 'idx_tax_reports_created_at' },
  { table: 'companies', columns: ['userId'], name: 'idx_companies_user_id' },
  { table: 'companies', columns: ['createdAt'], name: 'idx_companies_created_at' },
  { table: 'users', columns: ['companyId'], name: 'idx_users_company_id' },
  { table: 'users', columns: ['createdAt'], name: 'idx_users_created_at' },
];

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.sequelize.transaction(async (transaction) => {
      for (const definition of INDEX_DEFINITIONS) {
        await queryInterface.addIndex(definition.table, definition.columns, {
          name: definition.name,
          transaction,
        });
      }
    });
  },

  down: async (queryInterface) => {
    await queryInterface.sequelize.transaction(async (transaction) => {
      for (const definition of INDEX_DEFINITIONS) {
        await queryInterface.removeIndex(definition.table, definition.name, { transaction });
      }
    });
  },
};
