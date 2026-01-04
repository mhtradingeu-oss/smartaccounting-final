
const { User, Company, Invoice, Expense, FileAttachment, AuditLog } = require('../models');
const AuditLogService = require('./auditLogService');
const { Op } = require('sequelize');


// RBAC utility: isAdmin, isSelf, sameCompany
function isAdmin(user) {
  return user && user.role === 'admin';
}
function isSelf(requestingUser, targetUser) {
  return requestingUser && targetUser && requestingUser.id === targetUser.id;
}
function sameCompany(requestingUser, targetUser) {
  return requestingUser && targetUser && requestingUser.companyId === targetUser.companyId;
}

/**
 * Export user data for GDPR compliance.
 * @param {Object} requestingUser - The user making the request
 * @param {number} targetUserId - The user whose data is being exported
 * @returns {Promise<Object>} Structured export
 */
async function exportUserData(requestingUser, targetUserId) {
  const targetUser = await User.findByPk(targetUserId);
  if (!targetUser) {
    const error = new Error('User not found');
    error.status = 404;
    throw error;
  }
  // RBAC: self or admin in same company
  if (!isSelf(requestingUser, targetUser) && !(isAdmin(requestingUser) && sameCompany(requestingUser, targetUser))) {
    const error = new Error('Forbidden');
    error.status = 403;
    throw error;
  }

  // User PII: only if self or admin
  const userExport = {
    id: targetUser.id,
    email: isSelf(requestingUser, targetUser) || isAdmin(requestingUser) ? targetUser.email : undefined,
    firstName: isSelf(requestingUser, targetUser) || isAdmin(requestingUser) ? targetUser.firstName : undefined,
    lastName: isSelf(requestingUser, targetUser) || isAdmin(requestingUser) ? targetUser.lastName : undefined,
    role: targetUser.role,
    isAnonymized: targetUser.isAnonymized,
    anonymizedAt: targetUser.anonymizedAt,
    companyId: targetUser.companyId,
  };

  // Company memberships
  const company = targetUser.companyId ? await Company.findByPk(targetUser.companyId) : null;

  // Invoices created/owned by user
  const invoices = await Invoice.findAll({ where: { userId: targetUser.id } });

  // Expenses created by user
  const expenses = await Expense.findAll({ where: { createdByUserId: targetUser.id } });

  // File attachments linked to those records
  const invoiceIds = invoices.map(inv => inv.id);
  const expenseIds = expenses.map(exp => exp.id);
  const attachments = await FileAttachment.findAll({
    where: {
      [Op.or]: [
        { invoiceId: { [Op.in]: invoiceIds } },
        { expenseId: { [Op.in]: expenseIds } },
        { uploadedBy: targetUser.id },
      ],
    },
  });

  // Audit logs related to user (if allowed)
  let auditLogs = [];
  if (isSelf(requestingUser, targetUser) || isAdmin(requestingUser)) {
    auditLogs = await AuditLog.findAll({ where: { userId: targetUser.id } });
  }

  const exportPayload = {
    user: userExport,
    company,
    invoices,
    expenses,
    attachments,
    auditLogs,
  };

  await logGdprExport({
    requestingUser,
    targetUser,
    invoices,
    expenses,
    attachments,
  });

  return exportPayload;
}

async function logGdprExport({ requestingUser, targetUser, invoices, expenses, attachments }) {
  await AuditLogService.appendEntry({
    action: 'GDPR_EXPORT_USER_DATA',
    resourceType: 'User',
    resourceId: String(targetUser.id),
    userId: requestingUser.id,
    oldValues: null,
    newValues: {
      exported: {
        invoices: invoices.length,
        expenses: expenses.length,
        attachments: attachments.length,
      },
    },
    reason: 'GDPR user data export',
  });
}

/**
 * Anonymize a user for GDPR compliance (strict RBAC, audit log required).
 * @param {Object} requestingUser - The user making the request
 * @param {number} targetUserId - The user to anonymize
 * @param {string} reason - Reason for anonymization (required)
 * @returns {Promise<User>}
 */
async function anonymizeUser(requestingUser, targetUserId, reason) {
  if (!reason || typeof reason !== 'string' || !reason.trim()) {
    const error = new Error('Reason is required');
    error.status = 400;
    throw error;
  }
  const targetUser = await User.findByPk(targetUserId);
  if (!targetUser) {
    const error = new Error('User not found');
    error.status = 404;
    throw error;
  }
  // RBAC: self or admin in same company
  if (!isSelf(requestingUser, targetUser) && !(isAdmin(requestingUser) && sameCompany(requestingUser, targetUser))) {
    const error = new Error('Forbidden');
    error.status = 403;
    throw error;
  }
  if (targetUser.isAnonymized) {
    const error = new Error('User already anonymized');
    error.status = 400;
    throw error;
  }
  // Save old values for audit (no PII)
  const oldValues = { isAnonymized: targetUser.isAnonymized, anonymizedAt: targetUser.anonymizedAt };
  // Deterministic anonymized email
  const anonymizedEmail = `anonymized+${targetUser.id}@example.invalid`;
  const now = new Date();
  // Anonymize fields
  targetUser.email = anonymizedEmail;
  targetUser.firstName = 'Anonymized';
  targetUser.lastName = 'User';
  targetUser.isAnonymized = true;
  targetUser.anonymizedAt = now;
  await targetUser.save();
  // Write audit log (operation fails if audit log fails)
    await AuditLogService.appendEntry({
      action: 'GDPR_ANONYMIZE_USER',
      resourceType: 'User',
      resourceId: String(targetUser.id),
      userId: requestingUser.id,
      oldValues,
      newValues: { isAnonymized: true, anonymizedAt: now },
      reason: 'GDPR user anonymization',
    });
  return targetUser;
}

module.exports = {
  exportUserData,
  anonymizeUser,
};
