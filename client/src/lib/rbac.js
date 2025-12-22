// Centralized RBAC helpers for frontend UI
// Usage: import { canEditUsers, canEditInvoices, ... } from './rbac';
import { USER_ROLES } from './constants';

export function canEditUsers(role) {
  return role === USER_ROLES.ADMIN;
}

export function canEditInvoices(role) {
  return role === USER_ROLES.ADMIN || role === USER_ROLES.ACCOUNTANT;
}

export function canManageCompany(role) {
  return role === USER_ROLES.ADMIN || role === USER_ROLES.ACCOUNTANT;
}

export function canViewAuditLogs(role) {
  // All roles except VIEWER can view audit logs
  return role !== USER_ROLES.VIEWER;
}

export function isReadOnlyRole(role) {
  return role === USER_ROLES.AUDITOR || role === USER_ROLES.VIEWER || role === USER_ROLES.INVESTOR;
}

export function readOnlyBannerMode(role) {
  if (role === USER_ROLES.AUDITOR) { return 'Auditor'; }
    if (role === USER_ROLES.INVESTOR) { return 'Investor'; }
    if (role === USER_ROLES.VIEWER) { return 'Viewer'; }
    return null;
}
