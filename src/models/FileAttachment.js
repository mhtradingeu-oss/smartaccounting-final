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
        field: 'file_size',
      },
      mimeType: {
        type: DataTypes.STRING,
        field: 'mime_type',
      },
      fileHash: {
        type: DataTypes.STRING,
        field: 'file_hash',
      },
      documentType: {
        type: DataTypes.STRING,
        field: 'document_type',
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
        allowNull: false,
        field: 'uploaded_by',
      },
      ocrText: {
        type: DataTypes.TEXT,
        field: 'ocr_text',
      },
      ocrConfidence: {
        type: DataTypes.FLOAT,
        field: 'ocr_confidence',
      },
      extractedData: {
        type: DataTypes.JSON,
        field: 'extracted_data',
      },
      processingStatus: {
        type: DataTypes.STRING,
        field: 'processing_status',
      },
      archived: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      retentionPeriod: {
        type: DataTypes.INTEGER,
        field: 'retention_period',
        defaultValue: 10,
      },
      expenseId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'expense_id',
      },
      invoiceId: {
        type: DataTypes.INTEGER,
        allowNull: true,
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
    FileAttachment.belongsTo(models.User, {
      foreignKey: 'uploadedBy',
      as: 'uploader',
    });
    FileAttachment.belongsTo(models.Company, {
      foreignKey: 'companyId',
      as: 'company',
    });
    FileAttachment.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user',
    });
    FileAttachment.belongsTo(models.Expense, {
      foreignKey: 'expenseId',
      as: 'expense',
    });
    FileAttachment.belongsTo(models.Invoice, {
      foreignKey: 'invoiceId',
      as: 'invoice',
    });
  };

  return FileAttachment;
};
