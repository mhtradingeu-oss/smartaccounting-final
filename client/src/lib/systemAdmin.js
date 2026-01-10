export const isSystemAdmin = (user) => {
  if (!user) {
    return false;
  }
  const hasNoCompany = user.companyId === null || user.companyId === undefined;
  return user.role === 'admin' && hasNoCompany;
};

export const getDefaultRouteForUser = (user) => (isSystemAdmin(user) ? '/system-admin' : '/dashboard');
