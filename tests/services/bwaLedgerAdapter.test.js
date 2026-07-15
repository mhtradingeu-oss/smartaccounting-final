'use strict';

const { Op } = require('sequelize');

const {
  ERROR_CODES,
  validatePeriod,
  buildCalendarPeriod,
  getMonthKey,
  normalizeProfitAndLossAmount,
  buildBwaAccountsFromEntries,
  loadPostedLedgerForBwa,
} = require('../../src/services/reporting/bwa/bwaLedgerAdapter');

function buildEntry({
  id = 'entry-1',
  entryDate = '2026-01-15',
  sourceType = 'manual',
  sourceId = 'source-1',
  lines = [],
} = {}) {
  return {
    id,
    entryDate,
    sourceType,
    sourceId,
    description: 'Journal entry',
    lines,
  };
}

function buildLine({
  id = 'line-1',
  debit = 0,
  credit = 0,
  account,
} = {}) {
  return {
    id,
    debit,
    credit,
    description: 'Journal line',
    account,
  };
}

function buildAccount({
  id = 'account-1',
  code = '8400',
  name = 'Revenue',
  type = 'revenue',
  role = 'revenue_19',
} = {}) {
  return {
    id,
    code,
    name,
    type,
    metadata: role
      ? {
          role,
          kontenrahmen: 'SKR03',
        }
      : null,
  };
}

