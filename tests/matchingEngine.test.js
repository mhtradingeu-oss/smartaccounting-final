// Tests for Matching Engine Service
const matchingEngineService = require('../src/services/matchingEngineService');

describe('MatchingEngineService', () => {
  it('should suggest invoice matches with high confidence', async () => {
    const bankTransactions = [
      {
        id: 'bt_1',
        amount: '100.00',
        bookingDate: '2026-01-10',
        reference: 'INV-456',
        counterparty: 'Acme GmbH',
      },
    ];
    const invoices = [
      {
        id: 'inv_456',
        amount: '100.00',
        dueDate: '2026-01-09',
        reference: 'INV-456',
        invoiceNumber: 'INV-456',
        counterparty: 'Acme GmbH',
      },
    ];
    const expenses = [];
    const result = await matchingEngineService.suggestMatches(bankTransactions, invoices, expenses);
    expect(result[0].matches.length).toBeGreaterThan(0);
    expect(result[0].matches[0].type).toBe('invoice');
    expect(result[0].matches[0].id).toBe('inv_456');
    expect(result[0].matches[0].confidence).toBeGreaterThan(0.8);
  });

  it('should suggest expense matches with confidence', async () => {
    const bankTransactions = [
      {
        id: 'bt_2',
        amount: '50.00',
        bookingDate: '2026-01-12',
        reference: 'EXP-789',
        counterparty: 'Office Supplies',
      },
    ];
    const invoices = [];
    const expenses = [
      {
        id: 'exp_789',
        amount: '50.00',
        date: '2026-01-12',
        reference: 'EXP-789',
        expenseNumber: 'EXP-789',
        counterparty: 'Office Supplies',
      },
    ];
    const result = await matchingEngineService.suggestMatches(bankTransactions, invoices, expenses);
    expect(result[0].matches.length).toBeGreaterThan(0);
    expect(result[0].matches[0].type).toBe('expense');
    expect(result[0].matches[0].id).toBe('exp_789');
    expect(result[0].matches[0].confidence).toBeGreaterThan(0.7);
  });

  it('should return no matches for unrelated transactions', async () => {
    const bankTransactions = [
      {
        id: 'bt_3',
        amount: '200.00',
        bookingDate: '2026-01-15',
        reference: 'XYZ-000',
        counterparty: 'Unknown',
      },
    ];
    const invoices = [
      {
        id: 'inv_999',
        amount: '100.00',
        dueDate: '2026-01-09',
        reference: 'INV-999',
        invoiceNumber: 'INV-999',
        counterparty: 'Acme GmbH',
      },
    ];
    const expenses = [
      {
        id: 'exp_888',
        amount: '50.00',
        date: '2026-01-12',
        reference: 'EXP-888',
        expenseNumber: 'EXP-888',
        counterparty: 'Office Supplies',
      },
    ];
    const result = await matchingEngineService.suggestMatches(bankTransactions, invoices, expenses);
    expect(result[0].matches.length).toBe(0);
  });
});
