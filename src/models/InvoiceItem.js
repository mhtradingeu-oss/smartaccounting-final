const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class InvoiceItem extends Model {
    static associate(models) {
      InvoiceItem.belongsTo(models.Invoice, {
        foreignKey: 'invoiceId',
        as: 'invoice',
      });
    }
  }

  InvoiceItem.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      invoiceId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      description: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      quantity: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
      },
      unitPrice: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
      },
      vatRate: {
        type: DataTypes.DECIMAL(5, 4),
        allowNull: false,
      },
      lineNet: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
      },
      lineVat: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
      },
      lineGross: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: 'InvoiceItem',
      tableName: 'InvoiceItems',
    },
  );

  return InvoiceItem;
};
