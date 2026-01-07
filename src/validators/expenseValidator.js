const Joi = require('joi');

const expenseSchema = Joi.object({
  companyId: Joi.number().integer().required().messages({
    'any.required': 'companyId is required',
    'number.base': 'companyId must be a number',
  }),
  createdByUserId: Joi.number().integer().required().messages({
    'any.required': 'createdByUserId is required',
    'number.base': 'createdByUserId must be a number',
  }),
  expenseDate: Joi.date().required().messages({
    'any.required': 'expenseDate is required',
    'date.base': 'expenseDate must be a valid date',
  }),
  currency: Joi.string().length(3).uppercase().required().messages({
    'any.required': 'currency is required',
    'string.length': 'currency must be a 3-letter code',
  }),
  status: Joi.string().valid('draft', 'booked', 'archived').required().messages({
    'any.required': 'status is required',
    'any.only': 'status must be one of draft, booked, archived',
  }),
  source: Joi.string().required().messages({
    'any.required': 'source is required',
  }),
  category: Joi.string().min(3).required().messages({
    'any.required': 'category is required',
    'string.min': 'category must be at least 3 characters',
  }),
  description: Joi.string().min(3).required().messages({
    'any.required': 'description is required',
    'string.min': 'description must be at least 3 characters',
  }),
  netAmount: Joi.number().min(0).required().messages({
    'any.required': 'netAmount is required',
    'number.base': 'netAmount must be a number',
  }),
  vatAmount: Joi.number().min(0).required().messages({
    'any.required': 'vatAmount is required',
    'number.base': 'vatAmount must be a number',
  }),
  grossAmount: Joi.number().min(0).required().messages({
    'any.required': 'grossAmount is required',
    'number.base': 'grossAmount must be a number',
  }),
  vatRate: Joi.number().min(0).max(1).required().messages({
    'any.required': 'vatRate is required',
    'number.base': 'vatRate must be a number',
  }),
  notes: Joi.string().allow('', null).optional(),
  attachments: Joi.array().items(Joi.number().integer()).optional(),
});

module.exports = {
  expenseSchema,
};
