// CAMT.053 (ISO 20022 XML) Parser
const xml2js = require('xml2js');
const BankTransaction = require('./BankTransaction');

async function parseCAMT053(xmlString) {
  const parser = new xml2js.Parser({ explicitArray: false });
  const result = await parser.parseStringPromise(xmlString);
  // Navigate to statement entries (simplified, real files may differ)
  const entries = result?.Document?.BkToCstmrStmt?.Stmt?.Ntry || [];
  const txns = Array.isArray(entries) ? entries : [entries];
  return txns.map(
    (entry) =>
      new BankTransaction({
        bookingDate: entry.BookgDt?.Dt,
        valueDate: entry.ValDt?.Dt,
        amount: entry.Amt?._,
        currency: entry.Amt?.$.Ccy,
        reference: entry.NtryRef,
        counterparty: entry?.NtryDtls?.TxDtls?.RmtInf?.Ustrd,
        rawPayload: entry,
      }),
  );
}

module.exports = { parseCAMT053 };
