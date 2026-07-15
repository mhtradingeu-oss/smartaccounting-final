'use strict';

const {
  SKR03_BWA_01_V1,
} = require('./bwaDefinitions');

const {
  buildBwaReport,
} = require('./bwaEngine');

const {
  loadPostedLedgerForBwa,
} = require('./bwaLedgerAdapter');

const DEFAULT_DEFINITION_ID =
  SKR03_BWA_01_V1.id;

const ERROR_CODES = Object.freeze({
  DEFINITION_REQUIRED:
    'BWA_REPORT_DEFINITION_REQUIRED',
  DEFINITION_NOT_FOUND:
    'BWA_REPORT_DEFINITION_NOT_FOUND',
  INVALID_LEDGER_RESULT:
    'BWA_REPORT_INVALID_LEDGER_RESULT',
  INVALID_REPORT_RESULT:
    'BWA_REPORT_INVALID_REPORT_RESULT',
});

function createReportError(
  code,
  message,
  status = 400,
) {
  const error = new Error(message);
  error.code = code;
  error.status = status;
  error.statusCode = status;
  return error;
}

function createDefinitionRegistry(
  definitions = [SKR03_BWA_01_V1],
) {
  const registry = new Map();

  for (const definition of definitions) {
    if (!definition?.id) {
      throw createReportError(
        ERROR_CODES.DEFINITION_REQUIRED,
        'Every BWA definition requires an id.',
        500,
      );
    }

    if (registry.has(definition.id)) {
      throw createReportError(
        ERROR_CODES.DEFINITION_REQUIRED,
        `Duplicate BWA definition id: ${definition.id}`,
        500,
      );
    }

    registry.set(definition.id, definition);
  }

  return registry;
}

function resolveDefinition({
  definitionId = DEFAULT_DEFINITION_ID,
  registry,
}) {
  const definition = registry.get(definitionId);

  if (!definition) {
    throw createReportError(
      ERROR_CODES.DEFINITION_NOT_FOUND,
      `Unsupported BWA definition: ${definitionId}`,
      400,
    );
  }

  return definition;
}

function validateLedgerResult(result) {
  if (
    !result ||
    typeof result !== 'object' ||
    !result.period ||
    !Array.isArray(result.accounts) ||
    !Array.isArray(result.evidence)
  ) {
    throw createReportError(
      ERROR_CODES.INVALID_LEDGER_RESULT,
      'BWA ledger adapter returned an invalid result.',
      500,
    );
  }

  return result;
}

function validateReportResult(result) {
  if (
    !result ||
    typeof result !== 'object' ||
    !result.definition ||
    !Array.isArray(result.months) ||
    !Array.isArray(result.rows) ||
    !Array.isArray(result.unmappedAccounts) ||
    !Array.isArray(result.warnings)
  ) {
    throw createReportError(
      ERROR_CODES.INVALID_REPORT_RESULT,
      'BWA engine returned an invalid report result.',
      500,
    );
  }

  return result;
}

const createBwaReportService = ({
  definitions = [SKR03_BWA_01_V1],
  ledgerLoader = loadPostedLedgerForBwa,
  reportBuilder = buildBwaReport,
  now = () => new Date(),
} = {}) => {
  const registry = createDefinitionRegistry(
    definitions,
  );

  const getBwaReport = async ({
    companyId,
    year,
    toMonth,
    definitionId = DEFAULT_DEFINITION_ID,
  } = {}) => {
    const definition = resolveDefinition({
      definitionId,
      registry,
    });

    const ledgerResult = validateLedgerResult(
      await ledgerLoader({
        companyId,
        year,
        toMonth,
      }),
    );

    const reportResult = validateReportResult(
      reportBuilder({
        definition,
        accounts: ledgerResult.accounts,
        months: ledgerResult.period.months,
      }),
    );

    return {
      companyId,
      definition: reportResult.definition,
      period: ledgerResult.period,
      preliminary:
        reportResult.preliminary === true,
      months: reportResult.months,
      rows: reportResult.rows,
      unmappedAccounts:
        reportResult.unmappedAccounts,
      warnings: reportResult.warnings,
      evidence: ledgerResult.evidence,
      generatedAt: now().toISOString(),
    };
  };

  return {
    getBwaReport,
  };
};

const defaultService =
  createBwaReportService();

module.exports = {
  DEFAULT_DEFINITION_ID,
  ERROR_CODES,
  createReportError,
  createDefinitionRegistry,
  resolveDefinition,
  validateLedgerResult,
  validateReportResult,
  createBwaReportService,
  getBwaReport:
    defaultService.getBwaReport,
};
