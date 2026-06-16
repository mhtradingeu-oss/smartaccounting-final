// IDEA/GoBD CSV Formatter
// Formats records for GDPdU/IDEA-compliant CSV export

/**
 * Formats a record as an IDEA CSV line
 * @param {Object} record
 * @param {Array<string>} columns
 * @returns {string}
 */
function formatIdeaCsvLine(record, columns) {
  return columns.map((col) => formatIdeaValue(record[col])).join(';');
}

function formatIdeaValue(value) {
  if (value === null || value === undefined) {
    return '';
  }

  if (typeof value === 'number') {
    return value.toLocaleString('de-DE', { minimumFractionDigits: 2 });
  }

  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  return String(value);
}

module.exports = {
  formatIdeaCsvLine,
};
