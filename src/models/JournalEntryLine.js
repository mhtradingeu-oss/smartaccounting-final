const { v4: uuidv4 } = require('uuid');

module.exports = (sequelize, DataTypes) => {
  const JournalEntryLine = sequelize.define(
    'JournalEntryLine',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: uuidv4,
        primaryKey: true,
      },
      journalEntryId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      companyId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      accountId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      debit: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
      },
      credit: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
      },
      currency: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'EUR',
      },
      taxCode: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      vatRate: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
      },
      counterpartyName: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      metadata: {
        type: DataTypes.JSON,
        allowNull: true,
      },
    },
    {
      tableName: 'journal_entry_lines',
      timestamps: true,
    },
  );

  JournalEntryLine.associate = (models) => {
    JournalEntryLine.belongsTo(models.Company, { foreignKey: 'companyId' });
    JournalEntryLine.belongsTo(models.JournalEntry, {
      foreignKey: 'journalEntryId',
      as: 'journalEntry',
    });
    JournalEntryLine.belongsTo(models.ChartAccount, {
      foreignKey: 'accountId',
      as: 'account',
    });
  };

  return JournalEntryLine;
};
