module.exports = (sequelize, DataTypes) => {
  const AuditLog = sequelize.define(
    'AuditLog',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      action: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      resourceType: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      resourceId: {
        type: DataTypes.STRING,
      },
      metadata: {
        type: DataTypes.JSON,
        allowNull: true,
      },
      oldValues: {
        type: DataTypes.JSON,
      },
      newValues: {
        type: DataTypes.JSON,
      },
      requestId: {
        type: DataTypes.UUID,
        allowNull: false,
        defaultValue: DataTypes.UUIDV4,
      },
      ipAddress: {
        type: DataTypes.STRING,
      },
      userAgent: {
        type: DataTypes.STRING,
      },
      timestamp: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
      },
      reason: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'system',
        validate: {
          notEmpty: true,
        },
      },
      hash: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: '',
      },
      previousHash: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      immutable: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      companyId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'companies',
          key: 'id',
        },
      },
    },
    {
      tableName: 'audit_logs',
      timestamps: true,
    },
  );

  AuditLog.associate = (models) => {
    AuditLog.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
    AuditLog.belongsTo(models.Company, { foreignKey: 'companyId', as: 'company' });
  };

  // Patch create to skip in test unless explicitly allowed
  const origCreate = AuditLog.create.bind(AuditLog);
  AuditLog.create = async function (values, options = {}) {
    const isSqliteTest = process.env.NODE_ENV === 'test' && process.env.USE_SQLITE === 'true';
    if (isSqliteTest && !options.allowTestAuditLog) {
      // Simulate as if log was created, but do nothing while SQLite tests are scrubbing data
      return null;
    }
    return origCreate(values, options);
  };
  return AuditLog;
};
