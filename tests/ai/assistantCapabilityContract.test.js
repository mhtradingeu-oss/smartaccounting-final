const {
  getAssistantCapabilityContract,
  listAssistantCapabilityIds,
  findAssistantCapability,
} = require('../../src/services/ai/assistantCapabilityContract');

describe('Assistant capability contract', () => {
  it('defines a read-only German accounting assistant capability scope', () => {
    const contract = getAssistantCapabilityContract();

    expect(contract).toMatchObject({
      version: expect.any(String),
      mode: expect.objectContaining({
        mode: 'read_only_advisory',
      }),
    });

    expect(contract.mode.taxPolicy).toContain('Steuerberater');
    expect(contract.mode.evidencePolicy).toContain('Never invent');
  });

  it('covers the core SmartAccounting accounting domains', () => {
    expect(listAssistantCapabilityIds()).toEqual(
      expect.arrayContaining([
        'invoices',
        'expenses',
        'bank_reconciliation',
        'vat',
        'financial_reports',
        'journal_entries',
        'datev_export_readiness',
        'audit_readiness',
        'document_intake',
      ]),
    );
  });

  it('keeps every capability evidence-based and non-mutating', () => {
    const contract = getAssistantCapabilityContract();

    for (const capability of contract.capabilities) {
      expect(capability.id).toEqual(expect.any(String));
      expect(capability.dataSources.length).toBeGreaterThan(0);
      expect(capability.canHelpWith.length).toBeGreaterThan(0);
      expect(capability.mustNotDo.length).toBeGreaterThan(0);
      expect(capability.legalContext.length).toBeGreaterThan(0);
      expect(capability.mustNotDo.join(' ').toLowerCase()).toMatch(
        /create|change|post|file|pay|submit|certify|delete|reconcile|reverse|alter|guarantee|claim|send/,
      );
    }
  });

  it('exposes lookup for individual capabilities', () => {
    expect(findAssistantCapability('vat')).toMatchObject({
      id: 'vat',
      label: 'VAT / Umsatzsteuer',
      legalContext: expect.arrayContaining(['UStG §14', 'UStG §15']),
    });

    expect(findAssistantCapability('unknown')).toBeNull();
  });
});
