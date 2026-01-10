module.exports = (sequelize, DataTypes) => {
  const FileAttachment = sequelize.define(
    'FileAttachment',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      fileName: {
        type: DataTypes.STRING,
        allowNull: false,
        field: 'file_name',
      },
      originalName: {
        type: DataTypes.STRING,
        allowNull: false,
        field: 'original_name',
      },
      filePath: {
        type: DataTypes.STRING,
        allowNull: false,
        field: 'file_path',
      },
      fileSize: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'file_size',
      },
      mimeType: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'mime_type',
      },
      fileHash: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'file_hash',
      },
      documentType: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'document_type',
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
      uploadedBy: {
        type: DataTypes.INTEGER,
        field: 'uploaded_by',
      },
      ocrText: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'ocr_text',
      },
      ocrConfidence: {
        type: DataTypes.FLOAT,
        allowNull: true,
        field: 'ocr_confidence',
      },
      extractedData: {
        type: DataTypes.JSON,
        allowNull: true,
        field: 'extracted_data',
      },
      processingStatus: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'processing_status',
      },
      archived: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      retentionPeriod: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 10,
        field: 'retention_period',
      },
      expenseId: {
        type: DataTypes.UUID,
        field: 'expense_id',
      },
      invoiceId: {
        type: DataTypes.INTEGER,
        field: 'invoice_id',
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
