// LandingRoute shows the marketing hero for visitors and redirects authenticated users to /dashboard.
function LandingRoute() {
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

  return <Landing />;
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
import Expenses from './pages/Expenses';
import ExpensesCreate from './pages/ExpensesCreate';
import BankStatements from './pages/BankStatements';
import BankStatementPreview from './pages/BankStatementPreview';
import OCRPreview from './pages/OCRPreview';
import BankStatementImport from './pages/BankStatementImport';
import BankStatementDetail from './pages/BankStatementDetail';
import BankStatementReconciliationPreview from './pages/BankStatementReconciliationPreview';
import Billing from './pages/Billing';
import Companies from './pages/Companies';
import Users from './pages/Users';
import Pricing from './pages/Pricing';
import Login from './pages/Login';
import GermanTaxReports from './pages/GermanTaxReports';
import OnboardingWizard from './pages/OnboardingWizard';
import RBACManagement from './pages/RBACManagement';
import InvestorDashboard from './pages/InvestorDashboard';
import Landing from './pages/Landing';
import RequestAccess from './pages/RequestAccess';
import AIInsights from './pages/AIInsights';

// Simple NotFound page
function NotFound() {
  return (
    <div style={{ padding: '4rem', textAlign: 'center' }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 'bold' }}>404 - Page Not Found</h1>
      <p style={{ color: '#888', marginTop: '1rem' }}>
        The page you are looking for does not exist.
      </p>
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

export const AppRoutes = () => {
  const { activeCompany } = useCompany();

  return (
    <Routes>
      {/* Landing route: marketing experience for visitors */}
      <Route path="/" element={<LandingRoute />} />
      {/* Public routes */}
      <Route path="/login" element={<LoginRoute />} />
      <Route path="/pricing" element={<Pricing />} />
      <Route path="/request-access" element={<RequestAccess />} />
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
        path="/ai-advisor"
        element={
          <ProtectedRoute>
            <Layout>
              <AIInsights />
            </Layout>
          </ProtectedRoute>
        }
      />
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
      <Route
        path="/expenses"
        element={
          <ProtectedRoute>
            <Layout>
              <Expenses />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/expenses/create"
        element={
          <ProtectedRoute>
            <Layout>
              <ExpensesCreate />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/invoices/create"
        element={
          <ProtectedRoute>
            <Layout>
              <InvoiceCreate />
            </Layout>
          </ProtectedRoute>
        }
      />
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
        path="/bank-statements/preview"
        element={
          <ProtectedRoute>
            <Layout>
              <BankStatementPreview />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/ocr-preview"
        element={
          <ProtectedRoute>
            <Layout>
              <OCRPreview />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/bank-statements/import"
        element={
          <ProtectedRoute>
            <Layout>
              <BankStatementImport />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/bank-statements/:statementId/reconciliation-preview"
        element={
          <ProtectedRoute requiredRole="accountant">
            <Layout>
              <BankStatementReconciliationPreview />
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
  );
};

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <AppRoutes />
      </Router>
    </ErrorBoundary>
  );
}

export default App;
