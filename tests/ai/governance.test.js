const aiReadGateway = require('../../src/services/ai/aiReadGateway');
const auditLogger = require('../../src/services/ai/aiAuditLogger');
const promptRegistry = require('../../src/services/ai/promptRegistry');
const { Company } = require('../../src/models');
describe('AI Governance Gateway', () => {
  let user;
  let companyId;
  let requestId;
  let baseInput;

  beforeEach(() => {
    jest.clearAllMocks();

    user = {
      id: global.testUser.id,
      companyId: global.testCompany.id,
      role: global.testUser.role,
    };

    companyId = global.testCompany.id;
    requestId = 'req-123';

    baseInput = {
      user,
      companyId,
      requestId,
      purpose: 'monthly_overview',
      policyVersion: '10.0.0',
      promptKey: 'insights_list',
      params: { prompt: 'Show me insights' },
    };

    jest.spyOn(auditLogger, 'logRequested').mockImplementation(jest.fn());
    jest.spyOn(auditLogger, 'logRejected').mockImplementation(jest.fn());
    jest.spyOn(auditLogger, 'logResponded').mockImplementation(jest.fn());

    jest.spyOn(promptRegistry, 'getPromptMeta').mockImplementation(() => ({
      policyVersion: '10.0.0',
      modelVersion: 'test-model',
      handler: async () => ({
        summary: 'Test summary',
      }),
    }));
  });

  it('can see test company in DB', async () => {
    const found = await Company.findByPk(global.testCompany.id);
    expect(found).toBeDefined();
    expect(found.id).toBe(global.testCompany.id);
  });

  it('fails closed if purpose or policyVersion missing', async () => {
    const r1 = await aiReadGateway({ ...baseInput, purpose: undefined });
    expect([400, 403]).toContain(r1.status);

    const r2 = await aiReadGateway({ ...baseInput, policyVersion: undefined });
    expect([400, 403]).toContain(r2.status);

    expect(auditLogger.logRejected).toHaveBeenCalled();
  });

  it('blocks mutation intent prompts', async () => {
    const result = await aiReadGateway({
      ...baseInput,
      params: { prompt: 'Delete all invoices' },
    });

    expect(result.status).toBeGreaterThanOrEqual(400);
    expect(result.body.error).toMatch(/Mutation/i);
    expect(auditLogger.logRejected).toHaveBeenCalled();
  });

  it('response includes required contract fields', async () => {
    const result = await aiReadGateway(baseInput);

    expect(result.status).toBe(200);
    expect(result.body).toHaveProperty('requestId', requestId);
    expect(result.body).toHaveProperty('disclaimer');
    expect(result.body).toHaveProperty('policyVersion', '10.0.0');
    expect(result.body).toHaveProperty('modelVersion');
    expect(result.body).toHaveProperty('data');
    expect(auditLogger.logRequested).toHaveBeenCalled();
  });

  it('logger receives redacted payload', async () => {
    const piiPrompt =
      'Contact john.doe@email.com or call +491234567890. IBAN DE89370400440532013000.';

    await aiReadGateway({
      ...baseInput,
      params: { prompt: piiPrompt },
    });

    const call = auditLogger.logRequested.mock.calls[0][0];

    expect(call).toBeDefined();
    expect(call.prompt).toBeDefined();

    expect(call.prompt).not.toMatch(/john\.doe@email\.com/);
    expect(call.prompt).not.toMatch(/\+491234567890/);
    expect(call.prompt).not.toMatch(/DE89370400440532013000/);

    expect(call.prompt).toMatch(/\[REDACTED_EMAIL\]/);
    expect(call.prompt).toMatch(/\[REDACTED_PHONE\]/);
    expect(call.prompt).toMatch(/\[REDACTED_IBAN\]/);
  });

  it('returns non-200 and logs rejection when handler throws', async () => {
    jest.spyOn(promptRegistry, 'getPromptMeta').mockImplementation(() => ({
      policyVersion: '10.0.0',
      modelVersion: 'test-model',
      handler: async () => {
        throw new Error('Handler failure');
      },
    }));

    const result = await aiReadGateway(baseInput);

    expect(result.status).toBe(500);
    expect(result.body).toMatchObject({
      errorCode: 'AI_HANDLER_ERROR',
      message: 'Handler failure',
      requestId,
    });
    expect(auditLogger.logRejected).toHaveBeenCalled();
    expect(auditLogger.logRequested).not.toHaveBeenCalled();
    expect(auditLogger.logResponded).not.toHaveBeenCalled();
  });
});
