function exportVatJson(vatReturn) {
  return JSON.stringify(vatReturn, null, 2);
}

module.exports = { exportVatJson };
