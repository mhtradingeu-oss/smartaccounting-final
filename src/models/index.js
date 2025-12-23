'use strict';

const fs = require('fs');
const path = require('path');

// ✅ Node-native resolution (will load index.js automatically)
const { sequelize, Sequelize, DataTypes } = require('../lib/database');

const basename = path.basename(__filename);
const models = {};

// Load all model definers
fs.readdirSync(__dirname)
  .filter((file) => file.indexOf('.') !== 0 && file !== basename && file.slice(-3) === '.js')
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
