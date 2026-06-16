// GoBD/IDEA Audit Export Service
// Exports full transaction journal and audit log in GDPdU/IDEA format.

const JSZip = require('jszip');
const models = require('../models');
const { formatIdeaCsvLine } = require('../utils/gobd/ideaFormatter');
const { generateIndexXml, generateTableDescriptionCsv } = require('../utils/gobd/metaFiles');

/**
 * Resolve the best available transaction-like model.
 * Some project versions may not have a generic Transaction model yet.
 */
function resolveTransactionModel() {
  return models.Transaction || models.BankTransaction || null;
}

/**
 * Build a date range where clause using Sequelize operators when available.
 */
function buildDateWhere(field, fromDate, toDate) {
  const where = {};

  if (!fromDate && !toDate) {
    return where;
  }

  where[field] = {};

  if (fromDate) {
    where[field].$gte = new Date(fromDate);
  }

  if (toDate) {
    where[field].$lte = new Date(toDate);
  }

  return where;
}

/**
 * Generates a GoBD/IDEA-compliant export.
 * Read-only: no DB writes.
 *
 * @param {Object} params
 * @param {string} params.companyId
 * @param {string} params.fromDate
 * @param {string} params.toDate
 * @param {string} params.userId
 * @param {string} params.requestId
 * @returns {Promise<{zipBuffer: Buffer, files: Object}>}
 */
async function generateGobdExport({ companyId, fromDate, toDate, userId, requestId }) {
  const TransactionModel = resolveTransactionModel();
  const { AuditLog } = models;

  if (!TransactionModel) {
    const error = new Error('No transaction model available for GoBD export');
    error.status = 500;
    throw error;
  }

  if (!AuditLog) {
    const error = new Error('AuditLog model is not available for GoBD export');
    error.status = 500;
    throw error;
  }

  const txWhere = {
    companyId,
    ...buildDateWhere('transactionDate', fromDate, toDate),
  };

  const auditWhere = { companyId };

  const transactions = await TransactionModel.findAll({
    where: txWhere,
    order: [['createdAt', 'ASC']],
  });

  const auditLogs = await AuditLog.findAll({
    where: auditWhere,
    order: [['createdAt', 'ASC']],
  });

  const txColumns = [
    'id',
    'transactionDate',
    'bookingDate',
    'valueDate',
    'description',
    'amount',
    'currency',
    'type',
    'category',
    'vatRate',
    'vatAmount',
    'reference',
    'nonDeductible',
    'creditAmount',
    'debitAmount',
    'isReconciled',
    'bankTransactionId',
    'userId',
    'companyId',
    'createdAt',
    'updatedAt',
  ];

  const auditColumns = [
    'id',
    'action',
    'resourceType',
    'resourceId',
    'userId',
    'oldValues',
    'newValues',
    'ipAddress',
    'userAgent',
    'timestamp',
    'reason',
    'companyId',
    'metadata',
    'hash',
    'previousHash',
    'immutable',
    'createdAt',
    'updatedAt',
    'requestId',
  ];

  const txCsv = [
    txColumns.join(';'),
    ...transactions.map((transaction) =>
      formatIdeaCsvLine(transaction.get({ plain: true }), txColumns),
    ),
  ].join('\n');

  const auditCsv = [
    auditColumns.join(';'),
    ...auditLogs.map((auditLog) => formatIdeaCsvLine(auditLog.get({ plain: true }), auditColumns)),
  ].join('\n');

  const tables = [
    {
      name: 'transactions',
      fields: txColumns.map((name) => ({ name, type: 'string', description: name })),
    },
    {
      name: 'audit_logs',
      fields: auditColumns.map((name) => ({ name, type: 'string', description: name })),
    },
  ];

  const indexXml = generateIndexXml({ tables });
  const txDesc = generateTableDescriptionCsv(tables[0]);
  const auditDesc = generateTableDescriptionCsv(tables[1]);

  const zip = new JSZip();
  zip.file('transactions.csv', txCsv);
  zip.file('audit_logs.csv', auditCsv);
  zip.file('index.xml', indexXml);
  zip.file('transactions.meta.csv', txDesc);
  zip.file('audit_logs.meta.csv', auditDesc);
  zip.file(
    'export-metadata.json',
    JSON.stringify(
      {
        companyId,
        userId,
        requestId,
        fromDate,
        toDate,
        generatedAt: new Date().toISOString(),
      },
      null,
      2,
    ),
  );

  const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });

  return {
    zipBuffer,
    files: {
      txCsv,
      auditCsv,
      indexXml,
      txDesc,
      auditDesc,
    },
  };
}

module.exports = {
  generateGobdExport,
};
