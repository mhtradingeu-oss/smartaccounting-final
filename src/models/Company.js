const { Model, DataTypes } = require('sequelize');

class Company extends Model {
  static associate(models) {
    Company.hasMany(models.User, {
      foreignKey: 'companyId',
      as: 'users',
    });


    Company.hasMany(models.Invoice, {
      foreignKey: 'companyId',
      as: 'invoices',
    });
    Company.hasMany(models.Expense, {
      foreignKey: 'companyId',
      as: 'expenses',
    });

    Company.hasMany(models.Transaction, {
      foreignKey: 'companyId',
      as: 'transactions',
    });

    Company.hasMany(models.BankStatement, {
      foreignKey: 'companyId',
      as: 'bankStatements',
    });

    Company.hasMany(models.BankTransaction, {
      foreignKey: 'companyId',
      as: 'bankTransactions',
    });

    Company.hasMany(models.TaxReport, {
      foreignKey: 'companyId',
      as: 'taxReports',
    });

    Company.hasMany(models.FileAttachment, {
      foreignKey: 'companyId',
      as: 'attachments',
    });
  }
}

module.exports = (sequelize) => {
  Company.init(
    {
      name: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: true,
        },
      },
      taxId: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      address: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      city: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      postalCode: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      country: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      stripeCustomerId: {
        type: DataTypes.STRING,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'Company',
      tableName: 'companies',
    },
  );

  return Company;
};
