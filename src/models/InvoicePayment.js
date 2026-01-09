// InvoicePayment model aligned with migration and service usage
module.exports = (sequelize, DataTypes) => {
  const InvoicePayment = sequelize.define(
    'InvoicePayment',
    {
      id: {
        type: DataTypes.STRING, // Use STRING for cross-dialect UUID compatibility
        primaryKey: true,
        allowNull: false,
      },
      invoiceId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      amount: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
      },
      date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      method: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      reference: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: 'invoice_payments',
      timestamps: true,
    },
  );
  InvoicePayment.associate = (models) => {
    InvoicePayment.belongsTo(models.Invoice, { foreignKey: 'invoiceId', as: 'invoice' });
    InvoicePayment.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
  };
  return InvoicePayment;
};
