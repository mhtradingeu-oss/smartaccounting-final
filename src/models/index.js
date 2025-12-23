const { sequelize, Sequelize } = require("../lib/database");

const modelDefiners = [
  require("./User"),
  require("./Company"),
  require("./Invoice"),
  require("./InvoiceItem"),
  require("./Expense"),
  require("./FileAttachment"),
  require("./BankStatement"),
  require("./BankTransaction"),
  require("./Transaction"),
  require("./TaxReport"),
  require("./AuditLog"),
  require("./AIInsight"),
  require("./AIInsightDecision"),
  require("./ActiveToken"),
  require("./RevokedToken"),
];

const models = {};

modelDefiners.forEach((defineModel) => {
  const model = defineModel(sequelize, DataTypes);
  models[model.name] = model;
});

Object.values(models).forEach((model) => {
  if (typeof model.associate === "function") {
    model.associate(models);
  }
});

module.exports = {
  sequelize,
  ...models,
};
