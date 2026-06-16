// VAT Export Formats: CSV and JSON
// Usage: exportVatReturnCSV(data), exportVatReturnJSON(data)

const { parse } = require('json2csv');

function exportVatReturnCSV({ totals, breakdown, period, companyId }) {
  // Advisor-ready CSV: output and input VAT per rate
  const rows = [];
  Object.keys(totals.outputVAT).forEach((rate) => {
    rows.push({
      type: 'outputVAT',
      rate,
      amount: totals.outputVAT[rate],
      period,
      companyId,
    });
  });
  Object.keys(totals.inputVAT).forEach((rate) => {
    rows.push({
      type: 'inputVAT',
      rate,
      amount: totals.inputVAT[rate],
      period,
      companyId,
    });
  });
  // Add breakdown rows if needed
  breakdown.forEach((item) => {
    rows.push({
      type: item.type,
      id: item.id,
      rate: item.rate,
      vat: item.vat,
      period,
      companyId,
    });
  });
  return parse(rows);
}

function exportVatReturnJSON({ totals, breakdown, period, companyId }) {
  // Future ELSTER API format
  return JSON.stringify(
    {
      companyId,
      period,
      totals,
      breakdown,
      generatedAt: new Date().toISOString(),
    },
    null,
    2,
  );
}

module.exports = {
  exportVatReturnCSV,
  exportVatReturnJSON,
};
