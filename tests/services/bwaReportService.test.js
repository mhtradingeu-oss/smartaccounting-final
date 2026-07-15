'use strict';

const {
  SKR03_BWA_01_V1,
} = require('../../src/services/reporting/bwa/bwaDefinitions');

const {
  DEFAULT_DEFINITION_ID,
  ERROR_CODES,
  createDefinitionRegistry,
  resolveDefinition,
  createBwaReportService,
} = require('../../src/services/reporting/bwa/bwaReportService');

function buildLedgerResult() {
  return {
    period: {
      year: 2026,
      fromMonth: 1,
      toMonth: 2,
      from: '2026-01-01',
      to: '2026-02-28',
      months: [
        '2026-01',
        '2026-02',
      ],
    },
    accounts: [
      {
        accountId: 'revenue-1',
        accountCode: '8400',
        accountName: 'Revenue',
        accountType: 'revenue',
        role: 'revenue_19',
        monthlyValues: {
          '2026-01': 100,
          '2026-02': 50,
        },
        ytdValue: 150,
      },
      {
        accountId: 'expense-1',
        accountCode: '4930',
        accountName: 'Expense',
        accountType: 'expense',
        role: 'general_expense',
        monthlyValues: {
          '2026-01': 30,
          '2026-02': 20,
        },
        ytdValue: 50,
      },
    ],
    evidence: [
      {
        journalEntryId: 'entry-1',
        journalEntryLineId: 'line-1',
        accountId: 'revenue-1',
        accountCode: '8400',
        month: '2026-01',
        amount: 100,
      },
    ],
  };
}

