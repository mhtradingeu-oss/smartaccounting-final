const { sequelize, Sequelize } = require('../lib/database');
const defineUser = require('./User');
const defineCompany = require('./Company');
const defineInvoice = require('./Invoice');
const defineTransaction = require('./Transaction');
const defineTaxReport = require('./TaxReport');
const defineBankStatement = require('./BankStatement');
const defineBankTransaction = require('./BankTransaction');

const defineInvoiceItem = require('./InvoiceItem');
const defineExpense = require('./Expense');
const defineAuditLog = require('./AuditLog');
const defineFileAttachment = require('./FileAttachment');
const defineAIInsight = require('./AIInsight');
const defineAIInsightDecision = require('./AIInsightDecision');
const defineRevokedToken = require('./RevokedToken');
const defineActiveToken = require('./ActiveToken');

const User = defineUser(sequelize);
const Company = defineCompany(sequelize);
const Invoice = defineInvoice(sequelize);
const Transaction = defineTransaction(sequelize, Sequelize.DataTypes);
const TaxReport = defineTaxReport(sequelize, Sequelize.DataTypes);
const BankStatement = defineBankStatement(sequelize, Sequelize.DataTypes);
const BankTransaction = defineBankTransaction(sequelize, Sequelize.DataTypes);


const InvoiceItem = defineInvoiceItem(sequelize);
const Expense = defineExpense(sequelize);
const AuditLog = defineAuditLog(sequelize, Sequelize.DataTypes);
const FileAttachment = defineFileAttachment(sequelize, Sequelize.DataTypes);
const AIInsight = defineAIInsight(sequelize);
const AIInsightDecision = defineAIInsightDecision(sequelize);
const RevokedToken = defineRevokedToken(sequelize, Sequelize.DataTypes);
const ActiveToken = defineActiveToken(sequelize, Sequelize.DataTypes);


const models = {
  User,
  Company,
  Invoice,
  InvoiceItem,
  Expense,
  Transaction,
  TaxReport,
  BankStatement,
  BankTransaction,
  AuditLog,
  FileAttachment,
  AIInsight,
  AIInsightDecision,
  RevokedToken,
  ActiveToken,
};

Object.values(models).forEach((model) => {
  if (typeof model.associate === 'function') {
    model.associate(models);
  }
});

module.exports = {
  sequelize,
  Sequelize,
  ...models,
};
