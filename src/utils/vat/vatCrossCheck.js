/**
 * Cross-check VAT totals against journal & DATEV export
 */
async function crossCheckVAT({ vatTotals, journalTotals = null, datevTotals = null }) {
  // Compare VAT totals with journal and DATEV
  const checks = [];
  let passed = true;

  // Check against journal
  if (journalTotals) {
    const journalMatch = JSON.stringify(vatTotals) === JSON.stringify(journalTotals);
    checks.push({ source: 'journal', status: journalMatch ? 'ok' : 'mismatch' });
    if (!journalMatch) {passed = false;}
  }

  // Check against DATEV
  if (datevTotals) {
    const datevMatch = JSON.stringify(vatTotals) === JSON.stringify(datevTotals);
    checks.push({ source: 'datev', status: datevMatch ? 'ok' : 'mismatch' });
    if (!datevMatch) {passed = false;}
  }

  return { passed, checks };
}

module.exports = { crossCheckVAT };
