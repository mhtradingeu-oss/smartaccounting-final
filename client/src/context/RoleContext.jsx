import React, { createContext, useContext } from 'react';

// Roles: admin, accountant, viewer
export const roles = {
  ADMIN: 'admin',
  ACCOUNTANT: 'accountant',
  VIEWER: 'viewer',
};

const RoleContext = createContext({ role: roles.VIEWER });

export const RoleProvider = ({ user, children }) => {
  // role comes from user object (from AuthContext)
  const role = user?.role || roles.VIEWER;
  return (
    <RoleContext.Provider value={{ role }}>
      {children}
    </RoleContext.Provider>
  );
};

export const useRole = () => {
  const context = useContext(RoleContext);
  if (!context) { throw new Error('useRole must be used within a RoleProvider'); }
  return context;
};
