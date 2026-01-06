// Contract for AI Decision POST body
module.exports = {
  type: 'object',
  required: ['decision'],
  properties: {
    decision: {
      type: 'string',
      enum: ['accepted', 'rejected', 'ignored'],
    },
    reason: {
      type: 'string',
      minLength: 3,
    },
  },
  allOf: [
    {
      if: {
        properties: { decision: { const: 'rejected' } },
      },
      then: {
        required: ['reason'],
      },
    },
  ],
};
