import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import LoadingSpinner from './components/LoadingSpinner';
import RouteErrorBoundary from './components/RouteErrorBoundary';
import { PageLoadingState } from './components/ui/PageStates';
import AppErrorBoundary from './components/AppErrorBoundary';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CompanyProvider, useCompany } from './context/CompanyContext';
import { RoleProvider } from './context/RoleContext';

const withSuspense = (children) => (
  <Suspense fallback={<PageLoadingState />}>{children}</Suspense>
);

const wrapRoute = (element) => <RouteErrorBoundary>{element}</RouteErrorBoundary>;

const withProtectedLayout = (element, requiredRole) => (
  <ProtectedRoute requiredRole={requiredRole}>
    <Layout>{withSuspense(element)}</Layout>
  </ProtectedRoute>
);

const renderProtectedRoute = (element, requiredRole) =>
  wrapRoute(withProtectedLayout(element, requiredRole));

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
      <Route path="/" element={wrapRoute(<LandingRoute />)} />
      <Route path="/login" element={wrapRoute(<LoginRoute />)} />
      <Route path="/pricing" element={wrapRoute(withSuspense(<Pricing />))} />
      <Route path="/request-access" element={wrapRoute(withSuspense(<RequestAccess />))} />
      <Route path="/onboarding" element={renderProtectedRoute(<OnboardingWizard />)} />
      <Route
        path="/rbac"
        element={renderProtectedRoute(<RBACManagement />, 'admin')}
      />
      <Route
        path="/investor-dashboard"
        element={renderProtectedRoute(<InvestorDashboard />, 'auditor')}
      />
      <Route path="/analytics" element={renderProtectedRoute(<Analytics />)} />
      <Route path="/ai-advisor" element={renderProtectedRoute(<AIInsights />)} />
      <Route path="/ai-assistant" element={renderProtectedRoute(<AIAssistant />)} />
      <Route path="/dashboard" element={renderProtectedRoute(<Dashboard />)} />
      <Route path="/invoices" element={renderProtectedRoute(<Invoices />)} />
      <Route path="/expenses" element={renderProtectedRoute(<Expenses />)} />
      <Route path="/expenses/create" element={renderProtectedRoute(<ExpensesCreate />)} />
      <Route path="/invoices/create" element={renderProtectedRoute(<InvoiceCreate />)} />
      <Route path="/invoices/:invoiceId/edit" element={renderProtectedRoute(<InvoiceEdit />)} />
      <Route path="/bank-statements" element={renderProtectedRoute(<BankStatements />)} />
      <Route
        path="/bank-statements/preview"
        element={renderProtectedRoute(<BankStatementPreview />)}
      />
      <Route path="/ocr-preview" element={renderProtectedRoute(<OCRPreview />)} />
      <Route
        path="/bank-statements/import"
        element={renderProtectedRoute(<BankStatementImport />)}
      />
      <Route
        path="/bank-statements/:statementId/reconciliation-preview"
        element={renderProtectedRoute(<BankStatementReconciliationPreview />, 'accountant')}
      />
      <Route
        path="/bank-statements/:statementId"
        element={renderProtectedRoute(<BankStatementDetail />)}
      />
      <Route path="/billing" element={renderProtectedRoute(<Billing />)} />
      <Route
        path="/german-tax-reports/*"
        element={renderProtectedRoute(
          <GermanTaxReports key={activeCompany?.id || 'no-company'} />,
        )}
      />
      <Route path="/companies" element={renderProtectedRoute(<Companies />)} />
      <Route path="/users" element={renderProtectedRoute(<Users />, 'admin')} />
      <Route
        path="/compliance"
        element={renderProtectedRoute(<ComplianceDashboard />, 'admin')}
      />
      <Route
        path="/audit-logs"
        element={renderProtectedRoute(<AuditLogs />, 'admin')}
      />
      <Route path="/gdpr-actions" element={renderProtectedRoute(<GDPRActions />)} />
      <Route
        path="/compliance-dashboard"
        element={wrapRoute(
          <ProtectedRoute requiredRole="admin">
            <Navigate to="/compliance" replace />
          </ProtectedRoute>,
        )}
      />
      <Route path="*" element={wrapRoute(<NotFound />)} />
    </Routes>
  );
};

function AppInner() {
  const location = useLocation();
  const { logout } = useAuth();
  const { t } = useTranslation();

  return (
    <AppErrorBoundary location={location} logout={logout} t={t}>
      <CompanyProvider>
        <RoleProvider>
          <AppRoutes />
        </RoleProvider>
      </CompanyProvider>
    </AppErrorBoundary>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}

export default App;
