const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const AIInsight = sequelize.define('AIInsight', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    companyId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'companies', key: 'id' },
    },
    entityType: {
      type: DataTypes.ENUM('invoice', 'expense', 'bankTransaction', 'taxReport', 'user'),
      allowNull: false,
    },
    entityId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    type: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    severity: {
      type: DataTypes.ENUM('low', 'medium', 'high'),
      allowNull: false,
    },
    confidenceScore: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    summary: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    why: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    legalContext: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    evidence: {
      type: DataTypes.JSONB,
      allowNull: false,
    },
    ruleId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    modelVersion: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    featureFlag: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    disclaimer: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  }, {
    indexes: [
      { fields: ['companyId', 'createdAt'] },
      { fields: ['companyId', 'type'] },
      { fields: ['entityId'] },
    ],
    timestamps: true,
    tableName: 'ai_insights',
  });

  AIInsight.associate = (models) => {
    AIInsight.hasMany(models.AIInsightDecision, { foreignKey: 'insightId', as: 'decisions' });
    AIInsight.belongsTo(models.Company, { foreignKey: 'companyId', as: 'company' });
  };

  return AIInsight;
};
