'use strict';

const { QueryTypes } = require('sequelize');

const UUID_TABLES = [
  { table: 'audit_logs', column: 'id' },
  { table: 'ai_insights', column: 'id' },
  { table: 'ai_insight_decisions', column: 'id' },
  { table: 'bank_statement_import_dry_runs', column: 'id' },
  { table: 'invoice_items', column: 'id' },
  { table: 'file_attachments', column: 'id' },
];

const TIMESTAMP_TABLES = [
  { table: 'audit_logs', created: 'createdAt', updated: 'updatedAt' },
  { table: 'ai_insights', created: 'createdAt', updated: 'updatedAt' },
  { table: 'ai_insight_decisions', created: 'createdAt', updated: 'updatedAt' },
  { table: 'bank_statement_import_dry_runs', created: 'createdAt', updated: 'updatedAt' },
  { table: 'invoice_items', created: 'createdAt', updated: 'updatedAt' },
  { table: 'file_attachments', created: 'created_at', updated: 'updated_at' },
];

const JSON_SPECS = [
  {
    table: 'ai_insights',
    column: 'evidence',
    trigger: 'ai_insights_evidence_json_check',
    message: 'ai_insights.evidence must be valid JSON',
  },
  {
    table: 'bank_statement_import_dry_runs',
    column: 'summary',
    trigger: 'bank_statement_import_dry_runs_summary_json_check',
    message: 'bank_statement_import_dry_runs.summary must be valid JSON',
  },
  {
    table: 'file_attachments',
    column: 'extracted_data',
    trigger: 'file_attachments_extracted_data_json_check',
    message: 'file_attachments.extracted_data must be valid JSON',
  },
  {
    table: 'audit_logs',
    column: 'oldValues',
    trigger: 'audit_logs_oldValues_json_check',
    message: 'audit_logs.oldValues must be valid JSON',
  },
  {
    table: 'audit_logs',
    column: 'newValues',
    trigger: 'audit_logs_newValues_json_check',
    message: 'audit_logs.newValues must be valid JSON',
  },
];

const buildUuidTriggerName = (table, column) => `${table}_${column}_uuid_default`;
const buildTimestampTriggerName = (table) => `${table}_auto_timestamps`;

const createUuidTrigger = async (queryInterface, table, column) => {
  const triggerName = buildUuidTriggerName(table, column);
  await queryInterface.sequelize.query(`
    CREATE TRIGGER IF NOT EXISTS "${triggerName}"
    AFTER INSERT ON "${table}"
    WHEN NEW."${column}" IS NULL OR NEW."${column}" = ''
    BEGIN
      UPDATE "${table}"
      SET "${column}" = LOWER(HEX(RANDOMBLOB(16)))
      WHERE rowid = NEW.rowid;
    END;
  `);
};

const createTimestampTrigger = async (queryInterface, table, created, updated) => {
  const triggerName = buildTimestampTriggerName(table);
  await queryInterface.sequelize.query(`
    CREATE TRIGGER IF NOT EXISTS "${triggerName}"
    AFTER INSERT ON "${table}"
    BEGIN
      UPDATE "${table}"
      SET "${created}" = COALESCE(NEW."${created}", CURRENT_TIMESTAMP),
          "${updated}" = COALESCE(NEW."${updated}", CURRENT_TIMESTAMP)
      WHERE rowid = NEW.rowid;
    END;
  `);
};

const createJsonValidationTrigger = async (queryInterface, spec) => {
  await queryInterface.sequelize.query(`
    CREATE TRIGGER IF NOT EXISTS "${spec.trigger}"
    BEFORE INSERT OR UPDATE ON "${spec.table}"
    WHEN NEW."${spec.column}" IS NOT NULL
    BEGIN
      SELECT
        CASE WHEN json_valid(NEW."${spec.column}") = 0
          THEN RAISE(ABORT, '${spec.message}')
        END;
    END;
  `);
};

const dropTrigger = async (queryInterface, name) => {
  await queryInterface.sequelize.query(`DROP TRIGGER IF EXISTS "${name}";`);
};

const hasJson1Extension = async (queryInterface) => {
  const [result] = await queryInterface.sequelize.query(
    "SELECT 1 AS has_json1 FROM pragma_compile_options WHERE compile_options = 'ENABLE_JSON1' LIMIT 1;",
    { type: QueryTypes.SELECT },
  );
  return Boolean(result && result.has_json1);
};

module.exports = {
  async up(queryInterface) {
    if (queryInterface.sequelize.getDialect() !== 'sqlite') {
      return;
    }

    for (const spec of UUID_TABLES) {
      await createUuidTrigger(queryInterface, spec.table, spec.column);
    }

    for (const spec of TIMESTAMP_TABLES) {
      await createTimestampTrigger(queryInterface, spec.table, spec.created, spec.updated);
    }

    const json1 = await hasJson1Extension(queryInterface);
    if (json1) {
      for (const spec of JSON_SPECS) {
        await createJsonValidationTrigger(queryInterface, spec);
      }
    }
  },

  async down(queryInterface) {
    if (queryInterface.sequelize.getDialect() !== 'sqlite') {
      return;
    }

    for (const spec of JSON_SPECS) {
      await dropTrigger(queryInterface, spec.trigger);
    }

    for (const spec of UUID_TABLES) {
      await dropTrigger(queryInterface, buildUuidTriggerName(spec.table, spec.column));
    }

    for (const spec of TIMESTAMP_TABLES) {
      await dropTrigger(queryInterface, buildTimestampTriggerName(spec.table));
    }
  },
};
