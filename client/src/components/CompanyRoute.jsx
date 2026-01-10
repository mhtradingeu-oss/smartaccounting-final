import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { isSystemAdmin } from '../lib/systemAdmin';

const CompanyRoute = ({ children }) => {
  const { user } = useAuth();

  if (isSystemAdmin(user)) {
    return <Navigate to="/system-admin" replace />;
  }

  return children;
};

export default CompanyRoute;
