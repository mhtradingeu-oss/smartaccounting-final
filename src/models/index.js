'use strict';

const fs = require('fs');
const path = require('path');
const { sequelize, Sequelize } = require('../lib/database');

const basename = path.basename(__filename);
const models = {};

// Load all model definers
fs.readdirSync(__dirname)
  .filter((file) => {
    return file.indexOf('.') !== 0 && file !== basename && file.slice(-3) === '.js';
  })
  .forEach((file) => {
    const defineModel = require(path.join(__dirname, file));
    const model = defineModel(sequelize, Sequelize.DataTypes);
    models[model.name] = model;
  });

// Run associations if defined
Object.keys(models).forEach((modelName) => {
  if (typeof models[modelName].associate === 'function') {
    models[modelName].associate(models);
  }
});

models.sequelize = sequelize;
models.Sequelize = Sequelize;

module.exports = models;
