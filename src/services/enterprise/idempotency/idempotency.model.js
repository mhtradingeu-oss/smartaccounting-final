module.exports = (sequelize, DataTypes) => {
  const Idempotency = sequelize.define('Idempotency', {

    key: {
      type: DataTypes.STRING,
      primaryKey: true,
    },

    scope: {
      type: DataTypes.STRING, // e.g. "approval_execution"
      allowNull: false,
    },

    requestHash: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    result: {
      type: DataTypes.JSONB,
      allowNull: true,
    },

    status: {
      type: DataTypes.STRING,
      defaultValue: 'processing', // processing | done | failed
    },

    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },

  }, {
    tableName: 'idempotency_keys',
    timestamps: false,
    indexes: [
      { fields: ['scope'] },
    ],
  });

  return Idempotency;
};
