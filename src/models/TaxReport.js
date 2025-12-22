module.exports = (sequelize, DataTypes) => {
  const TaxReport = sequelize.define('TaxReport', {
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
    reportType: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    period: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    year: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    data: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: {},
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'draft',
    },
    generatedAt: {
      type: DataTypes.DATE,
    },
    submittedAt: {
      type: DataTypes.DATE,
    },
    submittedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    elsterStatus: {
      type: DataTypes.STRING,
    },
    elsterTransferTicket: {
      type: DataTypes.STRING,
    },
  }, {
    tableName: 'tax_reports',
    timestamps: true,
  });

  TaxReport.associate = (models) => {
    TaxReport.belongsTo(models.Company, { foreignKey: 'companyId', as: 'Company' });
    TaxReport.belongsTo(models.User, { foreignKey: 'submittedBy', as: 'submitter' });
  };

  return TaxReport;
};
