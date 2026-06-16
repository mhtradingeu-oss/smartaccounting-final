// Matching Engine Service (Phase 7.2)
// Suggest matches between bank transactions and invoices/expenses

// Utility: simple string similarity
function similarity(a, b) {
  if (!a || !b) {return 0;}
  a = a.toLowerCase();
  b = b.toLowerCase();
  if (a === b) {return 1;}
  let matches = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    if (a[i] === b[i]) {matches++;}
  }
  return matches / Math.max(a.length, b.length);
}

class MatchingEngineService {
  async suggestMatches(bankTransactions, invoices, expenses) {
    // For each bank transaction, suggest matches to invoices/expenses
    return bankTransactions.map((bt) => {
      const matches = [];
      // Invoice matching
      for (const inv of invoices) {
        let confidence = 0;
        // Amount match (±1 EUR tolerance)
        if (Math.abs(Number(bt.amount) - Number(inv.amount)) <= 1) {confidence += 0.4;}
        // Reference number match
        if (bt.reference && inv.reference && bt.reference === inv.reference) {confidence += 0.3;}
        // Invoice number in remittance text
        if (bt.reference && inv.invoiceNumber && bt.reference.includes(inv.invoiceNumber))
          {confidence += 0.2;}
        // Date proximity (±7 days)
        if (bt.bookingDate && inv.dueDate) {
          const btDate = new Date(bt.bookingDate);
          const invDate = new Date(inv.dueDate);
          if (Math.abs(btDate - invDate) <= 7 * 24 * 60 * 60 * 1000) {confidence += 0.1;}
        }
        // Counterparty similarity
        if (bt.counterparty && inv.counterparty)
          {confidence += 0.1 * similarity(bt.counterparty, inv.counterparty);}
        if (confidence > 0) {
          matches.push({ type: 'invoice', id: inv.id, confidence: Math.min(confidence, 1) });
        }
      }
      // Expense matching
      for (const exp of expenses) {
        let confidence = 0;
        if (Math.abs(Number(bt.amount) - Number(exp.amount)) <= 1) {confidence += 0.4;}
        if (bt.reference && exp.reference && bt.reference === exp.reference) {confidence += 0.3;}
        if (bt.reference && exp.expenseNumber && bt.reference.includes(exp.expenseNumber))
          {confidence += 0.2;}
        if (bt.bookingDate && exp.date) {
          const btDate = new Date(bt.bookingDate);
          const expDate = new Date(exp.date);
          if (Math.abs(btDate - expDate) <= 7 * 24 * 60 * 60 * 1000) {confidence += 0.1;}
        }
        if (bt.counterparty && exp.counterparty)
          {confidence += 0.1 * similarity(bt.counterparty, exp.counterparty);}
        if (confidence > 0) {
          matches.push({ type: 'expense', id: exp.id, confidence: Math.min(confidence, 1) });
        }
      }
      // Only return matches with confidence > 0.5
      const filteredMatches = matches.filter((m) => m.confidence > 0.5);
      return {
        bankTransactionId: bt.id,
        matches: filteredMatches,
      };
    });
  }
}

module.exports = new MatchingEngineService();
