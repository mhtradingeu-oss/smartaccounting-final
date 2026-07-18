const { Model } = require('sequelize');
const { assertAccountingDateOpen } = require('../services/accountingPeriodService');

class Invoice extends Model {
  static associate(models) {
    Invoice.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user',
    });
    Invoice.belongsTo(models.Company, {
      foreignKey: 'companyId',
      as: 'company',
    });
    Invoice.hasMany(models.InvoiceItem, {
      foreignKey: 'invoiceId',
      as: 'items',
      onDelete: 'CASCADE',
    });
    Invoice.hasMany(models.FileAttachment, {
      foreignKey: 'invoiceId',
      as: 'attachments',
    });
  }
}

module.exports = (sequelize, DataTypes) => {
  Invoice.init(
    {
      invoiceNumber: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
          notEmpty: true,
        },
      },
      subtotal: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
      },
      total: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
      },
      amount: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: true,
      },
      currency: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM(
          'DRAFT',
          'SENT',
          'PAID',
          'OVERDUE',
          'CANCELLED',
          'PARTIALLY_PAID',
        ),
        allowNull: false,
        defaultValue: 'DRAFT',
      },
      date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      dueDate: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      clientName: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      companyId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: 'Invoice',
      tableName: 'invoices',
    },
  );

  Invoice.associate = (models) => {
    Invoice.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user',
    });
    Invoice.belongsTo(models.Company, {
      foreignKey: 'companyId',
      as: 'company',
    });
    Invoice.hasMany(models.InvoiceItem, {
      foreignKey: 'invoiceId',
      as: 'items',
      onDelete: 'CASCADE',
    });
    Invoice.hasMany(models.FileAttachment, {
      foreignKey: 'invoiceId',
      as: 'attachments',
    });
    const FINAL_STATUSES = new Set(['SENT', 'PAID', 'OVERDUE', 'CANCELLED', 'PARTIALLY_PAID']);
    const ALLOWED_FINAL_UPDATE_FIELDS = new Set(['status', 'updatedAt']);

    Invoice.addHook('beforeCreate', async (invoice, options = {}) => {
      await assertAccountingDateOpen({
        companyId: invoice.companyId,
        accountingDate: invoice.date,
        transaction: options.transaction || null,
      });
    });

    Invoice.addHook('beforeUpdate', async (invoice, options = {}) => {
      const previousCompanyId =
        invoice._previousDataValues?.companyId || invoice.companyId;
      const previousDate =
        invoice._previousDataValues?.date || invoice.date;

      await assertAccountingDateOpen({
        companyId: previousCompanyId,
        accountingDate: previousDate,
        transaction: options.transaction || null,
      });

      if (invoice.changed('date') || invoice.changed('companyId')) {
        await assertAccountingDateOpen({
          companyId: invoice.companyId,
          accountingDate: invoice.date,
          transaction: options.transaction || null,
        });
      }

      const prevStatus = (invoice._previousDataValues?.status || '').toUpperCase();
      if (!FINAL_STATUSES.has(prevStatus)) {
        return;
      }

      const changedFields = (invoice.changed() || []).filter(
        (field) => !ALLOWED_FINAL_UPDATE_FIELDS.has(field),
      );

      if (changedFields.length > 0) {
        const err = new Error('Finalized invoices cannot be modified; create a correction entry instead.');
        err.status = 400;
        throw err;
      }
    });
  };

  return Invoice;
};
