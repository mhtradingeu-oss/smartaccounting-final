import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from './LoadingSpinner';

const ProtectedRoute = ({ children, requiredRole }) => {
  const { user, status, isAuthenticated } = useAuth();
  const isChecking = status === 'checking';
  const location = useLocation();

  if (import.meta.env.VITE_DISABLE_LOGIN === 'true') {
    return children;
  }

  if (isChecking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Hierarchical roles: admin > accountant > auditor > viewer
  const roleHierarchy = ['viewer', 'auditor', 'accountant', 'admin'];
  const userRoleIdx = roleHierarchy.indexOf(user?.role);
  const getRoleIndex = (role) => roleHierarchy.indexOf(role);
  const hasRole = () => {
    if (!requiredRole) {
      return true;
    }
    const requiredRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    return requiredRoles.some((role) => {
      const requiredIdx = getRoleIndex(role);
      if (requiredIdx === -1) {
        return false;
      }
      return userRoleIdx >= requiredIdx;
    });
  };

  if (!hasRole()) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Access Denied</h2>
          <p className="text-gray-600 dark:text-gray-400">
            You don&apos;t have permission to access this page.
          </p>
        </div>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;
