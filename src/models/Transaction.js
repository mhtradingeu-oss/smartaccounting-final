module.exports = (sequelize, DataTypes) => {
  const Transaction = sequelize.define('Transaction', {
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
      field: 'company_id',
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
      field: 'user_id',
    },
    transactionDate: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'transaction_date',
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
    type: {
      type: DataTypes.STRING,
      allowNull: false,
      set(value) {
        this.setDataValue('type', (value || '').toLowerCase());
      },
    },
    category: {
      type: DataTypes.STRING,
    },
    vatRate: {
      type: DataTypes.DECIMAL(5, 4),
      defaultValue: 0.00,
      field: 'vat_rate',
    },
    vatAmount: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0.00,
      field: 'vat_amount',
    },
    reference: {
      type: DataTypes.STRING,
    },
    nonDeductible: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'non_deductible',
    },
    creditAmount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
      field: 'credit_amount',
    },
    debitAmount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
      field: 'debit_amount',
    },
    isReconciled: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_reconciled',
    },
    bankTransactionId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'bank_transaction_id',
      references: {
        model: 'bank_transactions',
        key: 'id',
      },
    },
  }, {
    tableName: 'transactions',
    timestamps: true,
    underscored: true,
  });

  Transaction.associate = (models) => {
    Transaction.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
    Transaction.belongsTo(models.Company, { foreignKey: 'companyId', as: 'company' });
  };

  return Transaction;
};
