import { Routes, Route, Navigate } from 'react-router-dom';

import Dashboard from './pages/Dashboard';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Companies from './pages/Companies';
import AiHub from './pages/ai-hub/AiHub';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';
import ProtectedRoute from './components/ProtectedRoute';
import { useAuth } from './context/AuthContext';
import { useCompany } from './context/CompanyContext';

function PublicOnlyRoute({ children }) {
  const { isAuthenticated, status } = useAuth();

  if (status === 'checking') {
    return children;
  }

  return isAuthenticated ? <Navigate to="/dashboard" replace /> : children;
}

function DashboardRoute() {
  const { activeCompany } = useCompany();

  if (!activeCompany) {
    return <Navigate to="/companies" replace />;
  }

  return <Dashboard />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />

      <Route
        path="/login"
        element={
          <PublicOnlyRoute>
            <Login />
          </PublicOnlyRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardRoute />
          </ProtectedRoute>
        }
      />

      <Route
        path="/companies"
        element={
          <ProtectedRoute>
            <Companies />
          </ProtectedRoute>
        }
      />
      <Route
        path="/ai"
        element={
          <ProtectedRoute>
            <AiHub />
          </ProtectedRoute>
        }
      />
      <Route
        path="/ai-hub"
        element={
          <ProtectedRoute>
            <AiHub />
          </ProtectedRoute>
        }
      />
      <Route path="/terms" element={<Terms />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default AppRoutes;
