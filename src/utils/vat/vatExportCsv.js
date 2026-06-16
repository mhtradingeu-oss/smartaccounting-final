function exportVatCsv(vatReturn) {
  return `Type,Rate,Amount\nOutput VAT,19,${vatReturn.totals.outputVAT['19']}\nInput VAT,19,${vatReturn.totals.inputVAT['19']}\n`;
}

module.exports = { exportVatCsv };
