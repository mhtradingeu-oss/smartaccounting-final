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

const withSuspense = (children) => <Suspense fallback={<PageLoadingState />}>{children}</Suspense>;

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
const ProfileSettings = lazy(() => import('./pages/ProfileSettings'));
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

const routeElementResolver = (route, context = {}) => {
  if (typeof route.element === 'function') {
    return route.element(context);
  }
  return route.element;
};

export const ROUTE_DEFINITIONS = [
  {
    path: '/',
    element: wrapRoute(<LandingRoute />),
    componentFile: 'client/src/pages/Landing.jsx',
    authRequired: false,
    requiredRole: null,
    featureFlags: [],
  },
  {
    path: '/login',
    element: wrapRoute(<LoginRoute />),
    componentFile: 'client/src/pages/Login.jsx',
    authRequired: false,
    requiredRole: null,
    featureFlags: [],
  },
  {
    path: '/pricing',
    element: wrapRoute(withSuspense(<Pricing />)),
    componentFile: 'client/src/pages/Pricing.jsx',
    authRequired: false,
    requiredRole: null,
    featureFlags: [],
  },
  {
    path: '/request-access',
    element: wrapRoute(withSuspense(<RequestAccess />)),
    componentFile: 'client/src/pages/RequestAccess.jsx',
    authRequired: false,
    requiredRole: null,
    featureFlags: [],
  },
  {
    path: '/onboarding',
    element: renderProtectedRoute(<OnboardingWizard />),
    componentFile: 'client/src/pages/OnboardingWizard.jsx',
    authRequired: true,
    requiredRole: null,
    featureFlags: [],
  },
  {
    path: '/profile-settings',
    element: renderProtectedRoute(<ProfileSettings />),
    componentFile: 'client/src/pages/ProfileSettings.jsx',
    authRequired: true,
    requiredRole: null,
    featureFlags: [],
  },
  {
    path: '/rbac',
    element: renderProtectedRoute(<RBACManagement />, 'admin'),
    componentFile: 'client/src/pages/RBACManagement.jsx',
    authRequired: true,
    requiredRole: 'admin',
    featureFlags: [],
  },
  {
    path: '/investor-dashboard',
    element: renderProtectedRoute(<InvestorDashboard />, 'auditor'),
    componentFile: 'client/src/pages/InvestorDashboard.jsx',
    authRequired: true,
    requiredRole: 'auditor',
    featureFlags: [],
  },
  {
    path: '/analytics',
    element: renderProtectedRoute(<Analytics />),
    componentFile: 'client/src/pages/Analytics.jsx',
    authRequired: true,
    requiredRole: null,
    featureFlags: [],
  },
  {
    path: '/ai-advisor',
    element: renderProtectedRoute(<AIInsights />),
    componentFile: 'client/src/pages/AIInsights.jsx',
    authRequired: true,
    requiredRole: null,
    featureFlags: [],
  },
  {
    path: '/ai-assistant',
    element: renderProtectedRoute(<AIAssistant />),
    componentFile: 'client/src/pages/AIAssistant.jsx',
    authRequired: true,
    requiredRole: null,
    featureFlags: ['AI_ASSISTANT_ENABLED'],
  },
  {
    path: '/dashboard',
    element: renderProtectedRoute(<Dashboard />),
    componentFile: 'client/src/pages/Dashboard.jsx',
    authRequired: true,
    requiredRole: null,
    featureFlags: [],
  },
  {
    path: '/invoices',
    element: renderProtectedRoute(<Invoices />),
    componentFile: 'client/src/pages/Invoices.jsx',
    authRequired: true,
    requiredRole: null,
    featureFlags: [],
  },
  {
    path: '/expenses',
    element: renderProtectedRoute(<Expenses />),
    componentFile: 'client/src/pages/Expenses.jsx',
    authRequired: true,
    requiredRole: null,
    featureFlags: [],
  },
  {
    path: '/expenses/create',
    element: renderProtectedRoute(<ExpensesCreate />),
    componentFile: 'client/src/pages/ExpensesCreate.jsx',
    authRequired: true,
    requiredRole: null,
    featureFlags: [],
  },
  {
    path: '/invoices/create',
    element: renderProtectedRoute(<InvoiceCreate />),
    componentFile: 'client/src/pages/InvoiceCreate.jsx',
    authRequired: true,
    requiredRole: null,
    featureFlags: [],
  },
  {
    path: '/invoices/:invoiceId/edit',
    element: renderProtectedRoute(<InvoiceEdit />),
    componentFile: 'client/src/pages/InvoiceEdit.jsx',
    authRequired: true,
    requiredRole: null,
    featureFlags: [],
  },
  {
    path: '/bank-statements',
    element: renderProtectedRoute(<BankStatements />),
    componentFile: 'client/src/pages/BankStatements.jsx',
    authRequired: true,
    requiredRole: null,
    featureFlags: [],
  },
  {
    path: '/bank-statements/preview',
    element: renderProtectedRoute(<BankStatementPreview />),
    componentFile: 'client/src/pages/BankStatementPreview.jsx',
    authRequired: true,
    requiredRole: null,
    featureFlags: [],
  },
  {
    path: '/ocr-preview',
    element: renderProtectedRoute(<OCRPreview />),
    componentFile: 'client/src/pages/OCRPreview.jsx',
    authRequired: true,
    requiredRole: null,
    featureFlags: ['OCR_PREVIEW_ENABLED'],
  },
  {
    path: '/bank-statements/import',
    element: renderProtectedRoute(<BankStatementImport />),
    componentFile: 'client/src/pages/BankStatementImport.jsx',
    authRequired: true,
    requiredRole: null,
    featureFlags: [],
  },
  {
    path: '/bank-statements/:statementId/reconciliation-preview',
    element: renderProtectedRoute(<BankStatementReconciliationPreview />, 'accountant'),
    componentFile: 'client/src/pages/BankStatementReconciliationPreview.jsx',
    authRequired: true,
    requiredRole: 'accountant',
    featureFlags: [],
  },
  {
    path: '/bank-statements/:statementId',
    element: renderProtectedRoute(<BankStatementDetail />),
    componentFile: 'client/src/pages/BankStatementDetail.jsx',
    authRequired: true,
    requiredRole: null,
    featureFlags: [],
  },
  {
    path: '/billing',
    element: renderProtectedRoute(<Billing />),
    componentFile: 'client/src/pages/Billing.jsx',
    authRequired: true,
    requiredRole: null,
    featureFlags: ['STRIPE_BILLING'],
  },
  {
    path: '/german-tax-reports/*',
    element: ({ activeCompany: company }) =>
      renderProtectedRoute(<GermanTaxReports key={company?.id || 'no-company'} />),
    componentFile: 'client/src/pages/GermanTaxReports.jsx',
    authRequired: true,
    requiredRole: null,
    featureFlags: ['GERMAN_TAX'],
  },
  {
    path: '/companies',
    element: renderProtectedRoute(<Companies />),
    componentFile: 'client/src/pages/Companies.jsx',
    authRequired: true,
    requiredRole: null,
    featureFlags: [],
  },
  {
    path: '/users',
    element: renderProtectedRoute(<Users />, 'admin'),
    componentFile: 'client/src/pages/Users.jsx',
    authRequired: true,
    requiredRole: 'admin',
    featureFlags: [],
  },
  {
    path: '/compliance',
    element: renderProtectedRoute(<ComplianceDashboard />, 'admin'),
    componentFile: 'client/src/pages/ComplianceDashboard.jsx',
    authRequired: true,
    requiredRole: 'admin',
    featureFlags: ['ELSTER_COMPLIANCE'],
  },
  {
    path: '/audit-logs',
    element: renderProtectedRoute(<AuditLogs />, 'admin'),
    componentFile: 'client/src/pages/AuditLogs.jsx',
    authRequired: true,
    requiredRole: 'admin',
    featureFlags: [],
  },
  {
    path: '/gdpr-actions',
    element: renderProtectedRoute(<GDPRActions />),
    componentFile: 'client/src/pages/GDPRActions.jsx',
    authRequired: true,
    requiredRole: null,
    featureFlags: [],
  },
  {
    path: '/compliance-dashboard',
    element: wrapRoute(
      <ProtectedRoute requiredRole="admin">
        <Navigate to="/compliance" replace />
      </ProtectedRoute>,
    ),
    componentFile: 'client/src/App.jsx (compliance redirect)',
    authRequired: true,
    requiredRole: 'admin',
    featureFlags: ['ELSTER_COMPLIANCE'],
  },
  {
    path: '*',
    element: wrapRoute(<NotFound />),
    componentFile: 'client/src/App.jsx (NotFound)',
    authRequired: false,
    requiredRole: null,
    featureFlags: [],
  },
];

export const AppRoutes = () => {
  const { activeCompany } = useCompany();

  return (
    <Routes>
      {ROUTE_DEFINITIONS.map((route) => (
        <Route
          key={route.path}
          path={route.path}
          element={routeElementResolver(route, { activeCompany })}
        />
      ))}
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
