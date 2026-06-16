// MT940 (SWIFT) Parser
const BankTransaction = require('./BankTransaction');

function parseMT940(mt940String) {
  // Simple line-based parser (real MT940 is more complex)
  const lines = mt940String.split(/\r?\n/);
  const txns = [];
  let txn = {};
  lines.forEach((line) => {
    if (line.startsWith(':61:')) {
      // Booking line
      const parts = line.substring(4).split('N');
      txn.bookingDate = parts[0].slice(0, 6); // YYMMDD
      txn.amount = parts[1]?.split(' ')[0];
    } else if (line.startsWith(':86:')) {
      // Details line
      txn.reference = line.substring(4);
      txns.push(
        new BankTransaction({
          bookingDate: txn.bookingDate,
          valueDate: txn.bookingDate,
          amount: txn.amount,
          currency: 'EUR',
          reference: txn.reference,
          counterparty: '',
          rawPayload: { ...txn },
        }),
      );
      txn = {};
    }
  });
  return txns;
}

module.exports = { parseMT940 };
