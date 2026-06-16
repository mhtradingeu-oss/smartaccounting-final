// Example usage and test for VAT engine, cross-check, and export

const { aggregateVAT } = require('./vatAggregator');
const { crossCheckVAT } = require('./vatCrossCheck');
const { exportVatReturnCSV, exportVatReturnJSON } = require('./vatExport');
const { lockPeriod, isPeriodLocked } = require('./periodLock');

async function runVatDemo(companyId, periodFrom, periodTo, journalTotals, datevTotals) {
  // Lock the period
  lockPeriod(companyId, `${periodFrom}_${periodTo}`);
  if (!isPeriodLocked(companyId, `${periodFrom}_${periodTo}`)) {
    throw new Error('Period not locked!');
  }

  // Aggregate VAT
  const vatData = await aggregateVAT({ companyId, periodFrom, periodTo });

  // Cross-check
  const crossCheck = await crossCheckVAT({
    vatTotals: vatData.totals,
    journalTotals,
    datevTotals,
  });

  // Export
  const csv = exportVatReturnCSV({
    ...vatData,
    period: `${periodFrom}_${periodTo}`,
    companyId,
  });
  const json = exportVatReturnJSON({
    ...vatData,
    period: `${periodFrom}_${periodTo}`,
    companyId,
  });

  return {
    vatData,
    crossCheck,
    csv,
    json,
  };
}

module.exports = { runVatDemo };
