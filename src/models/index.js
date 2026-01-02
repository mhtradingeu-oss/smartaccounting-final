'use strict';

const fs = require('fs');
const path = require('path');

const { getSequelize } = require('../config/database');
const sequelize = getSequelize();
const { Sequelize, DataTypes } = require('sequelize');
console.log('[Sequelize Instance] models/index.js', sequelize);

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
