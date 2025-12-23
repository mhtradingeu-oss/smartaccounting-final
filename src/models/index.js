'use strict';

const fs = require('fs');
const path = require('path');

// ✅ Explicit absolute path – resolver safe for Jest & CI
const databasePath = path.join(__dirname, '../lib/database/index.js');
const { sequelize, Sequelize, DataTypes } = require(databasePath);

const basename = path.basename(__filename);
const models = {};

// Load all model definers
fs.readdirSync(__dirname)
  .filter((file) => {
    return file.indexOf('.') !== 0 && file !== basename && file.slice(-3) === '.js';
  })
  .forEach((file) => {
    const defineModel = require(path.join(__dirname, file));
    const model = defineModel(sequelize, DataTypes);
    models[model.name] = model;
  });

// Run associations if defined
Object.values(models).forEach((model) => {
  if (typeof model.associate === 'function') {
    model.associate(models);
  }
});

models.sequelize = sequelize;
models.Sequelize = Sequelize;

module.exports = models;
