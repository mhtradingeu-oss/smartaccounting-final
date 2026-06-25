const {
  getGermanAccountingKnowledgeContract,
  listGermanAccountingKnowledgeAreaIds,
  findGermanAccountingKnowledgeArea,
} = require('../../src/services/ai/germanAccountingKnowledgeContract');

describe('German accounting knowledge contract', () => {
  it('defines a Germany-scoped evidence-based advisory knowledge contract', () => {
    const contract = getGermanAccountingKnowledgeContract();

    expect(contract).toMatchObject({
      version: expect.any(String),
      scope: expect.objectContaining({
        jurisdiction: 'Germany',
        mode: 'evidence_based_advisory',
      }),
    });

    expect(contract.scope.bindingAdvicePolicy).toContain('Steuerberater');
    expect(contract.scope.sourceOfTruthPolicy).toContain('posted journal entries');
  });

  it('covers the required German accounting knowledge areas', () => {
    expect(listGermanAccountingKnowledgeAreaIds()).toEqual(
      expect.arrayContaining([
        'gobd',
        'ustg_vat',
        'datev',
        'hgb_bookkeeping',
        'posting_truth',
        'daily_operations',
      ]),
    );
  });

  it('keeps each knowledge area tied to evidence and escalation limits', () => {
    const contract = getGermanAccountingKnowledgeContract();

    for (const area of contract.knowledgeAreas) {
      expect(area.id).toEqual(expect.any(String));
      expect(area.topics.length).toBeGreaterThan(0);
      expect(area.systemEvidence.length).toBeGreaterThan(0);
      expect(area.assistantUse.length).toBeGreaterThan(0);
      expect(area.mustEscalate.length).toBeGreaterThan(0);
    }
  });

  it('captures VAT and GoBD specific boundaries', () => {
    expect(findGermanAccountingKnowledgeArea('ustg_vat')).toMatchObject({
      label: 'UStG / Umsatzsteuer / VAT review',
      topics: expect.arrayContaining(['UStG §14 invoice readiness', 'UStG §15 input VAT review']),
      mustEscalate: expect.arrayContaining(['UStVA filing', 'VAT payment decisions']),
    });

    expect(findGermanAccountingKnowledgeArea('gobd')).toMatchObject({
      label: 'GoBD traceability and audit trail',
      mustEscalate: expect.arrayContaining(['certifying GoBD compliance']),
    });

    expect(findGermanAccountingKnowledgeArea('unknown')).toBeNull();
  });
});
