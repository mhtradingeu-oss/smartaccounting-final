class AccountingBrain {

  analyze(text) {

    const lower = text.toLowerCase();

    let intent = 'UNKNOWN';

    if (lower.includes('expense')) {intent = 'CREATE_EXPENSE';}
    if (lower.includes('invoice')) {intent = 'CREATE_INVOICE';}
    if (lower.includes('bank')) {intent = 'MATCH_BANK';}
    if (lower.includes('refund')) {intent = 'CREATE_REFUND';}

    const amountMatch = text.match(/(\d+(\.\d+)?)/g);

    return {
      intent,
      amount: amountMatch ? parseFloat(amountMatch[0]) : null,
      currency: lower.includes('euro') ? 'EUR' : 'UNKNOWN',
      confidence: 0.92,
    };
  }

}

module.exports = new AccountingBrain();
