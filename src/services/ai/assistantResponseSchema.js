const { z } = require('zod');

const assistantResponseSchema = z
  .object({
    summary: z.string().min(1),
    risks: z.array(z.string()),
    requiredActions: z.array(z.string()),
    dataGaps: z.array(z.string()),
    confidence: z.union([
      z.literal(null),
      z.enum(['estimated-low', 'estimated-medium', 'estimated-high']),
    ]),
  })
  .passthrough();

const validateAssistantResponse = (payload) => assistantResponseSchema.safeParse(payload);

module.exports = { assistantResponseSchema, validateAssistantResponse };
