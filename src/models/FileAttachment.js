module.exports = (sequelize, DataTypes) => {
  const FileAttachment = sequelize.define(
    'FileAttachment',
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },

      fileName: {
        type: DataTypes.STRING,
        allowNull: false,
        field: 'file_name',
      },

      fileType: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'file_type',
      },

      url: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      attachedToType: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'attached_to_type',
      },

      attachedToId: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'attached_to_id',
      },

      userId: {
        type: DataTypes.INTEGER,
        field: 'user_id',
      },

      companyId: {
        type: DataTypes.INTEGER,
        field: 'company_id',
      },

      invoiceId: {
        type: DataTypes.INTEGER,
        field: 'invoice_id',
      },

      expenseId: {
        type: DataTypes.INTEGER,
        field: 'expense_id',
      },
    },
    {
      tableName: 'file_attachments',
      timestamps: true,
      underscored: true,
    },
  );

  FileAttachment.associate = (models) => {
    FileAttachment.belongsTo(models.Company, { foreignKey: 'companyId' });
    FileAttachment.belongsTo(models.User, { foreignKey: 'userId' });
    FileAttachment.belongsTo(models.Invoice, { foreignKey: 'invoiceId' });
    FileAttachment.belongsTo(models.Expense, { foreignKey: 'expenseId' });
  };

  return FileAttachment;
};