describe('BWA posted-ledger adapter', () => {
  it('requires company context', () => {
    expect(() =>
      validatePeriod({
        companyId: null,
        year: 2026,
        toMonth: 1,
      }),
    ).toThrow(
      expect.objectContaining({
        code: ERROR_CODES.COMPANY_REQUIRED,
      }),
    );
  });

  it('rejects an invalid year', () => {
    expect(() =>
      validatePeriod({
        companyId: 1,
        year: '2026',
        toMonth: 1,
      }),
    ).toThrow(
      expect.objectContaining({
        code: ERROR_CODES.INVALID_YEAR,
      }),
    );
  });

  it('rejects an invalid month', () => {
    expect(() =>
      validatePeriod({
        companyId: 1,
        year: 2026,
        toMonth: 13,
      }),
    ).toThrow(
      expect.objectContaining({
        code: ERROR_CODES.INVALID_MONTH,
      }),
    );
  });

  it('builds a calendar-year period through the selected month', () => {
    expect(
      buildCalendarPeriod({
        year: 2026,
        toMonth: 3,
      }),
    ).toEqual({
      year: 2026,
      fromMonth: 1,
      toMonth: 3,
      from: '2026-01-01',
      to: '2026-03-31',
      months: [
        '2026-01',
        '2026-02',
        '2026-03',
      ],
    });
  });

  it('handles leap-year February', () => {
    expect(
      buildCalendarPeriod({
        year: 2024,
        toMonth: 2,
      }).to,
    ).toBe('2024-02-29');
  });

  it('extracts deterministic month keys from DATEONLY values', () => {
    expect(getMonthKey('2026-07-14')).toBe('2026-07');
    expect(getMonthKey('invalid')).toBeNull();
  });

  it('normalizes revenue as credit minus debit', () => {
    expect(
      normalizeProfitAndLossAmount({
        accountType: 'revenue',
        debit: 25,
        credit: 100,
      }),
    ).toBe(75);
  });

  it('normalizes expense as debit minus credit', () => {
    expect(
      normalizeProfitAndLossAmount({
        accountType: 'expense',
        debit: 100,
        credit: 25,
      }),
    ).toBe(75);
  });

  it('returns null for non-profit-and-loss accounts', () => {
    expect(
      normalizeProfitAndLossAmount({
        accountType: 'asset',
        debit: 100,
        credit: 0,
      }),
    ).toBeNull();
  });

  it('aggregates monthly and YTD revenue and expense values', () => {
    const period = buildCalendarPeriod({
      year: 2026,
      toMonth: 2,
    });

    const result = buildBwaAccountsFromEntries({
      period,
      entries: [
        buildEntry({
          id: 'entry-jan',
          entryDate: '2026-01-15',
          lines: [
            buildLine({
              id: 'revenue-jan',
              credit: 100,
              account: buildAccount(),
            }),
            buildLine({
              id: 'expense-jan',
              debit: 40,
              account: buildAccount({
                id: 'expense-account',
                code: '4930',
                name: 'Expense',
                type: 'expense',
                role: 'general_expense',
              }),
            }),
          ],
        }),
        buildEntry({
          id: 'entry-feb',
          entryDate: '2026-02-15',
          lines: [
            buildLine({
              id: 'revenue-feb',
              credit: 50,
              account: buildAccount(),
            }),
            buildLine({
              id: 'expense-feb',
              credit: 10,
              account: buildAccount({
                id: 'expense-account',
                code: '4930',
                name: 'Expense',
                type: 'expense',
                role: 'general_expense',
              }),
            }),
          ],
        }),
      ],
    });

    expect(result.accounts).toEqual([
      expect.objectContaining({
        accountCode: '4930',
        monthlyValues: {
          '2026-01': 40,
          '2026-02': -10,
        },
        ytdValue: 30,
      }),
      expect.objectContaining({
        accountCode: '8400',
        monthlyValues: {
          '2026-01': 100,
          '2026-02': 50,
        },
        ytdValue: 150,
      }),
    ]);
  });

  it('preserves reversal values in the reversal month', () => {
    const period = buildCalendarPeriod({
      year: 2026,
      toMonth: 4,
    });

    const account = buildAccount({
      id: 'expense-account',
      code: '4930',
      name: 'Expense',
      type: 'expense',
      role: 'general_expense',
    });

    const result = buildBwaAccountsFromEntries({
      period,
      entries: [
        buildEntry({
          id: 'original',
          entryDate: '2026-03-10',
          lines: [
            buildLine({
              id: 'original-line',
              debit: 100,
              account,
            }),
          ],
        }),
        buildEntry({
          id: 'reversal',
          entryDate: '2026-04-10',
          sourceType: 'journal_reversal',
          sourceId: 'original',
          lines: [
            buildLine({
              id: 'reversal-line',
              credit: 100,
              account,
            }),
          ],
        }),
      ],
    });

    expect(result.accounts[0].monthlyValues).toEqual({
      '2026-01': 0,
      '2026-02': 0,
      '2026-03': 100,
      '2026-04': -100,
    });
    expect(result.accounts[0].ytdValue).toBe(0);
  });

  it('excludes balance-sheet and tax accounts', () => {
    const period = buildCalendarPeriod({
      year: 2026,
      toMonth: 1,
    });

    const result = buildBwaAccountsFromEntries({
      period,
      entries: [
        buildEntry({
          lines: [
            buildLine({
              account: buildAccount({
                id: 'bank',
                code: '1200',
                name: 'Bank',
                type: 'asset',
                role: 'bank',
              }),
              debit: 100,
            }),
            buildLine({
              id: 'tax-line',
              account: buildAccount({
                id: 'tax',
                code: '1776',
                name: 'VAT',
                type: 'tax',
                role: 'output_vat_19',
              }),
              credit: 19,
            }),
          ],
        }),
      ],
    });

    expect(result.accounts).toEqual([]);
    expect(result.evidence).toEqual([]);
  });

  it('uses null role when account metadata is missing', () => {
    const period = buildCalendarPeriod({
      year: 2026,
      toMonth: 1,
    });

    const result = buildBwaAccountsFromEntries({
      period,
      entries: [
        buildEntry({
          lines: [
            buildLine({
              account: buildAccount({
                role: null,
              }),
              credit: 100,
            }),
          ],
        }),
      ],
    });

    expect(result.accounts[0].role).toBeNull();
  });

  it('ignores entries outside the selected period', () => {
    const period = buildCalendarPeriod({
      year: 2026,
      toMonth: 1,
    });

    const result = buildBwaAccountsFromEntries({
      period,
      entries: [
        buildEntry({
          entryDate: '2025-12-31',
          lines: [
            buildLine({
              credit: 100,
              account: buildAccount(),
            }),
          ],
        }),
        buildEntry({
          entryDate: '2026-02-01',
          lines: [
            buildLine({
              credit: 100,
              account: buildAccount(),
            }),
          ],
        }),
      ],
    });

    expect(result.accounts).toEqual([]);
  });

  it('preserves ledger evidence fields', () => {
    const period = buildCalendarPeriod({
      year: 2026,
      toMonth: 1,
    });

    const result = buildBwaAccountsFromEntries({
      period,
      entries: [
        buildEntry({
          id: 'entry-123',
          entryDate: '2026-01-15',
          sourceType: 'manual',
          sourceId: 'source-123',
          lines: [
            buildLine({
              id: 'line-123',
              debit: 10,
              credit: 100,
              account: buildAccount(),
            }),
          ],
        }),
      ],
    });

    expect(result.evidence[0]).toEqual(
      expect.objectContaining({
        journalEntryId: 'entry-123',
        journalEntryLineId: 'line-123',
        entryDate: '2026-01-15',
        sourceType: 'manual',
        sourceId: 'source-123',
        accountCode: '8400',
        debit: 10,
        credit: 100,
        amount: 90,
      }),
    );
  });

  it('does not mutate supplied entries', () => {
    const period = buildCalendarPeriod({
      year: 2026,
      toMonth: 1,
    });

    const entries = [
      buildEntry({
        lines: [
          buildLine({
            credit: 100,
            account: buildAccount(),
          }),
        ],
      }),
    ];

    const snapshot = JSON.parse(
      JSON.stringify(entries),
    );

    buildBwaAccountsFromEntries({
      period,
      entries,
    });

    expect(entries).toEqual(snapshot);
  });

  it('queries only posted same-company entries through selected month', async () => {
    const JournalEntry = {
      findAll: jest.fn().mockResolvedValue([]),
    };
    const JournalEntryLine = {};
    const ChartAccount = {};

    const result = await loadPostedLedgerForBwa({
      companyId: 42,
      year: 2026,
      toMonth: 7,
      models: {
        JournalEntry,
        JournalEntryLine,
        ChartAccount,
      },
    });

    expect(JournalEntry.findAll).toHaveBeenCalledTimes(1);

    const query =
      JournalEntry.findAll.mock.calls[0][0];

    expect(query.where).toEqual({
      companyId: 42,
      status: 'posted',
      entryDate: {
        [Op.gte]: '2026-01-01',
        [Op.lte]: '2026-07-31',
      },
    });

    expect(query.include[0]).toEqual(
      expect.objectContaining({
        model: JournalEntryLine,
        as: 'lines',
        required: true,
      }),
    );

    expect(query.include[0].include[0]).toEqual(
      expect.objectContaining({
        model: ChartAccount,
        as: 'account',
        required: true,
      }),
    );

    expect(
      query.include[0].include[0].attributes,
    ).toEqual(
      expect.arrayContaining([
        'id',
        'code',
        'name',
        'type',
        'metadata',
      ]),
    );

    expect(result.period).toEqual(
      expect.objectContaining({
        from: '2026-01-01',
        to: '2026-07-31',
      }),
    );
  });

  it('rejects invalid monetary values instead of converting them to zero', () => {
    const period = buildCalendarPeriod({
      year: 2026,
      toMonth: 1,
    });

    expect(() =>
      buildBwaAccountsFromEntries({
        period,
        entries: [
          buildEntry({
            lines: [
              buildLine({
                debit: 'not-a-number',
                credit: 0,
                account: buildAccount({
                  id: 'expense-account',
                  code: '4930',
                  name: 'Expense',
                  type: 'expense',
                  role: 'general_expense',
                }),
              }),
            ],
          }),
        ],
      }),
    ).toThrow(
      expect.objectContaining({
        code: 'BWA_ADAPTER_INVALID_MONEY',
      }),
    );
  });

  it('rejects a profit-and-loss account without an account id', () => {
    const period = buildCalendarPeriod({
      year: 2026,
      toMonth: 1,
    });

    expect(() =>
      buildBwaAccountsFromEntries({
        period,
        entries: [
          buildEntry({
            lines: [
              buildLine({
                credit: 100,
                account: buildAccount({
                  id: null,
                  code: '8400',
                  name: 'Revenue',
                  type: 'revenue',
                  role: 'revenue_19',
                }),
              }),
            ],
          }),
        ],
      }),
    ).toThrow(
      expect.objectContaining({
        code: 'BWA_ADAPTER_INVALID_ACCOUNT',
      }),
    );
  });

  it('rejects a profit-and-loss account without an account code', () => {
    const period = buildCalendarPeriod({
      year: 2026,
      toMonth: 1,
    });

    expect(() =>
      buildBwaAccountsFromEntries({
        period,
        entries: [
          buildEntry({
            lines: [
              buildLine({
                credit: 100,
                account: buildAccount({
                  id: 'revenue-account',
                  code: null,
                  name: 'Revenue',
                  type: 'revenue',
                  role: 'revenue_19',
                }),
              }),
            ],
          }),
        ],
      }),
    ).toThrow(
      expect.objectContaining({
        code: 'BWA_ADAPTER_INVALID_ACCOUNT',
      }),
    );
  });

  it('rejects malformed ledger entry dates instead of silently skipping them', () => {
    const period = buildCalendarPeriod({
      year: 2026,
      toMonth: 1,
    });

    expect(() =>
      buildBwaAccountsFromEntries({
        period,
        entries: [
          buildEntry({
            entryDate: 'not-a-date',
            lines: [
              buildLine({
                credit: 100,
                account: buildAccount(),
              }),
            ],
          }),
        ],
      }),
    ).toThrow(
      expect.objectContaining({
        code: 'BWA_ADAPTER_INVALID_ENTRY_DATE',
      }),
    );
  });

  it('continues to ignore valid ledger dates outside the selected period', () => {
    const period = buildCalendarPeriod({
      year: 2026,
      toMonth: 1,
    });

    const result = buildBwaAccountsFromEntries({
      period,
      entries: [
        buildEntry({
          entryDate: '2025-12-31',
          lines: [
            buildLine({
              credit: 100,
              account: buildAccount(),
            }),
          ],
        }),
        buildEntry({
          entryDate: '2026-02-01',
          lines: [
            buildLine({
              credit: 100,
              account: buildAccount(),
            }),
          ],
        }),
      ],
    });

    expect(result.accounts).toEqual([]);
    expect(result.evidence).toEqual([]);
  });

});
