const express = require('express');
const bcrypt = require('bcryptjs');
const { body, param } = require('express-validator');
const { User, Company } = require('../models');
const { authenticate, requireRole, requireCompany } = require('../middleware/authMiddleware');
const { validateRequest } = require('../middleware/security');
const AuditLogService = require('../services/auditLogService');

const router = express.Router();

router.use(authenticate);
router.use(requireCompany);

const ALLOWED_ROLES = ['admin', 'accountant', 'auditor', 'viewer'];

const createUserValidators = [
  body('email').isEmail().withMessage('Valid email required').normalizeEmail(),
  body('firstName')
    .isString()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Invalid first name'),
  body('lastName').isString().trim().isLength({ min: 2, max: 50 }).withMessage('Invalid last name'),
  body('password')
    .isString()
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  body('role').optional().isIn(ALLOWED_ROLES).withMessage('Invalid role'),
];

const updateUserValidators = [
  param('userId').isInt().withMessage('Invalid user id'),
  body('role').optional().isIn(ALLOWED_ROLES).withMessage('Invalid role'),
  body('isActive').optional().isBoolean().withMessage('isActive must be boolean').toBoolean(),
];

const normalizeEmail = (email) => (email || '').toLowerCase().trim();

router.get('/', requireRole(['admin']), async (req, res, next) => {
  try {
    const users = await User.findAll({
      where: { companyId: req.companyId },
      include: [
        {
          model: Company,
          as: 'company',
          attributes: ['id', 'name'],
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    res.json({ users });
  } catch (error) {
    next(error);
  }
});

router.post(
  '/',
  requireRole(['admin']),
  validateRequest(createUserValidators),
  async (req, res, next) => {
    try {
      const { firstName, lastName, role } = req.body;
      const email = normalizeEmail(req.body.email);
      const password = req.body.password;

      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        return res.status(400).json({ error: 'User with this email already exists' });
      }

      const hashedPassword = await bcrypt.hash(password, 12);

      const user = await User.create({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email,
        password: hashedPassword,
        role: role || 'viewer',
        companyId: req.companyId,
        isActive: true,
      });

      const userResponse = user.toJSON();
      delete userResponse.password;

      res.status(201).json({
        message: 'User created successfully',
        user: userResponse,
      });
    } catch (error) {
      next(error);
    }
  },
);

router.put(
  '/:userId',
  requireRole(['admin']),
  validateRequest(updateUserValidators),
  async (req, res, next) => {
    try {
      const { userId } = req.params;
      const user = await User.findOne({
        where: {
          id: userId,
          companyId: req.companyId,
        },
      });

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const updates = {};
      if (req.body.role) {
        updates.role = req.body.role;
      }
      if (Object.prototype.hasOwnProperty.call(req.body, 'isActive')) {
        updates.isActive = req.body.isActive;
      }

      if (!Object.keys(updates).length) {
        return res.status(400).json({ error: 'No updatable fields provided' });
      }

      const before = { role: user.role, isActive: user.isActive };
      await user.update(updates);
      const after = { role: user.role, isActive: user.isActive };
      const actorUserId = req.user.id;
      const companyId = req.companyId;
      if (updates.role && before.role !== after.role) {
        await AuditLogService.appendEntry({
          action: 'ROLE_CHANGED',
          resourceType: 'User',
          resourceId: userId,
          userId: actorUserId,
          companyId,
          oldValues: { role: before.role },
          newValues: { role: after.role },
          reason: 'Admin updated user role',
        });
      }
      if (
        Object.prototype.hasOwnProperty.call(updates, 'isActive') &&
        before.isActive !== after.isActive
      ) {
        await AuditLogService.appendEntry({
          action: 'USER_STATUS_CHANGED',
          resourceType: 'User',
          resourceId: userId,
          userId: actorUserId,
          companyId,
          oldValues: { isActive: before.isActive },
          newValues: { isActive: after.isActive },
          reason: 'Admin toggled user active flag',
        });
      }
      const userResponse = user.toJSON();
      delete userResponse.password;
      res.json({
        message: 'User updated successfully',
        user: userResponse,
      });
    } catch (error) {
      next(error);
    }
  },
);

router.delete('/:userId', requireRole(['admin']), async (req, res, next) => {
  try {
    const { userId } = req.params;
    const reason = (req.body?.reason || req.query?.reason || 'GDPR privacy rules').trim();

    const user = await User.findOne({
      where: {
        id: userId,
        companyId: req.companyId,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.id === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    await AuditLogService.appendEntry({
      action: 'USER_DELETE_BLOCKED',
      resourceType: 'User',
      resourceId: String(user.id),
      userId: req.user.id,
      oldValues: { isActive: user.isActive },
      newValues: { blocked: true, reason },
      reason: reason || 'Prohibited GDPR user deletion',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.status(405).json({
      error:
        'User deletion is prohibited for GDPR compliance; anonymize via POST /api/gdpr/anonymize-user with a documented reason instead.',
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
