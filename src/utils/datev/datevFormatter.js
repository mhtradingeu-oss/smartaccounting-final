// DATEV Formatter (EXTF-ready)
// Formats a single line for DATEV ASCII/CSV export

/**
 * Formats a record as a DATEV EXTF line
 * @param {Object} params
 * @param {string} params.belegdatum
 * @param {string} params.buchungstext
 * @param {string} params.sollKonto
 * @param {string} params.habenKonto
 * @param {string|number} params.betrag
 * @param {string} params.steuerkennzeichen
 * @param {string} params.belegnummer
 * @returns {string}
 */
function formatGermanAmount(value) {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return '0,00';
  }

  return amount.toFixed(2).replace('.', ',');
}

export function formatDatevLine({
  belegdatum,
  buchungstext,
  sollKonto,
  habenKonto,
  betrag,
  steuerkennzeichen,
  belegnummer,
}) {
  return [
    belegdatum,
    buchungstext,
    sollKonto,
    habenKonto,
    formatGermanAmount(betrag),
    steuerkennzeichen,
    belegnummer,
  ].join(';');
}

export { formatGermanAmount };
