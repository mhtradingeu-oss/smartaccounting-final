module.exports = (sequelize, DataTypes) => {
  const AIApprovalQueueItem = sequelize.define(
    'AIApprovalQueueItem',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      approvalId: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      schemaVersion: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'ai_approval_queue.v1',
      },
      companyId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'companies', key: 'id' },
      },
      requestedByUserId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
      },
      decidedByUserId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
      },
      status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'pending',
      },
      decision: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      toolId: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      riskLevel: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      executionMode: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      requiresApproval: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      blocked: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      requestedBy: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      approvalReason: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      decisionReason: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      actionProposal: {
        type: DataTypes.JSON,
        allowNull: false,
      },
      metadata: {
        type: DataTypes.JSON,
        allowNull: true,
      },
      expiresAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      decidedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      auditRequired: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
    },
    {
      tableName: 'ai_approval_queue_items',
      timestamps: true,
      indexes: [
        { fields: ['companyId', 'status'] },
        { fields: ['companyId', 'createdAt'] },
        { unique: true, fields: ['approvalId'] },
      ],
    },
  );

  AIApprovalQueueItem.associate = (models) => {
    if (models?.Company && !AIApprovalQueueItem.associations?.company) {
      AIApprovalQueueItem.belongsTo(models.Company, {
        foreignKey: 'companyId',
        as: 'company',
      });
    }

    if (models?.User && !AIApprovalQueueItem.associations?.requestedByUser) {
      AIApprovalQueueItem.belongsTo(models.User, {
        foreignKey: 'requestedByUserId',
        as: 'requestedByUser',
      });
    }

    if (models?.User && !AIApprovalQueueItem.associations?.decidedByUser) {
      AIApprovalQueueItem.belongsTo(models.User, {
        foreignKey: 'decidedByUserId',
        as: 'decidedByUser',
      });
    }
  };

  return AIApprovalQueueItem;
};
