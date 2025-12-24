const express = require('express');
const { body, param } = require('express-validator');
const { Op } = require('sequelize');
const { Company } = require('../models');
const AuditLogService = require('../services/auditLogService');
const { authenticate, requireRole, requireCompany } = require('../middleware/authMiddleware');
const { validateRequest } = require('../middleware/security');
const { getPagination, buildPaginationMeta } = require('../utils/pagination');

const router = express.Router();

const companyUpdateValidators = [
  param('companyId').isInt().withMessage('Invalid company id'),
  body('name').optional().isString().trim().isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 chars'),
  body('address').optional().isString().trim().isLength({ min: 5, max: 255 }).withMessage('Address must be 5-255 chars'),
  body('city').optional().isString().trim().isLength({ min: 2, max: 100 }).withMessage('City must be 2-100 chars'),
  body('postalCode').optional().isString().trim().isLength({ min: 2, max: 20 }).withMessage('Postal code must be 2-20 chars'),
  body('country').optional().isString().trim().isLength({ min: 2, max: 100 }).withMessage('Country must be 2-100 chars'),
];

const sanitizeStringValue = (value) => (typeof value === 'string' ? value.trim() : value);

router.get('/', authenticate, requireCompany, async (req, res, next) => {
  try {
    const pagination = getPagination(req.query);
    const filters = [];
    if (req.user.companyId) {
      filters.push({ id: req.user.companyId });
    }
    if (req.user.id) {
      filters.push({ userId: req.user.id });
    }

    if (!filters.length) {
      return res.json({
        companies: [],
        pagination: buildPaginationMeta({
          total: 0,
          ...pagination,
        }),
      });
    }

    const companies = await Company.findAndCountAll({
      where: {
        [Op.or]: filters,
      },
      order: [['name', 'ASC']],
      limit: pagination.limit,
      offset: pagination.offset,
    });

    res.json({
      companies: companies.rows,
      pagination: buildPaginationMeta({
        total: companies.count,
        ...pagination,
      }),
    });
  } catch (error) {
    next(error);
  }
});

router.put(
  '/:companyId',
  authenticate,
  requireCompany,
  requireRole(['admin']),
  validateRequest(companyUpdateValidators),
  async (req, res, next) => {
    try {
      const { companyId } = req.params;
      const company = await Company.findByPk(companyId);

      if (!company) {
        return res.status(404).json({ error: 'Company not found' });
      }

      const isOwner = company.userId === req.user.id;
      const isMember = company.id === req.user.companyId;
      if (!isOwner && !isMember) {
        return res.status(403).json({ error: 'You do not manage this company' });
      }

      const updatableFields = ['name', 'address', 'city', 'postalCode', 'country'];
      const updates = updatableFields.reduce((acc, key) => {
        if (Object.prototype.hasOwnProperty.call(req.body, key)) {
          const value = sanitizeStringValue(req.body[key]);
          if (value || value === '') {
            acc[key] = value;
          }
        }
        return acc;
      }, {});

      if (!Object.keys(updates).length) {
        return res.status(400).json({ error: 'No valid fields provided for update' });
      }

      const before = {
        name: company.name,
        address: company.address,
        city: company.city,
        postalCode: company.postalCode,
        country: company.country,
      };
      await company.update(updates);
      const after = {
        name: company.name,
        address: company.address,
        city: company.city,
        postalCode: company.postalCode,
        country: company.country,
      };
      const actorUserId = req.user.id;
      // Use company.id directly, do not redeclare companyId
      if (JSON.stringify(before) !== JSON.stringify(after)) {
        await AuditLogService.appendEntry({
          action: 'COMPANY_UPDATED',
          resourceType: 'Company',
          resourceId: company.id,
          userId: actorUserId,
          companyId: company.id,
          oldValues: before,
          newValues: after,
          reason: 'Company metadata update',
        });
      }
      res.json({
        message: 'Company details updated',
        company,
      });
    } catch (error) {
      next(error);
    }
  },
);

module.exports = router;
