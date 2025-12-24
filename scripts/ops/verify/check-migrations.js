#!/usr/bin/env node
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { QueryTypes } = require('sequelize');
const models = require('../../../src/models');

const { sequelize } = models;

const migrationsDir = path.resolve(__dirname, '../../../database/migrations');
const CRITICAL_MODEL_NAMES = new Set([
  'Company',
  'User',
  'Invoice',
  'Expense',
  'BankStatement',
  'BankTransaction',
  'Transaction',
  'TaxReport',
  'AuditLog',
  'FileAttachment',
  'ActiveToken',
  'RevokedToken',
]);

const readMigrationFiles = () =>
  fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.js'))
    .sort();

const buildColumnReport = (modelName, tableName, missingColumns) =>
  `Model ${modelName} (${tableName}) missing columns: ${missingColumns.join(', ')}`;

const main = async () => {
  try {
    await sequelize.authenticate();
    const migrationFiles = readMigrationFiles();
    const queryInterface = sequelize.getQueryInterface();
    const quoteTable =
      queryInterface.queryGenerator && typeof queryInterface.queryGenerator.quoteTable === 'function'
        ? queryInterface.queryGenerator.quoteTable('SequelizeMeta')
        : 'SequelizeMeta';
    const appliedRows = await sequelize.query(`SELECT name FROM ${quoteTable} ORDER BY name ASC`, {
      type: QueryTypes.SELECT,
    });

    const appliedNames = appliedRows.map((row) => row.name);
    const pending = migrationFiles.filter((file) => !appliedNames.includes(file));
    const orphaned = appliedNames.filter((name) => !migrationFiles.includes(name));

    if (pending.length) {
      console.error('Pending migrations detected:', pending);
      process.exitCode = 2;
    }

    if (orphaned.length) {
      console.warn('Applied migrations without matching source file:', orphaned);
    }

    const mismatches = [];
    const modelsToCheck = Object.values(models).filter(
      (model) => model && typeof model.getTableName === 'function' && CRITICAL_MODEL_NAMES.has(model.name),
    );

    for (const model of modelsToCheck) {
      const tableName = model.getTableName();
      try {
        const described = await queryInterface.describeTable(tableName);
        const availableColumns = Object.keys(described);
        const expectedColumns = Object.values(model.rawAttributes).map((attribute) => attribute.field || attribute.fieldName);
        const missingColumns = expectedColumns.filter(
          (column) => column && !availableColumns.includes(column),
        );
        if (missingColumns.length) {
          mismatches.push(buildColumnReport(model.name, tableName, missingColumns));
        }
      } catch (error) {
        mismatches.push(`Table ${tableName} (model ${model.name}) is missing: ${error.message}`);
      }
    }

    if (mismatches.length) {
      console.error('Schema mismatch detected:', mismatches);
      process.exitCode = 2;
    }

    if (!process.exitCode) {
      console.log('All migrations applied and schema matches models.');
    }
  } catch (error) {
    console.error('Migration verification failed:', error.message);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
};

main();
