const Joi = require('joi');

export const userSchemas = {
  register: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required(),
    firstName: Joi.string().min(2).max(50).required(),
    lastName: Joi.string().min(2).max(50).required(),
    role: Joi.string().valid('admin', 'accountant', 'auditor', 'viewer').default('viewer'),
    companyId: Joi.string().uuid().optional(),
  }),

  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
  }),

  update: Joi.object({
    firstName: Joi.string().min(2).max(50).optional(),
    lastName: Joi.string().min(2).max(50).optional(),
    email: Joi.string().email().optional(),
    role: Joi.string().valid('admin', 'accountant', 'auditor', 'viewer').optional(),
  }),
};

export const companySchemas = {
  create: Joi.object({
    name: Joi.string().min(2).max(100).required(),
    taxId: Joi.string().min(5).max(20).required(),
    address: Joi.string().min(10).max(200).required(),
    email: Joi.string().email().required(),
    phone: Joi.string().min(10).max(20).optional(),
  }),

  update: Joi.object({
    name: Joi.string().min(2).max(100).optional(),
    taxId: Joi.string().min(5).max(20).optional(),
    address: Joi.string().min(10).max(200).optional(),
    email: Joi.string().email().optional(),
    phone: Joi.string().min(10).max(20).optional(),
  }),
};

export const invoiceSchemas = {
  create: Joi.object({
    invoiceNumber: Joi.string().optional(),
    customerId: Joi.string().uuid().required(),
    amount: Joi.number().positive().required(),
    vatAmount: Joi.number().min(0).required(),
    dueDate: Joi.date().required(),
    items: Joi.array()
      .items(
        Joi.object({
          description: Joi.string().required(),
          quantity: Joi.number().positive().required(),
          unitPrice: Joi.number().positive().required(),
          vatRate: Joi.number().min(0).max(1).required(),
        }),
      )
      .min(1)
      .required(),
  }),
};
