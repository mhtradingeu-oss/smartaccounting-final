const { Model, DataTypes } = require('sequelize');

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

module.exports = (sequelize) => {
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
        type: DataTypes.ENUM('DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED'),
        allowNull: false,
        defaultValue: 'DRAFT',
      },
      date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      dueDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      clientName: {
        type: DataTypes.STRING,
        allowNull: false,
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

  // Register hooks only when Sequelize is ready
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
    // Architectural Guard: Immutability for finalized invoices
    const FINAL_STATUSES = new Set(['SENT', 'PAID', 'OVERDUE', 'CANCELLED']);
    const ALLOWED_FINAL_UPDATE_FIELDS = new Set(['status', 'updatedAt']);
    Invoice.addHook('beforeUpdate', (invoice) => {
      const prevStatus = (invoice._previousDataValues?.status || '').toUpperCase();
      if (!FINAL_STATUSES.has(prevStatus)) {
        return;
      }
      const changedFields = (invoice.changed() || []).filter((field) => !ALLOWED_FINAL_UPDATE_FIELDS.has(field));
      if (changedFields.length > 0) {
        const err = new Error('Finalized invoices cannot be modified; create a correction entry instead.');
        err.status = 400;
        throw err;
      }
    });
  };
  return Invoice;
};
