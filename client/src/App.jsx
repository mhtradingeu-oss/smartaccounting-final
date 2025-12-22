// HomeRedirect handles "/" route: redirects to /login or /dashboard based on auth
function HomeRedirect() {
  const { status, isAuthenticated } = useAuth();
  if (status === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }
  return <Navigate to="/login" replace />;
}
import ComplianceDashboard from './pages/ComplianceDashboard';
import ErrorBoundary from './components/ErrorBoundary';
import AuditLogs from './pages/AuditLogs';
import GDPRActions from './pages/GDPRActions';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import Layout from './components/Layout';

import ProtectedRoute from './components/ProtectedRoute';
import LoadingSpinner from './components/LoadingSpinner';
import { useAuth } from './context/AuthContext';
import { useCompany } from './context/CompanyContext';

// Pages
import Analytics from './pages/Analytics';
import Dashboard from './pages/Dashboard';
import Invoices from './pages/Invoices';
import InvoiceCreate from './pages/InvoiceCreate';
import InvoiceEdit from './pages/InvoiceEdit';
import BankStatements from './pages/BankStatements';
import BankStatementDetail from './pages/BankStatementDetail';
import Billing from './pages/Billing';
import Companies from './pages/Companies';
import Users from './pages/Users';
import Pricing from './pages/Pricing';
import Login from './pages/Login';
import GermanTaxReports from './pages/GermanTaxReports';
import OnboardingWizard from './pages/OnboardingWizard';
import RBACManagement from './pages/RBACManagement';
import InvestorDashboard from './pages/InvestorDashboard';

// Simple NotFound page
function NotFound() {
  return (
    <div style={{ padding: '4rem', textAlign: 'center' }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 'bold' }}>404 - Page Not Found</h1>
      <p style={{ color: '#888', marginTop: '1rem' }}>The page you are looking for does not exist.</p>
    </div>
  );
}

import './index.css';


function LoginRoute() {
  const { status, isAuthenticated } = useAuth();

  if (status === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Login />;
}


function App() {
  const { activeCompany } = useCompany();

  return (
    <ErrorBoundary>
      <Router>
        <Routes>
          {/* Home route: redirect based on auth */}
          <Route path="/" element={<HomeRedirect />} />
          {/* Public routes */}
          <Route path="/login" element={<LoginRoute />} />
          <Route path="/pricing" element={<Pricing />} />
          {/* SaaS Onboarding */}
          <Route
            path="/onboarding"
            element={
              <ProtectedRoute>
                <Layout>
                  <OnboardingWizard />
                </Layout>
              </ProtectedRoute>
            }
          />
          {/* RBAC Management (admin only) */}
          <Route
            path="/rbac"
            element={
              <ProtectedRoute requiredRole="admin">
                <Layout>
                  <RBACManagement />
                </Layout>
              </ProtectedRoute>
            }
          />
          {/* Investor/Auditor Dashboard */}
          <Route
            path="/investor-dashboard"
            element={
              <ProtectedRoute requiredRole="auditor">
                <Layout>
                  <InvestorDashboard />
                </Layout>
              </ProtectedRoute>
            }
          />
          {/* Analytics, Dashboard, Invoices, InvoiceCreate, InvoiceEdit, BankStatements, BankStatementDetail, Billing, Companies, Users, Pricing, Login, GermanTaxReports, ComplianceDashboard, AuditLogs, GDPRActions, NotFound, etc. */}
          <Route path="/analytics" element={<Analytics />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Layout>
                  <Dashboard />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/invoices"
            element={
              <ProtectedRoute>
                <Layout>
                  <Invoices />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route path="/invoices/create" element={<InvoiceCreate />} />
          <Route
            path="/invoices/:invoiceId/edit"
            element={
              <ProtectedRoute>
                <Layout>
                  <InvoiceEdit />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/bank-statements"
            element={
              <ProtectedRoute>
                <Layout>
                  <BankStatements />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/bank-statements/:statementId"
            element={
              <ProtectedRoute>
                <Layout>
                  <BankStatementDetail />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/billing"
            element={
              <ProtectedRoute>
                <Layout>
                  <Billing />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/german-tax-reports/*"
            element={
              <ProtectedRoute>
                <Layout>
                  <GermanTaxReports key={activeCompany?.id || 'no-company'} />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/companies"
            element={
              <ProtectedRoute>
                <Layout>
                  <Companies />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/users"
            element={
              <ProtectedRoute requiredRole="admin">
                <Layout>
                  <Users />
                </Layout>
              </ProtectedRoute>
            }
          />
          {/* Compliance & Audit routes */}
          <Route
            path="/compliance"
            element={
              <ProtectedRoute requiredRole="admin">
                <Layout>
                  <ComplianceDashboard />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/audit-logs"
            element={
              <ProtectedRoute requiredRole="admin">
                <Layout>
                  <AuditLogs />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/gdpr-actions"
            element={
              <ProtectedRoute>
                <Layout>
                  <GDPRActions />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/compliance-dashboard"
            element={
              <ProtectedRoute requiredRole="admin">
                <Navigate to="/compliance" replace />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
