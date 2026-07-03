export { ROUTE_DEFINITIONS } from './AppRoutes';
import React from 'react';

import { AuthProvider, useAuth } from './context/AuthContext';
import { CompanyProvider } from './context/CompanyContext';
import { RoleProvider } from './context/RoleContext';

import AppRoutes from './AppRoutes';

function RoleAwareAppRoutes() {
  const { user } = useAuth();

  return (
    <RoleProvider user={user}>
      <AppRoutes />
    </RoleProvider>
  );
}

function App() {
  return (
    <AuthProvider>
      <CompanyProvider>
        <RoleAwareAppRoutes />
      </CompanyProvider>
    </AuthProvider>
  );
}

export default App;
