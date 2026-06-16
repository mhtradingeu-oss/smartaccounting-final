// Tests for DATEV Zahlungsverkehr Export Service
const datevExportService = require('../src/services/datevExportService');

describe('DatevExportService', () => {
  it('should export only locked payments with locked bank transactions', async () => {
    const payments = [
      {
        id: 'pay_1',
        bankTransactionId: 'bt_1',
        invoiceOrExpenseId: 'inv_1',
        paymentDate: '2026-01-10',
        amountPaid: '100.00',
        currency: 'EUR',
        reference: 'INV-1',
        invoiceOrExpenseType: 'invoice',
        locked: true,
        bankTransactionLocked: true,
      },
      {
        id: 'pay_2',
        bankTransactionId: 'bt_2',
        invoiceOrExpenseId: 'exp_2',
        paymentDate: '2026-01-12',
        amountPaid: '50.00',
        currency: 'EUR',
        reference: 'EXP-2',
        invoiceOrExpenseType: 'expense',
        locked: false,
        bankTransactionLocked: true,
      },
      {
        id: 'pay_3',
        bankTransactionId: 'bt_3',
        invoiceOrExpenseId: 'inv_3',
        paymentDate: '2026-01-15',
        amountPaid: '200.00',
        currency: 'EUR',
        reference: 'INV-3',
        invoiceOrExpenseType: 'invoice',
        locked: true,
        bankTransactionLocked: false,
      },
    ];
    const clearingAccounts = {
      invoice: '1200',
      expense: '1600',
    };
    const csv = await datevExportService.exportPayments(payments, clearingAccounts);
    expect(csv).toContain(
      '"Buchungstag";"Betrag";"Währung";"Gegenkonto";"Verwendungszweck";"Belegfeld1";"Belegfeld2"',
    );
    expect(csv).toContain('"2026-01-10";"100.00";"EUR";"1200";"INV-1";"inv_1";"bt_1"');
    expect(csv).not.toContain('"2026-01-12";"50.00";"EUR";"1600";"EXP-2";"exp_2";"bt_2"');
    expect(csv).not.toContain('"2026-01-15";"200.00";"EUR";"1200";"INV-3";"inv_3";"bt_3"');
  });
});
