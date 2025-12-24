module.exports = {
  up: async (queryInterface) => {
    await queryInterface.renameColumn('bank_transactions', 'transactionDate', 'transaction_date');
    await queryInterface.renameColumn('transactions', 'transactionDate', 'transaction_date');
  },

  down: async (queryInterface) => {
    await queryInterface.renameColumn('bank_transactions', 'transaction_date', 'transactionDate');
    await queryInterface.renameColumn('transactions', 'transaction_date', 'transactionDate');
  },
};
