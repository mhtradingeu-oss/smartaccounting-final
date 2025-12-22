module.exports = (sequelize, DataTypes) => {
  const RevokedToken = sequelize.define(
    'RevokedToken',
    {
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
      tableName: 'revoked_tokens',
      timestamps: true,
      updatedAt: false,
    },
  );

  return RevokedToken;
};
