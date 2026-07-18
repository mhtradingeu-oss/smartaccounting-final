const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class AccountingPeriod extends Model {
    static associate(models) {
      AccountingPeriod.belongsTo(models.Company, {
        foreignKey: 'companyId',
        as: 'company',
      });
    }
  }

  AccountingPeriod.init(
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
      startDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      endDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM('OPEN', 'CLOSED'),
        allowNull: false,
        defaultValue: 'OPEN',
      },
      closedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      closedBy: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      reopenedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      reopenedBy: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      reason: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'AccountingPeriod',
      tableName: 'accounting_periods',
      indexes: [
        {
          unique: true,
          fields: ['companyId', 'startDate', 'endDate'],
          name: 'accounting_period_company_date_unique',
        },
        {
          fields: ['companyId', 'status', 'startDate', 'endDate'],
          name: 'accounting_period_lookup',
        },
      ],
      validate: {
        validRange() {
          if (this.startDate && this.endDate && this.startDate > this.endDate) {
            throw new Error('Accounting period startDate must be before or equal to endDate.');
          }
        },
      },
    },
  );

  return AccountingPeriod;
};
