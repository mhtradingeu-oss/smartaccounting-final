const Joi = require('joi');

const expenseSchema = Joi.object({
  vendorName: Joi.string().min(1).required(),
  description: Joi.string().min(3).required(),
  category: Joi.string().min(3).required(),
  netAmount: Joi.number().min(0).optional(),
  grossAmount: Joi.number().min(0).optional(),
  vatRate: Joi.number().min(0).max(1).default(0),
  vatAmount: Joi.number().min(0).optional(),
  expenseDate: Joi.date().optional(),
  companyId: Joi.number().integer().optional(),
  createdByUserId: Joi.number().integer().optional(),
  currency: Joi.string().length(3).uppercase().default('EUR'),
  status: Joi.string().valid('draft', 'booked', 'archived').optional(),
  notes: Joi.string().allow('', null).optional(),
  source: Joi.string().optional(),
  attachments: Joi.array().items(Joi.number().integer()).optional(),
});

module.exports = {
  expenseSchema,
};
