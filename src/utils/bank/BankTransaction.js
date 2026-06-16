// BankTransaction model for import phase
class BankTransaction {
  constructor({ bookingDate, valueDate, amount, currency, reference, counterparty, rawPayload }) {
    this.bookingDate = bookingDate;
    this.valueDate = valueDate;
    this.amount = amount;
    this.currency = currency;
    this.reference = reference;
    this.counterparty = counterparty;
    this.rawPayload = rawPayload;
  }
}

module.exports = BankTransaction;
