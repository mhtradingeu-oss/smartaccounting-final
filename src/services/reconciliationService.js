// Reconciliation & Locking Service (Phase 7.3)
// Handles payment creation, locking, and GoBD compliance

class ReconciliationService {
  async reconcile({ bankTransaction, invoiceOrExpense, amountPaid, paymentDate }) {
    // Create immutable Payment record
    const payment = {
      id: `pay_${Date.now()}`,
      bankTransactionId: bankTransaction.id,
      invoiceOrExpenseId: invoiceOrExpense.id,
      paymentDate,
      amountPaid,
      locked: true,
      createdAt: new Date().toISOString(),
    };
    // Update invoice/expense status
    let status = 'partially_paid';
    const paidAmount = (invoiceOrExpense.paidAmount || 0) + amountPaid;
    if (paidAmount >= invoiceOrExpense.amount) {status = 'paid';}
    // Lock bank transaction
    bankTransaction.locked = true;
    // Return updated objects (simulate DB write)
    return {
      payment,
      updatedInvoiceOrExpense: {
        ...invoiceOrExpense,
        paidAmount,
        status,
        // No amount/VAT changes allowed
      },
      lockedBankTransaction: bankTransaction,
    };
  }
}

module.exports = new ReconciliationService();
