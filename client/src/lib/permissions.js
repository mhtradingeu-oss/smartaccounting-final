// Centralized permission logic for frontend
// Matches backend RBAC

const ROLES = ['admin', 'accountant', 'auditor', 'viewer'];
const READ_ONLY_ROLES = ['auditor', 'viewer'];

// Define permissions for each action per role
// Example actions: 'view', 'edit', 'delete', 'create', etc.
const PERMISSIONS = {
  view: ['admin', 'accountant', 'auditor', 'viewer'],
  edit: ['admin', 'accountant'],
  delete: ['admin'],
  create: ['admin', 'accountant'],
  export: ['admin', 'accountant', 'auditor'],
  'bank:write': ['admin', 'accountant'],
  'bank:undo': ['admin'],
  // Add more actions as needed
};

function can(action, role, _context) {
  if (!ROLES.includes(role)) {
    return false;
  }
  const allowed = PERMISSIONS[action];
  if (!allowed) {
    return false;
  }
  return allowed.includes(role);
}

function isReadOnlyRole(role) {
  return READ_ONLY_ROLES.includes(role);
}

function explainPermission(action, role) {
  if (!ROLES.includes(role)) {
    return 'Unknown role.';
  }
  if (!PERMISSIONS[action]) {
    return 'Unknown action.';
  }
  const allowed = PERMISSIONS[action];
  if (allowed.length === ROLES.length) {
    return 'All roles can perform this action.';
  }
  if (!allowed.includes(role)) {
    // Only return 'Your role is read-only.' if NO read-only role is allowed for this action
    if (isReadOnlyRole(role) && !allowed.some(r => READ_ONLY_ROLES.includes(r))) {
      return 'Your role is read-only.';
    }
    if (allowed.includes('admin') && allowed.length === 1) {
      return 'This action requires Admin role.';
    }
    if (allowed.includes('accountant') && allowed.length === 1) {
      return 'This action requires Accountant role.';
    }
    if (allowed.includes('auditor') && allowed.length === 1) {
      return 'This action requires Auditor role.';
    }
    if (allowed.includes('viewer') && allowed.length === 1) {
      return 'This action requires Viewer role.';
    }
    if (allowed.includes('admin') && allowed.includes('accountant') && allowed.length === 2) {
      return 'This action requires Admin or Accountant role.';
    }
    return `Allowed roles: ${allowed.join(', ')}.`;
  }
  if (allowed.includes('admin') && allowed.includes('accountant') && allowed.length === 2) {
    return 'This action requires Admin or Accountant role.';
  }
  if (allowed.includes('admin') && allowed.length === 1) {
    return 'This action requires Admin role.';
  }
  if (allowed.includes('accountant') && allowed.length === 1) {
    return 'This action requires Accountant role.';
  }
  if (allowed.includes('auditor') && allowed.length === 1) {
    return 'This action requires Auditor role.';
  }
  if (allowed.includes('viewer') && allowed.length === 1) {
    return 'This action requires Viewer role.';
  }
  return `Allowed roles: ${allowed.join(', ')}.`;
}

export { can, isReadOnlyRole, explainPermission, ROLES, PERMISSIONS };
