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
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
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
      type: DataTypes.ENUM('income', 'expense'),
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
    },
    vatAmount: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0.00,
    },
    reference: {
      type: DataTypes.STRING,
    },
    nonDeductible: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    creditAmount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
    },
    debitAmount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
    },
    isReconciled: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    bankTransactionId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
  }, {
    tableName: 'transactions',
    timestamps: true,
  });

  Transaction.associate = (models) => {
    Transaction.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
    Transaction.belongsTo(models.Company, { foreignKey: 'companyId', as: 'company' });
  };

  return Transaction;
};
