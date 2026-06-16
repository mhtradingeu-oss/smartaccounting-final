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
export function formatDatevLine({
  belegdatum,
  buchungstext,
  sollKonto,
  habenKonto,
  betrag,
  steuerkennzeichen,
  belegnummer,
}) {
  // TODO: Implement strict DATEV column order and formatting
  return [
    belegdatum,
    buchungstext,
    sollKonto,
    habenKonto,
    betrag,
    steuerkennzeichen,
    belegnummer,
  ].join(';');
}
