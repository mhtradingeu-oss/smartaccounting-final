const { Model } = require('sequelize');

const VALID_ROLES = ['admin', 'accountant', 'auditor', 'viewer'];

class User extends Model {
  static associate(models) {
    User.belongsTo(models.Company, {
      foreignKey: 'companyId',
      as: 'company',
    });

    User.hasMany(models.Invoice, {
      foreignKey: 'userId',
      as: 'invoices',
    });

    if (models.Transaction) {
      User.hasMany(models.Transaction, {
        foreignKey: 'userId',
        as: 'transactions',
      });
    }

    if (models.AuditLog) {
      User.hasMany(models.AuditLog, {
        foreignKey: 'userId',
        as: 'auditLogs',
      });
    }

    if (models.FileAttachment) {
      User.hasMany(models.FileAttachment, {
        foreignKey: 'uploadedBy',
        as: 'uploadedFiles',
      });
    }
  }

  toJSON() {
    const attributes = { ...this.get() };
    delete attributes.password;
    return attributes;
  }
}

module.exports = (sequelize, DataTypes) => {
  User.init(
    {
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
          isEmail: true,
          notEmpty: true,
        },
      },
      password: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      firstName: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: true,
        },
      },
      lastName: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: true,
        },
      },
      role: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'viewer',
        validate: {
          isIn: [VALID_ROLES],
        },
      },
      companyId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'companies',
          key: 'id',
        },
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
      isAnonymized: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      anonymizedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'User',
      tableName: 'users',
      defaultScope: {
        attributes: { exclude: ['password'] },
      },
      scopes: {
        withPassword: {
          attributes: { include: ['password'] },
        },
      },
    },
  );

  return User;
};
