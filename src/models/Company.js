const { Model } = require('sequelize');

class Company extends Model {
  static associate(models) {
    const safeAssociate = (targetModel, alias, associateFn) => {
      if (
        !targetModel ||
        targetModel.sequelize !== this.sequelize ||
        this.associations?.[alias]
      ) {
        return;
      }
      associateFn(targetModel);
    };

    safeAssociate(models.User, 'users', (target) => {
      this.hasMany(target, {
        foreignKey: 'companyId',
        as: 'users',
      });
    });

    safeAssociate(models.Invoice, 'invoices', (target) => {
      this.hasMany(target, {
        foreignKey: 'companyId',
        as: 'invoices',
      });
    });

    safeAssociate(models.Expense, 'expenses', (target) => {
      this.hasMany(target, {
        foreignKey: 'companyId',
        as: 'expenses',
      });
    });

    safeAssociate(models.Transaction, 'transactions', (target) => {
      this.hasMany(target, {
        foreignKey: 'companyId',
        as: 'transactions',
      });
    });

    safeAssociate(models.BankStatement, 'bankStatements', (target) => {
      this.hasMany(target, {
        foreignKey: 'companyId',
        as: 'bankStatements',
      });
    });

    safeAssociate(models.BankTransaction, 'bankTransactions', (target) => {
      this.hasMany(target, {
        foreignKey: 'companyId',
        as: 'bankTransactions',
      });
    });

    safeAssociate(models.TaxReport, 'taxReports', (target) => {
      this.hasMany(target, {
        foreignKey: 'companyId',
        as: 'taxReports',
      });
    });

    safeAssociate(models.FileAttachment, 'attachments', (target) => {
      this.hasMany(target, {
        foreignKey: 'companyId',
        as: 'attachments',
      });
    });
  }
}

module.exports = (sequelize, DataTypes) => {
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
      aiEnabled: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      ttsEnabled: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
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
