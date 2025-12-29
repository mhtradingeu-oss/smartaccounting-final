module.exports = (sequelize, DataTypes) => {
  const BankTransaction = sequelize.define('BankTransaction', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    companyId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'companies',
        key: 'id',
      },
    },
    bankStatementId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'bank_statements',
        key: 'id',
      },
    },
    transactionDate: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'date',
    },
    valueDate: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'value_date',
    },
    description: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    amount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
    },
    currency: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'EUR',
    },
    transactionType: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'DEBIT',
    },
    reference: {
      type: DataTypes.STRING,
    },
    category: {
      type: DataTypes.STRING,
    },
    vatCategory: {
      type: DataTypes.STRING,
      field: 'vat_category',
    },
    counterpartyName: {
      type: DataTypes.STRING,
      field: 'counterparty_name',
    },
    isReconciled: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_reconciled',
    },
    reconciledWith: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'reconciled_with',
    },
  }, {
    tableName: 'bank_transactions',
    timestamps: true,
  });

  // Architectural Guard: Immutability for reconciled transactions
  // eslint-disable-next-line no-unused-vars -- required by Sequelize hook signature
  BankTransaction.beforeUpdate(async (bankTransaction, options = {}) => {
    const wasReconciled = bankTransaction._previousDataValues?.isReconciled;
    const allowUndo = Boolean(options.allowReconcileUndo);
    if (wasReconciled && !allowUndo) {
      throw new Error('Reconciled bank transactions cannot be modified.');
    }
  });
  BankTransaction.associate = (models) => {
    BankTransaction.belongsTo(models.BankStatement, { foreignKey: 'bankStatementId', as: 'bankStatement' });
    BankTransaction.belongsTo(models.Company, { foreignKey: 'companyId', as: 'company' });
    if (models.Transaction) {
      BankTransaction.belongsTo(models.Transaction, {
        foreignKey: 'reconciledWith',
        as: 'reconciledTransaction',
      });
    }
  };

  return BankTransaction;
};
