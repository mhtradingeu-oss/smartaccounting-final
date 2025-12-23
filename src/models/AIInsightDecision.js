module.exports = (sequelize, DataTypes) => {
  const AIInsightDecision = sequelize.define(
    'AIInsightDecision',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      insightId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'ai_insights', key: 'id' },
      },
      companyId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'companies', key: 'id' },
      },
      actorUserId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
      },
      decision: {
        type: DataTypes.ENUM('accepted', 'rejected', 'overridden'),
        allowNull: false,
      },
      reason: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      indexes: [
        { fields: ['companyId', 'createdAt'] },
        { fields: ['insightId'] },
      ],
      timestamps: true,
      tableName: 'ai_insight_decisions',
    },
  );

  AIInsightDecision.associate = (models) => {
    AIInsightDecision.belongsTo(models.AIInsight, { foreignKey: 'insightId', as: 'insight' });
    AIInsightDecision.belongsTo(models.Company, { foreignKey: 'companyId', as: 'company' });
    AIInsightDecision.belongsTo(models.User, { foreignKey: 'actorUserId', as: 'actor' });
  };

  return AIInsightDecision;
};
