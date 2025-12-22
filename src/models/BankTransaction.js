module.exports = (sequelize, DataTypes) => {
  const BankTransaction = sequelize.define('BankTransaction', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
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
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'bank_statements',
        key: 'id',
      },
    },
    transactionDate: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    valueDate: {
      type: DataTypes.DATE,
      allowNull: true,
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
      type: DataTypes.ENUM('DEBIT', 'CREDIT'),
      allowNull: false,
    },
    reference: {
      type: DataTypes.STRING,
    },
    category: {
      type: DataTypes.STRING,
    },
    vatCategory: {
      type: DataTypes.STRING,
    },
    counterpartyName: {
      type: DataTypes.STRING,
    },
    isReconciled: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  }, {
    tableName: 'bank_transactions',
    timestamps: true,
  });

  // Architectural Guard: Immutability for reconciled transactions
  BankTransaction.beforeUpdate(async (transaction, options) => {
    if (transaction.isReconciled) {
      throw new Error('Reconciled bank transactions cannot be modified.');
    }
  });
  BankTransaction.associate = (models) => {
    BankTransaction.belongsTo(models.BankStatement, { foreignKey: 'bankStatementId', as: 'bankStatement' });
    BankTransaction.belongsTo(models.Company, { foreignKey: 'companyId', as: 'company' });
  };

  return BankTransaction;
};
