'use strict';

const {
  ROW_TYPES,
  SKR03_BWA_01_V1,
} = require('../../src/services/reporting/bwa/bwaDefinitions');

const {
  WARNING_CODES,
  ERROR_CODES,
  validateDefinition,
  matchesRange,
  matcherMatchesAccount,
  buildBwaReport,
} = require('../../src/services/reporting/bwa/bwaEngine');

const buildSyntheticDefinition = () => ({
  id: 'test-bwa',
  version: 1,
  jurisdiction: 'DE',
  chartSystem: 'TEST',
  fiscalYearMode: 'calendar_year',
  title: 'Synthetic BWA',
  preliminary: true,
  rows: [
    {
      id: 'revenue',
      label: 'Revenue',
      type: ROW_TYPES.ACCOUNT_SUM,
      matchers: [
        {
          roles: ['revenue'],
          accountCodes: ['8000'],
          accountRanges: [['8100', '8199']],
        },
      ],
    },
    {
      id: 'expense',
      label: 'Expense',
      type: ROW_TYPES.ACCOUNT_SUM,
      matchers: [
        {
          roles: ['expense'],
          accountCodes: ['4000'],
        },
      ],
    },
    {
      id: 'result',
      label: 'Result',
      type: ROW_TYPES.FORMULA,
      formula: [
        { rowId: 'revenue', factor: 1 },
        { rowId: 'expense', factor: -1 },
      ],
    },
    {
      id: 'zero_row',
      label: 'Zero Row',
      type: ROW_TYPES.ACCOUNT_SUM,
      matchers: [],
    },
  ],
});

const buildAccounts = () => [
  {
    accountId: 'revenue-1',
    accountCode: '8000',
    accountName: 'Revenue',
    accountType: 'revenue',
    role: 'revenue',
    monthlyValues: {
      '2026-01': 100.235,
      '2026-02': 50,
    },
    ytdValue: 150.235,
  },
  {
    accountId: 'expense-1',
    accountCode: '4000',
    accountName: 'Expense',
    accountType: 'expense',
    role: 'expense',
    monthlyValues: {
      '2026-01': 20,
      '2026-02': -5,
    },
    ytdValue: 15,
  },
  {
    accountId: 'asset-1',
    accountCode: '1000',
    accountName: 'Bank',
    accountType: 'asset',
    role: 'bank',
    monthlyValues: {
      '2026-01': 500,
      '2026-02': 500,
    },
    ytdValue: 1000,
  },
];

