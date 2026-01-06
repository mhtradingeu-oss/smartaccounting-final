'use strict';

const fs = require('fs');
const path = require('path');

// 🔐 Single source of truth for Sequelize
// ⚠️ DO NOT require("sequelize") directly anywhere else
const { sequelize, Sequelize, DataTypes } = require('../lib/database');

const basename = path.basename(__filename);
const models = {};

// 📦 Load all model definitions
fs.readdirSync(__dirname)
  .filter((file) => {
    return file.indexOf('.') !== 0 && file !== basename && file.slice(-3) === '.js';
  })
  .forEach((file) => {
    const defineModel = require(path.join(__dirname, file));

    if (typeof defineModel !== 'function') {
      throw new Error(`Model file ${file} does not export a function`);
    }

    const model = defineModel(sequelize, DataTypes);

    if (!model || !model.name) {
      throw new Error(`Invalid model definition in file ${file}`);
    }

    // Safety: Accept:
    // - class extends Model (model.prototype instanceof Sequelize.Model)
    // - sequelize.define (typeof model === 'function' && Object.getPrototypeOf(model).name === 'Model')
    // - instance of Model (rare)
    const isSequelizeModel =
      (model && model.prototype && model.prototype instanceof Sequelize.Model) ||
      (typeof model === 'function' && Object.getPrototypeOf(model).name === 'Model') ||
      model instanceof Sequelize.Model;
    if (!isSequelizeModel) {
      throw new Error(`Model in file ${file} is not a valid Sequelize Model`);
    }

    models[model.name] = model;
  });

// 🔗 Run associations AFTER all models are loaded
Object.values(models).forEach((model) => {
  if (typeof model.associate === 'function') {
    model.associate(models);
  }
});

// 🧠 Expose Sequelize helpers
models.sequelize = sequelize;
models.Sequelize = Sequelize;

module.exports = models;
