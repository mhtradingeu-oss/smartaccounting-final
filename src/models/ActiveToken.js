module.exports = (sequelize, DataTypes) => {
  const ActiveToken = sequelize.define(
    'ActiveToken',
    {
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      jti: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      expiresAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      tableName: 'active_tokens',
      timestamps: true,
      updatedAt: false,
    },
  );

  return ActiveToken;
};
