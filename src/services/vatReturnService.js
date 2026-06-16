/**
 * VAT Return Preparation Service (ELSTER / UStVA)
 * READ-ONLY – NO DATA MODIFICATION
 */
const { aggregateVAT } = require('../utils/vat/vatAggregator');
const { crossCheckVAT } = require('../utils/vat/vatCrossCheck');

async function prepareVatReturn({ companyId, periodFrom, periodTo }) {
  const aggregation = await aggregateVAT({ companyId, periodFrom, periodTo });

  const crossCheck = await crossCheckVAT({
    companyId,
    periodFrom,
    periodTo,
    vatTotals: aggregation.totals,
  });

  return {
    meta: {
      companyId,
      periodFrom,
      periodTo,
      generatedAt: new Date().toISOString(),
    },
    totals: aggregation.totals,
    breakdown: aggregation.breakdown,
    crossCheck,
  };
}

module.exports = { prepareVatReturn };
