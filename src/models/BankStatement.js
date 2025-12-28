module.exports = (sequelize, DataTypes) => {
  const BankStatement = sequelize.define('BankStatement', {
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
    userId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    bankName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    accountNumber: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'UNKNOWN',
    },
    iban: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    fileName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    fileFormat: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    filePath: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    statementPeriodStart: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    statementPeriodEnd: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    openingBalance: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.00,
    },
    closingBalance: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.00,
    },
    currency: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'EUR',
    },
    totalTransactions: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    processedTransactions: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'PROCESSING',
    },
    importDate: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  }, {
    tableName: 'bank_statements',
    timestamps: true,
  });

  BankStatement.associate = (models) => {
    BankStatement.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
    BankStatement.belongsTo(models.Company, { foreignKey: 'companyId', as: 'company' });
    BankStatement.hasMany(models.BankTransaction, { foreignKey: 'bankStatementId', as: 'transactions' });
  };

  return BankStatement;
};
