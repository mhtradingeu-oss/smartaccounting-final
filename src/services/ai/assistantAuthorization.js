const ALLOWED_ASSISTANT_ROLES = new Set(['admin', 'accountant']);

const isAssistantRoleAllowed = (role) => ALLOWED_ASSISTANT_ROLES.has(role);

module.exports = {
  ALLOWED_ASSISTANT_ROLES,
  isAssistantRoleAllowed,
};
