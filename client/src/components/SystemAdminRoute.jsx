import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { isSystemAdmin } from '../lib/systemAdmin';

const SystemAdminRoute = ({ children }) => {
  const { user } = useAuth();

  if (!isSystemAdmin(user)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default SystemAdminRoute;
