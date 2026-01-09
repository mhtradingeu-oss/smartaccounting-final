const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Expense extends Model {
    static associate(models) {
      Expense.belongsTo(models.Company, {
        foreignKey: 'companyId',
        as: 'company',
      });
      Expense.belongsTo(models.User, {
        foreignKey: 'createdByUserId',
        as: 'createdBy',
      });
      Expense.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user',
      });
      Expense.hasMany(models.FileAttachment, {
        foreignKey: 'expenseId',
        as: 'attachments',
      });
    }
  }

  Expense.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      companyId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      createdByUserId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      vendorName: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      expenseDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      category: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      netAmount: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
      },
      vatRate: {
        type: DataTypes.DECIMAL(5, 4),
        allowNull: false,
      },
      vatAmount: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
      },
      grossAmount: {
        type: DataTypes.DECIMAL(12, 2),
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
      status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'draft',
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      source: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'manual',
      },
    },
    {
      sequelize,
      modelName: 'Expense',
      tableName: 'expenses',
    },
  );

  // Immutability: Once status is 'booked', only status can change
  Expense.addHook('beforeUpdate', (expense) => {
    const prevStatus = (expense._previousDataValues?.status || '').toLowerCase();
    // Only enforce immutability if previously booked
    if (prevStatus !== 'booked') {
      return;
    }
    // Allow only status field to change
    const changedFields = (expense.changed() || []).filter(
      (field) => field !== 'status' && field !== 'updatedAt',
    );
    if (changedFields.length > 0) {
      const err = new Error(
        'Once an expense is booked, only status changes are allowed. To modify other fields, create a correction entry.',
      );
      err.status = 400;
      throw err;
    }
  });

  return Expense;
};
