module.exports = (sequelize, DataTypes) => {
  const BankStatementImportDryRun = sequelize.define(
    'BankStatementImportDryRun',
    {
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
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
      },
      bankStatementId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'bank_statements',
          key: 'id',
        },
      },
      confirmationToken: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      filePath: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      fileName: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      fileFormat: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'PENDING',
      },
      summary: {
        type: DataTypes.JSON,
        allowNull: true,
      },
      totalTransactions: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      processedTransactions: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      matches: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      unmatched: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      warnings: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      errorMessage: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      confirmedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      tableName: 'bank_statement_import_dry_runs',
      timestamps: true,
    },
  );

  BankStatementImportDryRun.associate = (models) => {
    BankStatementImportDryRun.belongsTo(models.Company, { foreignKey: 'companyId', as: 'company' });
    BankStatementImportDryRun.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
    BankStatementImportDryRun.belongsTo(models.BankStatement, {
      foreignKey: 'bankStatementId',
      as: 'bankStatement',
    });
  };

  return BankStatementImportDryRun;
};
