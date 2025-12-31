import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import LoadingSpinner from './components/LoadingSpinner';
import ErrorBoundary from './components/ErrorBoundary';
import { PageLoadingState } from './components/ui/PageStates';
import { useAuth } from './context/AuthContext';
import { useCompany } from './context/CompanyContext';

const withSuspense = (children) => (
  <Suspense fallback={<PageLoadingState />}>{children}</Suspense>
);

const Landing = lazy(() => import('./pages/Landing'));
const Login = lazy(() => import('./pages/Login'));
const Pricing = lazy(() => import('./pages/Pricing'));
const RequestAccess = lazy(() => import('./pages/RequestAccess'));
const OnboardingWizard = lazy(() => import('./pages/OnboardingWizard'));
const RBACManagement = lazy(() => import('./pages/RBACManagement'));
const InvestorDashboard = lazy(() => import('./pages/InvestorDashboard'));
const ComplianceDashboard = lazy(() => import('./pages/ComplianceDashboard'));
const AuditLogs = lazy(() => import('./pages/AuditLogs'));
const GDPRActions = lazy(() => import('./pages/GDPRActions'));
const Analytics = lazy(() => import('./pages/Analytics'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Invoices = lazy(() => import('./pages/Invoices'));
const InvoiceCreate = lazy(() => import('./pages/InvoiceCreate'));
const InvoiceEdit = lazy(() => import('./pages/InvoiceEdit'));
const Expenses = lazy(() => import('./pages/Expenses'));
const ExpensesCreate = lazy(() => import('./pages/ExpensesCreate'));
const BankStatements = lazy(() => import('./pages/BankStatements'));
const BankStatementPreview = lazy(() => import('./pages/BankStatementPreview'));
const OCRPreview = lazy(() => import('./pages/OCRPreview'));
const BankStatementImport = lazy(() => import('./pages/BankStatementImport'));
const BankStatementDetail = lazy(() => import('./pages/BankStatementDetail'));
const BankStatementReconciliationPreview = lazy(
  () => import('./pages/BankStatementReconciliationPreview'),
);
const Billing = lazy(() => import('./pages/Billing'));
const Companies = lazy(() => import('./pages/Companies'));
const Users = lazy(() => import('./pages/Users'));
const GermanTaxReports = lazy(() => import('./pages/GermanTaxReports'));
const AIInsights = lazy(() => import('./pages/AIInsights'));
const AIAssistant = lazy(() => import('./pages/AIAssistant'));

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

  return withSuspense(<Landing />);
}

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

  return withSuspense(<Login />);
}

export const AppRoutes = () => {
  const { activeCompany } = useCompany();

  return (
    <Routes>
      <Route path="/" element={<LandingRoute />} />
      <Route path="/login" element={<LoginRoute />} />
      <Route path="/pricing" element={withSuspense(<Pricing />)} />
      <Route path="/request-access" element={withSuspense(<RequestAccess />)} />
      <Route
        path="/onboarding"
        element={
          <ProtectedRoute>
            <Layout>{withSuspense(<OnboardingWizard />)}</Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/rbac"
        element={
          <ProtectedRoute requiredRole="admin">
            <Layout>{withSuspense(<RBACManagement />)}</Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/investor-dashboard"
        element={
          <ProtectedRoute requiredRole="auditor">
            <Layout>{withSuspense(<InvestorDashboard />)}</Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/analytics"
        element={
          <ProtectedRoute>
            <Layout>{withSuspense(<Analytics />)}</Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/ai-advisor"
        element={
          <ProtectedRoute>
            <Layout>{withSuspense(<AIInsights />)}</Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/ai-assistant"
        element={
          <ProtectedRoute>
            <Layout>{withSuspense(<AIAssistant />)}</Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Layout>{withSuspense(<Dashboard />)}</Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/invoices"
        element={
          <ProtectedRoute>
            <Layout>{withSuspense(<Invoices />)}</Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/expenses"
        element={
          <ProtectedRoute>
            <Layout>{withSuspense(<Expenses />)}</Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/expenses/create"
        element={
          <ProtectedRoute>
            <Layout>{withSuspense(<ExpensesCreate />)}</Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/invoices/create"
        element={
          <ProtectedRoute>
            <Layout>{withSuspense(<InvoiceCreate />)}</Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/invoices/:invoiceId/edit"
        element={
          <ProtectedRoute>
            <Layout>{withSuspense(<InvoiceEdit />)}</Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/bank-statements"
        element={
          <ProtectedRoute>
            <Layout>{withSuspense(<BankStatements />)}</Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/bank-statements/preview"
        element={
          <ProtectedRoute>
            <Layout>{withSuspense(<BankStatementPreview />)}</Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/ocr-preview"
        element={
          <ProtectedRoute>
            <Layout>{withSuspense(<OCRPreview />)}</Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/bank-statements/import"
        element={
          <ProtectedRoute>
            <Layout>{withSuspense(<BankStatementImport />)}</Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/bank-statements/:statementId/reconciliation-preview"
        element={
          <ProtectedRoute requiredRole="accountant">
            <Layout>{withSuspense(<BankStatementReconciliationPreview />)}</Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/bank-statements/:statementId"
        element={
          <ProtectedRoute>
            <Layout>{withSuspense(<BankStatementDetail />)}</Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/billing"
        element={
          <ProtectedRoute>
            <Layout>{withSuspense(<Billing />)}</Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/german-tax-reports/*"
        element={
          <ProtectedRoute>
            <Layout>
              {withSuspense(
                <GermanTaxReports key={activeCompany?.id || 'no-company'} />,
              )}
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/companies"
        element={
          <ProtectedRoute>
            <Layout>{withSuspense(<Companies />)}</Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/users"
        element={
          <ProtectedRoute requiredRole="admin">
            <Layout>{withSuspense(<Users />)}</Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/compliance"
        element={
          <ProtectedRoute requiredRole="admin">
            <Layout>{withSuspense(<ComplianceDashboard />)}</Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/audit-logs"
        element={
          <ProtectedRoute requiredRole="admin">
            <Layout>{withSuspense(<AuditLogs />)}</Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/gdpr-actions"
        element={
          <ProtectedRoute>
            <Layout>{withSuspense(<GDPRActions />)}</Layout>
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
