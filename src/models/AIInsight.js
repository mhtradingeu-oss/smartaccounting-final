'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class AIInsight extends Model {
    static associate(models) {
      const decisionsModel = models?.AIInsightDecision;
      if (
        decisionsModel &&
        decisionsModel.sequelize === this.sequelize &&
        !this.associations?.decisions
      ) {
        this.hasMany(decisionsModel, {
          foreignKey: 'insightId',
          as: 'decisions',
        });
      }
    }
  }

  AIInsight.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      companyId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      entityType: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      entityId: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      type: DataTypes.STRING,
      severity: DataTypes.STRING,
      confidenceScore: DataTypes.FLOAT,
      summary: DataTypes.TEXT,
      why: DataTypes.TEXT,
      legalContext: DataTypes.TEXT,
      evidence: sequelize.getDialect() === 'postgres' ? DataTypes.JSONB : DataTypes.JSON,
      ruleId: DataTypes.STRING,
      modelVersion: DataTypes.STRING,
      featureFlag: DataTypes.STRING,
      disclaimer: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: 'AIInsight',
      tableName: 'ai_insights',
      timestamps: true,
    },
  );

  return AIInsight;
};