describe('BWA pure synthetic engine', () => {
  it('validates the built-in SKR03 definition', () => {
    expect(
      validateDefinition(SKR03_BWA_01_V1),
    ).toBe(true);
  });

  it('rejects duplicate row ids', () => {
    const definition = buildSyntheticDefinition();
    definition.rows.push({
      ...definition.rows[0],
    });

    expect(() =>
      validateDefinition(definition),
    ).toThrow(
      expect.objectContaining({
        code: ERROR_CODES.DUPLICATE_ROW_ID,
      }),
    );
  });

  it('rejects unknown row types', () => {
    const definition = buildSyntheticDefinition();
    definition.rows[0].type = 'UNKNOWN';

    expect(() =>
      validateDefinition(definition),
    ).toThrow(
      expect.objectContaining({
        code: ERROR_CODES.UNKNOWN_ROW_TYPE,
      }),
    );
  });

  it('rejects missing formula references', () => {
    const definition = buildSyntheticDefinition();
    definition.rows[2].formula.push({
      rowId: 'missing',
      factor: 1,
    });

    expect(() =>
      validateDefinition(definition),
    ).toThrow(
      expect.objectContaining({
        code:
          ERROR_CODES.MISSING_FORMULA_REFERENCE,
      }),
    );
  });

  it('rejects circular formula dependencies', () => {
    const definition = buildSyntheticDefinition();

    definition.rows.push(
      {
        id: 'cycle_a',
        label: 'Cycle A',
        type: ROW_TYPES.FORMULA,
        formula: [
          { rowId: 'cycle_b', factor: 1 },
        ],
      },
      {
        id: 'cycle_b',
        label: 'Cycle B',
        type: ROW_TYPES.FORMULA,
        formula: [
          { rowId: 'cycle_a', factor: 1 },
        ],
      },
    );

    expect(() =>
      validateDefinition(definition),
    ).toThrow(
      expect.objectContaining({
        code: ERROR_CODES.FORMULA_CYCLE,
      }),
    );
  });

  it('matches exact account codes', () => {
    expect(
      matcherMatchesAccount(
        {
          accountCodes: ['8000'],
        },
        {
          accountCode: '8000',
        },
      ),
    ).toBe(true);
  });

  it('matches normalized account roles', () => {
    expect(
      matcherMatchesAccount(
        {
          roles: ['revenue'],
        },
        {
          role: ' Revenue ',
        },
      ),
    ).toBe(true);
  });

  it('matches inclusive account ranges', () => {
    expect(matchesRange('8150', ['8100', '8199']))
      .toBe(true);
    expect(matchesRange('8200', ['8100', '8199']))
      .toBe(false);
  });

  it('preserves deterministic definition row order', () => {
    const report = buildBwaReport({
      definition: buildSyntheticDefinition(),
      accounts: buildAccounts(),
    });

    expect(
      report.rows.map((row) => row.rowId),
    ).toEqual([
      'revenue',
      'expense',
      'result',
      'zero_row',
    ]);
  });

  it('preserves zero rows', () => {
    const report = buildBwaReport({
      definition: buildSyntheticDefinition(),
      accounts: buildAccounts(),
    });

    expect(
      report.rows.find(
        (row) => row.rowId === 'zero_row',
      ),
    ).toEqual(
      expect.objectContaining({
        monthlyValues: {
          '2026-01': 0,
          '2026-02': 0,
        },
        ytdValue: 0,
      }),
    );
  });

  it('aggregates monthly account values', () => {
    const report = buildBwaReport({
      definition: buildSyntheticDefinition(),
      accounts: buildAccounts(),
    });

    expect(
      report.rows.find(
        (row) => row.rowId === 'revenue',
      ).monthlyValues,
    ).toEqual({
      '2026-01': 100.24,
      '2026-02': 50,
    });
  });

  it('uses independent account YTD values', () => {
    const accounts = buildAccounts();

    accounts[0].ytdValue = 199.995;

    const report = buildBwaReport({
      definition: buildSyntheticDefinition(),
      accounts,
    });

    expect(
      report.rows.find(
        (row) => row.rowId === 'revenue',
      ).ytdValue,
    ).toBe(200);
  });

  it('preserves negative reversal values', () => {
    const report = buildBwaReport({
      definition: buildSyntheticDefinition(),
      accounts: buildAccounts(),
    });

    expect(
      report.rows.find(
        (row) => row.rowId === 'expense',
      ).monthlyValues['2026-02'],
    ).toBe(-5);
  });

  it('evaluates formula rows', () => {
    const report = buildBwaReport({
      definition: buildSyntheticDefinition(),
      accounts: buildAccounts(),
    });

    const result = report.rows.find(
      (row) => row.rowId === 'result',
    );

    expect(result.monthlyValues).toEqual({
      '2026-01': 80.24,
      '2026-02': 55,
    });
    expect(result.ytdValue).toBe(135.24);
  });

  it('warns about unmapped revenue accounts', () => {
    const accounts = buildAccounts();

    accounts.push({
      accountId: 'revenue-unmapped',
      accountCode: '9999',
      accountName: 'Unmapped revenue',
      accountType: 'revenue',
      role: null,
      monthlyValues: {
        '2026-01': 10,
      },
      ytdValue: 10,
    });

    const report = buildBwaReport({
      definition: buildSyntheticDefinition(),
      accounts,
    });

    expect(report.warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code:
            WARNING_CODES.UNMAPPED_REVENUE_ACCOUNT,
          accountId: 'revenue-unmapped',
        }),
      ]),
    );
  });

  it('warns about unmapped expense accounts', () => {
    const accounts = buildAccounts();

    accounts.push({
      accountId: 'expense-unmapped',
      accountCode: '4999',
      accountName: 'Unmapped expense',
      accountType: 'expense',
      role: null,
      monthlyValues: {
        '2026-01': 10,
      },
      ytdValue: 10,
    });

    const report = buildBwaReport({
      definition: buildSyntheticDefinition(),
      accounts,
    });

    expect(report.warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code:
            WARNING_CODES.UNMAPPED_EXPENSE_ACCOUNT,
          accountId: 'expense-unmapped',
        }),
      ]),
    );
  });

  it('ignores non-profit-and-loss accounts for unmapped warnings', () => {
    const report = buildBwaReport({
      definition: buildSyntheticDefinition(),
      accounts: buildAccounts(),
    });

    expect(
      report.unmappedAccounts.some(
        (account) => account.accountType === 'asset',
      ),
    ).toBe(false);
  });

  it('does not mutate input accounts', () => {
    const accounts = buildAccounts();
    const snapshot = JSON.parse(
      JSON.stringify(accounts),
    );

    buildBwaReport({
      definition: buildSyntheticDefinition(),
      accounts,
    });

    expect(accounts).toEqual(snapshot);
  });

  it('publishes monetary values with two-decimal rounding', () => {
    const report = buildBwaReport({
      definition: buildSyntheticDefinition(),
      accounts: buildAccounts(),
    });

    expect(
      report.rows.find(
        (row) => row.rowId === 'revenue',
      ).monthlyValues['2026-01'],
    ).toBe(100.24);
  });

  it('keeps the built-in definition deeply immutable', () => {
    expect(
      Object.isFrozen(SKR03_BWA_01_V1),
    ).toBe(true);
    expect(
      Object.isFrozen(SKR03_BWA_01_V1.rows),
    ).toBe(true);
    expect(
      Object.isFrozen(
        SKR03_BWA_01_V1.rows[0].matchers,
      ),
    ).toBe(true);
  });

  it('rejects formula references to rows declared later', () => {
    const definition = {
      id: 'forward-reference-test',
      version: 1,
      rows: [
        {
          id: 'result',
          label: 'Result',
          type: ROW_TYPES.FORMULA,
          formula: [
            { rowId: 'revenue', factor: 1 },
          ],
        },
        {
          id: 'revenue',
          label: 'Revenue',
          type: ROW_TYPES.ACCOUNT_SUM,
          matchers: [],
        },
      ],
    };

    expect(() =>
      validateDefinition(definition),
    ).toThrow(
      expect.objectContaining({
        code:
          ERROR_CODES.BWA_FORWARD_FORMULA_REFERENCE,
      }),
    );
  });

  it('rejects non-finite formula factors', () => {
    const definition = buildSyntheticDefinition();

    definition.rows[2].formula[0].factor = 'not-a-number';

    expect(() =>
      validateDefinition(definition),
    ).toThrow(
      expect.objectContaining({
        code: ERROR_CODES.BWA_INVALID_FORMULA_FACTOR,
      }),
    );
  });

  it('rejects one account mapped into multiple account rows', () => {
    const definition = {
      id: 'ambiguous-mapping-test',
      version: 1,
      rows: [
        {
          id: 'revenue_by_role',
          label: 'Revenue by role',
          type: ROW_TYPES.ACCOUNT_SUM,
          matchers: [
            {
              roles: ['revenue'],
            },
          ],
        },
        {
          id: 'revenue_by_code',
          label: 'Revenue by code',
          type: ROW_TYPES.ACCOUNT_SUM,
          matchers: [
            {
              accountCodes: ['8000'],
            },
          ],
        },
      ],
    };

    expect(() =>
      buildBwaReport({
        definition,
        accounts: [
          {
            accountId: 'revenue-1',
            accountCode: '8000',
            accountName: 'Revenue',
            accountType: 'revenue',
            role: 'revenue',
            monthlyValues: {
              '2026-01': 100,
            },
            ytdValue: 100,
          },
        ],
      }),
    ).toThrow(
      expect.objectContaining({
        code:
          ERROR_CODES.BWA_AMBIGUOUS_ACCOUNT_MAPPING,
      }),
    );
  });

  it('evaluates formulas from raw values before publication rounding', () => {
    const definition = {
      id: 'raw-formula-test',
      version: 1,
      rows: [
        {
          id: 'revenue',
          label: 'Revenue',
          type: ROW_TYPES.ACCOUNT_SUM,
          matchers: [
            {
              accountCodes: ['8000'],
            },
          ],
        },
        {
          id: 'expense',
          label: 'Expense',
          type: ROW_TYPES.ACCOUNT_SUM,
          matchers: [
            {
              accountCodes: ['4000'],
            },
          ],
        },
        {
          id: 'result',
          label: 'Result',
          type: ROW_TYPES.FORMULA,
          formula: [
            { rowId: 'revenue', factor: 1 },
            { rowId: 'expense', factor: -1 },
          ],
        },
      ],
    };

    const report = buildBwaReport({
      definition,
      accounts: [
        {
          accountId: 'revenue-1',
          accountCode: '8000',
          accountName: 'Revenue',
          accountType: 'revenue',
          monthlyValues: {
            '2026-01': 0.335,
          },
          ytdValue: 0.335,
        },
        {
          accountId: 'expense-1',
          accountCode: '4000',
          accountName: 'Expense',
          accountType: 'expense',
          monthlyValues: {
            '2026-01': 0.005,
          },
          ytdValue: 0.005,
        },
      ],
    });

    const result = report.rows.find(
      (row) => row.rowId === 'result',
    );

    expect(result.monthlyValues['2026-01']).toBe(0.33);
    expect(result.ytdValue).toBe(0.33);
  });

});