describe('BWA application report service', () => {
  it('uses the built-in SKR03 definition by default', async () => {
    const ledgerLoader = jest
      .fn()
      .mockResolvedValue(
        buildLedgerResult(),
      );

    const service = createBwaReportService({
      ledgerLoader,
      now: () =>
        new Date(
          '2026-07-15T10:00:00.000Z',
        ),
    });

    const result = await service.getBwaReport({
      companyId: 42,
      year: 2026,
      toMonth: 2,
    });

    expect(
      DEFAULT_DEFINITION_ID,
    ).toBe('de-bwa-01-skr03');

    expect(result.definition).toEqual(
      expect.objectContaining({
        id: 'de-bwa-01-skr03',
        version: 1,
        chartSystem: 'SKR03',
      }),
    );

    expect(ledgerLoader).toHaveBeenCalledWith({
      companyId: 42,
      year: 2026,
      toMonth: 2,
    });
  });

  it('returns a complete application read model', async () => {
    const service = createBwaReportService({
      ledgerLoader: jest
        .fn()
        .mockResolvedValue(
          buildLedgerResult(),
        ),
      now: () =>
        new Date(
          '2026-07-15T10:00:00.000Z',
        ),
    });

    const result = await service.getBwaReport({
      companyId: 42,
      year: 2026,
      toMonth: 2,
    });

    expect(result).toEqual(
      expect.objectContaining({
        companyId: 42,
        period: {
          year: 2026,
          fromMonth: 1,
          toMonth: 2,
          from: '2026-01-01',
          to: '2026-02-28',
          months: [
            '2026-01',
            '2026-02',
          ],
        },
        preliminary: true,
        months: [
          '2026-01',
          '2026-02',
        ],
        rows: expect.any(Array),
        unmappedAccounts: [],
        warnings: [],
        evidence: expect.any(Array),
        generatedAt:
          '2026-07-15T10:00:00.000Z',
      }),
    );
  });

  it('passes normalized accounts to the pure engine', async () => {
    const ledgerResult =
      buildLedgerResult();

    const reportBuilder = jest
      .fn()
      .mockReturnValue({
        definition: {
          id: SKR03_BWA_01_V1.id,
          version:
            SKR03_BWA_01_V1.version,
        },
        preliminary: true,
        months: [
          '2026-01',
          '2026-02',
        ],
        rows: [],
        unmappedAccounts: [],
        warnings: [],
      });

    const service = createBwaReportService({
      ledgerLoader: jest
        .fn()
        .mockResolvedValue(
          ledgerResult,
        ),
      reportBuilder,
    });

    await service.getBwaReport({
      companyId: 42,
      year: 2026,
      toMonth: 2,
    });

    expect(
      reportBuilder,
    ).toHaveBeenCalledWith({
      definition:
        SKR03_BWA_01_V1,
      accounts:
        ledgerResult.accounts,
      months:
        ledgerResult.period.months,
    });
  });

  it('preserves adapter evidence without passing it into the engine', async () => {
    const ledgerResult =
      buildLedgerResult();

    const reportBuilder = jest
      .fn()
      .mockReturnValue({
        definition: {
          id: SKR03_BWA_01_V1.id,
          version:
            SKR03_BWA_01_V1.version,
        },
        preliminary: true,
        months: [],
        rows: [],
        unmappedAccounts: [],
        warnings: [],
      });

    const service = createBwaReportService({
      ledgerLoader: jest
        .fn()
        .mockResolvedValue(
          ledgerResult,
        ),
      reportBuilder,
    });

    const result = await service.getBwaReport({
      companyId: 42,
      year: 2026,
      toMonth: 2,
    });

    expect(
      reportBuilder.mock.calls[0][0],
    ).not.toHaveProperty('evidence');

    expect(result.evidence).toEqual(
      ledgerResult.evidence,
    );
  });

  it('supports an explicitly registered definition', async () => {
    const customDefinition = {
      ...SKR03_BWA_01_V1,
      id: 'custom-test-definition',
    };

    const service = createBwaReportService({
      definitions: [
        customDefinition,
      ],
      ledgerLoader: jest
        .fn()
        .mockResolvedValue({
          ...buildLedgerResult(),
          accounts: [],
        }),
    });

    const result = await service.getBwaReport({
      companyId: 42,
      year: 2026,
      toMonth: 2,
      definitionId:
        'custom-test-definition',
    });

    expect(result.definition.id).toBe(
      'custom-test-definition',
    );
  });

  it('rejects an unsupported definition id', async () => {
    const service =
      createBwaReportService({
        ledgerLoader: jest.fn(),
      });

    await expect(
      service.getBwaReport({
        companyId: 42,
        year: 2026,
        toMonth: 2,
        definitionId:
          'missing-definition',
      }),
    ).rejects.toEqual(
      expect.objectContaining({
        code:
          ERROR_CODES.DEFINITION_NOT_FOUND,
        status: 400,
      }),
    );
  });

  it('rejects definitions without ids', () => {
    expect(() =>
      createDefinitionRegistry([
        {
          version: 1,
          rows: [],
        },
      ]),
    ).toThrow(
      expect.objectContaining({
        code:
          ERROR_CODES.DEFINITION_REQUIRED,
      }),
    );
  });

  it('rejects duplicate definition ids', () => {
    expect(() =>
      createDefinitionRegistry([
        SKR03_BWA_01_V1,
        SKR03_BWA_01_V1,
      ]),
    ).toThrow(
      expect.objectContaining({
        code:
          ERROR_CODES.DEFINITION_REQUIRED,
      }),
    );
  });

  it('resolves registered definitions deterministically', () => {
    const registry =
      createDefinitionRegistry([
        SKR03_BWA_01_V1,
      ]);

    expect(
      resolveDefinition({
        definitionId:
          SKR03_BWA_01_V1.id,
        registry,
      }),
    ).toBe(SKR03_BWA_01_V1);
  });

  it('rejects malformed adapter results', async () => {
    const service = createBwaReportService({
      ledgerLoader: jest
        .fn()
        .mockResolvedValue({
          period: null,
          accounts: [],
          evidence: [],
        }),
    });

    await expect(
      service.getBwaReport({
        companyId: 42,
        year: 2026,
        toMonth: 2,
      }),
    ).rejects.toEqual(
      expect.objectContaining({
        code:
          ERROR_CODES.INVALID_LEDGER_RESULT,
        status: 500,
      }),
    );
  });

  it('rejects malformed engine results', async () => {
    const service = createBwaReportService({
      ledgerLoader: jest
        .fn()
        .mockResolvedValue(
          buildLedgerResult(),
        ),
      reportBuilder: jest
        .fn()
        .mockReturnValue({
          definition: null,
          months: [],
          rows: [],
          unmappedAccounts: [],
          warnings: [],
        }),
    });

    await expect(
      service.getBwaReport({
        companyId: 42,
        year: 2026,
        toMonth: 2,
      }),
    ).rejects.toEqual(
      expect.objectContaining({
        code:
          ERROR_CODES.INVALID_REPORT_RESULT,
        status: 500,
      }),
    );
  });

  it('propagates adapter validation errors unchanged', async () => {
    const adapterError =
      Object.assign(
        new Error(
          'companyId is required',
        ),
        {
          code:
            'BWA_ADAPTER_COMPANY_REQUIRED',
        },
      );

    const service = createBwaReportService({
      ledgerLoader: jest
        .fn()
        .mockRejectedValue(
          adapterError,
        ),
    });

    await expect(
      service.getBwaReport({
        companyId: null,
        year: 2026,
        toMonth: 2,
      }),
    ).rejects.toBe(adapterError);
  });

  it('propagates pure engine errors unchanged', async () => {
    const engineError =
      Object.assign(
        new Error(
          'ambiguous account mapping',
        ),
        {
          code:
            'BWA_AMBIGUOUS_ACCOUNT_MAPPING',
        },
      );

    const service = createBwaReportService({
      ledgerLoader: jest
        .fn()
        .mockResolvedValue(
          buildLedgerResult(),
        ),
      reportBuilder: jest
        .fn()
        .mockImplementation(() => {
          throw engineError;
        }),
    });

    await expect(
      service.getBwaReport({
        companyId: 42,
        year: 2026,
        toMonth: 2,
      }),
    ).rejects.toBe(engineError);
  });

  it('does not mutate the ledger result', async () => {
    const ledgerResult =
      buildLedgerResult();

    const snapshot = JSON.parse(
      JSON.stringify(
        ledgerResult,
      ),
    );

    const service = createBwaReportService({
      ledgerLoader: jest
        .fn()
        .mockResolvedValue(
          ledgerResult,
        ),
    });

    await service.getBwaReport({
      companyId: 42,
      year: 2026,
      toMonth: 2,
    });

    expect(ledgerResult).toEqual(
      snapshot,
    );
  });
});
