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
      Expense.hasMany(models.FileAttachment, {
        foreignKey: 'expenseId',
        as: 'attachments',
      });
    }
  }

  Expense.init(
    {
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      companyId: {
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
        type: DataTypes.DECIMAL(5, 2),
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
      tableName: 'Expenses',
    },
  );

  const FINAL_EXPENSE_STATUSES = new Set(['booked', 'archived']);
  const ALLOWED_FINAL_EXPENSE_FIELDS = new Set(['status', 'updatedAt']);
  Expense.addHook('beforeUpdate', (expense) => {
    const prevStatus = (expense._previousDataValues?.status || '').toLowerCase();
    if (!FINAL_EXPENSE_STATUSES.has(prevStatus)) {
      return;
    }
    const changedFields = (expense.changed() || []).filter(
      (field) => !ALLOWED_FINAL_EXPENSE_FIELDS.has(field),
    );
    if (changedFields.length > 0) {
      const err = new Error('Approved expenses cannot be modified; create a correction entry instead.');
      err.status = 400;
      throw err;
    }
  });

  return Expense;
};
