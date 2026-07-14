jest.mock(
  '../../src/services/enterprise/event-core/unifiedEventBus',
  () => ({
    emitUnified: jest.fn(),
  }),
);

const {
  emitUnified,
} = require('../../src/services/enterprise/event-core/unifiedEventBus');
const {
  eventGateway,
} = require('../../src/services/enterprise/event-gateway/eventGateway');

describe('enterprise event gateway persistence failures', () => {
  it('retries an event after persistence fails instead of deduping the failed attempt', async () => {
    const type = 'execution.started';
    const entityId = `approval-retry-${Date.now()}`;
    const payload = { entityId };
    const context = {
      companyId: `company-retry-${Date.now()}`,
      entityType: 'ApprovalQueue',
      entityId,
      correlationId: `correlation-retry-${Date.now()}`,
    };

    emitUnified
      .mockRejectedValueOnce(new Error('EventStore unavailable'))
      .mockResolvedValueOnce({ type, payload });

    await expect(
      eventGateway(type, payload, context),
    ).rejects.toThrow('EventStore unavailable');

    await expect(
      eventGateway(type, payload, context),
    ).resolves.toMatchObject({
      success: true,
      event: { type },
    });

    expect(emitUnified).toHaveBeenCalledTimes(2);
  });
});
