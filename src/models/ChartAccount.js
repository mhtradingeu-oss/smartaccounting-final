module.exports = (sequelize, DataTypes) => {
  const ChartAccount = sequelize.define(
    'ChartAccount',
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      companyId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      code: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      type: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      normalBalance: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      taxCategory: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      isSystem: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      metadata: {
        type: DataTypes.JSON,
        allowNull: true,
      },
    },
    {
      tableName: 'chart_accounts',
      timestamps: true,
    },
  );

  ChartAccount.associate = (models) => {
    ChartAccount.belongsTo(models.Company, { foreignKey: 'companyId' });
    ChartAccount.hasMany(models.JournalEntryLine, {
      foreignKey: 'accountId',
      as: 'journalLines',
    });
  };

  return ChartAccount;
};
