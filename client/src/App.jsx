import React from 'react';

import { AuthProvider } from './context/AuthContext';
import { CompanyProvider } from './context/CompanyContext';
import { RoleProvider } from './context/RoleContext';

import AppRoutes from './AppRoutes';

function App() {
  return (
    <AuthProvider>
      <CompanyProvider>
        <RoleProvider>
          <AppRoutes />
        </RoleProvider>
      </CompanyProvider>
    </AuthProvider>
  );
}

export default App;
