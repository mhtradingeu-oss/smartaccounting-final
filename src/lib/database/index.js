'use strict';

const { Sequelize, DataTypes } = require('sequelize');
const { getSequelize } = require('../../config/database');

const sequelize = getSequelize();

module.exports = {
  sequelize,
  Sequelize,
  DataTypes,
};
