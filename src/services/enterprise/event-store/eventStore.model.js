/**
 * ENTERPRISE EVENT STORE MODEL (POSTGRES / SEQUELIZE)
 * Append-only financial event log
 */

module.exports = (sequelize, DataTypes) => {
  const EventStore = sequelize.define('EventStore', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },

    eventType: {
      type: DataTypes.STRING,
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

    companyId: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    userId: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    payload: {
      type: DataTypes.JSONB,
      allowNull: true,
    },

    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
    },

    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  }, {
    tableName: 'event_store',
    timestamps: false,
    indexes: [
      { fields: ['entityType', 'entityId'] },
      { fields: ['companyId'] },
      { fields: ['eventType'] },
    ],
  });

  return EventStore;
};
