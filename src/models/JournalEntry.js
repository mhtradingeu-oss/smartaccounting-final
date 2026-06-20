const { v4: uuidv4 } = require('uuid');

module.exports = (sequelize, DataTypes) => {
  const JournalEntry = sequelize.define(
    'JournalEntry',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: uuidv4,
        primaryKey: true,
      },
      companyId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      entryDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      sourceType: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      sourceId: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'draft',
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      currency: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'EUR',
      },
      createdBy: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      postedBy: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      postedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      reversedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      reversalOfId: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      metadata: {
        type: DataTypes.JSON,
        allowNull: true,
      },
    },
    {
      tableName: 'journal_entries',
      timestamps: true,
    },
  );

  JournalEntry.associate = (models) => {
    JournalEntry.belongsTo(models.Company, { foreignKey: 'companyId' });
    JournalEntry.belongsTo(models.User, { foreignKey: 'createdBy', as: 'creator' });
    JournalEntry.belongsTo(models.User, { foreignKey: 'postedBy', as: 'poster' });
    JournalEntry.belongsTo(models.JournalEntry, {
      foreignKey: 'reversalOfId',
      as: 'reversalOf',
    });
    JournalEntry.hasMany(models.JournalEntryLine, {
      foreignKey: 'journalEntryId',
      as: 'lines',
    });
  };

  return JournalEntry;
};
