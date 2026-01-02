module.exports = (sequelize, DataTypes) => {
  const ActiveToken = sequelize.define(
    'ActiveToken',
    {
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      jti: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: true,
      },
      expiresAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
    },
    {
      tableName: 'active_tokens',
      timestamps: true,
    },
  );

  ActiveToken.associate = (models) => {
    const target = models?.User;
    if (
      target &&
      target.sequelize === ActiveToken.sequelize &&
      !ActiveToken.associations?.user
    ) {
      ActiveToken.belongsTo(target, { foreignKey: 'userId', as: 'user' });
    }
  };

  return ActiveToken;
};
