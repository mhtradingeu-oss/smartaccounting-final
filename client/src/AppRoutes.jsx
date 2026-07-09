import { Routes, Route, Navigate } from 'react-router-dom';

import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import CompanyRoute from './components/CompanyRoute';
import SystemAdminRoute from './components/SystemAdminRoute';

import { useAuth } from './context/AuthContext';
import { useCompany } from './context/CompanyContext';

import Landing from './pages/Landing';
import Login from './pages/Login';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';
import Pricing from './pages/Pricing';
import RequestAccess from './pages/RequestAccess';

import Dashboard from './pages/Dashboard';
import Companies from './pages/Companies';
import Invoices from './pages/Invoices';
import InvoiceCreate from './pages/InvoiceCreate';
import InvoiceEdit from './pages/InvoiceEdit';
import InvoiceImport from './pages/InvoiceImport';
import Expenses from './pages/Expenses';
import ExpensesCreate from './pages/ExpensesCreate';
import BankStatements from './pages/BankStatements';
import BankStatementImport from './pages/BankStatementImport';
import BankStatementPreview from './pages/BankStatementPreview';
import BankStatementDetail from './pages/BankStatementDetail';
import BankStatementReconciliationPreview from './pages/BankStatementReconciliationPreview';
import DocumentInbox from './pages/DocumentInbox';
import OCRPreview from './pages/OCRPreview';
import AIManager from './pages/AIManager';
import AIInsights from './pages/AIInsights';
import AIAssistant from './pages/AIAssistant';
import AiHub from './pages/ai-hub/AiHub';
import Analytics from './pages/Analytics';
import Users from './pages/Users';
import Billing from './pages/Billing';
import ProfileSettings from './pages/ProfileSettings';
import GermanTaxReports from './pages/GermanTaxReports';
import GDPRActions from './pages/GDPRActions';
import AuditLogs from './pages/AuditLogs';
import SystemAdminDashboard from './pages/SystemAdminDashboard';
import Exports from './pages/Exports';
import DatevExport from './pages/DatevExport';
import TaxBridge from './pages/TaxBridge';
import SmartReviewCenter from './pages/SmartReviewCenter';
import ComplianceDashboard from './pages/ComplianceDashboard';
import InvestorDashboard from './pages/InvestorDashboard';
import Onboarding from './pages/Onboarding';
import OnboardingWizard from './pages/OnboardingWizard';
import ObservabilityDashboard from './pages/observability/ObservabilityDashboard';

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

function ProtectedLayout({ children }) {
  return (
    <ProtectedRoute>
      <CompanyRoute>
        <Layout>{children}</Layout>
      </CompanyRoute>
    </ProtectedRoute>
  );
}

function SystemAdminLayout({ children }) {
  return (
    <ProtectedRoute>
      <SystemAdminRoute>
        <Layout>{children}</Layout>
      </SystemAdminRoute>
    </ProtectedRoute>
  );
}

export const ROUTE_DEFINITIONS = [
  { path: '/' },
  { path: '/login' },
  { path: '/pricing' },
  { path: '/request-access' },
  { path: '/terms' },
  { path: '/privacy' },
  { path: '/dashboard' },
  { path: '/companies' },
  { path: '/invoices' },
  { path: '/invoices/create' },
  { path: '/invoices/import' },
  { path: '/invoices/:invoiceId/edit' },
  { path: '/expenses' },
  { path: '/expenses/create' },
  { path: '/bank-statements' },
  { path: '/bank-statements/import' },
  { path: '/bank-statements/preview' },
  { path: '/bank-statements/:statementId' },
  { path: '/bank-statements/:statementId/reconciliation-preview' },
  { path: '/documents/inbox' },
  { path: '/ocr-preview' },
  { path: '/ai' },
  { path: '/ai-hub' },
  { path: '/ai-manager' },
  { path: '/ai-advisor' },
  { path: '/ai-assistant' },
  { path: '/analytics' },
  { path: '/users' },
  { path: '/billing' },
  { path: '/profile-settings' },
  { path: '/tax-bridge' },
  { path: '/review-center' },
  { path: '/german-tax-reports' },
  { path: '/gdpr-actions' },
  { path: '/audit-logs' },
  { path: '/exports' },
  { path: '/exports/datev' },
  { path: '/compliance' },
  { path: '/investor-dashboard' },
  { path: '/onboarding' },
  { path: '/onboarding-wizard' },
  { path: '/observability' },
  { path: '/system-admin' },
];

function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<Landing />} />
      <Route
        path="/login"
        element={
          <PublicOnlyRoute>
            <Login />
          </PublicOnlyRoute>
        }
      />
      <Route path="/pricing" element={<Pricing />} />
      <Route path="/request-access" element={<RequestAccess />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/privacy" element={<Privacy />} />

      {/* Protected app shell */}
      <Route path="/dashboard" element={<ProtectedLayout><DashboardRoute /></ProtectedLayout>} />
      <Route path="/companies" element={<ProtectedLayout><Companies /></ProtectedLayout>} />

      <Route path="/invoices" element={<ProtectedLayout><Invoices /></ProtectedLayout>} />
      <Route path="/invoices/create" element={<ProtectedLayout><InvoiceCreate /></ProtectedLayout>} />
      <Route path="/invoices/import" element={<ProtectedLayout><InvoiceImport /></ProtectedLayout>} />
      <Route path="/invoices/:invoiceId/edit" element={<ProtectedLayout><InvoiceEdit /></ProtectedLayout>} />

      <Route path="/expenses" element={<ProtectedLayout><Expenses /></ProtectedLayout>} />
      <Route path="/expenses/create" element={<ProtectedLayout><ExpensesCreate /></ProtectedLayout>} />

      <Route path="/bank-statements" element={<ProtectedLayout><BankStatements /></ProtectedLayout>} />
      <Route path="/bank-statements/import" element={<ProtectedLayout><BankStatementImport /></ProtectedLayout>} />
      <Route path="/bank-statements/preview" element={<ProtectedLayout><BankStatementPreview /></ProtectedLayout>} />
      <Route path="/bank-statements/:statementId" element={<ProtectedLayout><BankStatementDetail /></ProtectedLayout>} />
      <Route path="/bank-statements/:statementId/reconciliation-preview" element={<ProtectedLayout><BankStatementReconciliationPreview /></ProtectedLayout>} />

      <Route path="/documents/inbox" element={<ProtectedLayout><DocumentInbox /></ProtectedLayout>} />
      <Route path="/ocr-preview" element={<ProtectedLayout><OCRPreview /></ProtectedLayout>} />

      <Route path="/ai" element={<ProtectedLayout><AiHub /></ProtectedLayout>} />
      <Route path="/ai-hub" element={<ProtectedLayout><AiHub /></ProtectedLayout>} />
      <Route path="/ai-manager" element={<ProtectedLayout><AIManager /></ProtectedLayout>} />
      <Route path="/ai-advisor" element={<ProtectedLayout><AIInsights /></ProtectedLayout>} />
      <Route path="/ai-assistant" element={<ProtectedLayout><AIAssistant /></ProtectedLayout>} />

      <Route path="/analytics" element={<ProtectedLayout><Analytics /></ProtectedLayout>} />
      <Route path="/users" element={<ProtectedLayout><Users /></ProtectedLayout>} />
      <Route path="/billing" element={<ProtectedLayout><Billing /></ProtectedLayout>} />
      <Route path="/profile-settings" element={<ProtectedLayout><ProfileSettings /></ProtectedLayout>} />

      <Route path="/german-tax-reports" element={<ProtectedLayout><GermanTaxReports /></ProtectedLayout>} />
      <Route path="/tax-bridge" element={<ProtectedLayout><TaxBridge /></ProtectedLayout>} />
      <Route path="/review-center" element={<ProtectedLayout><SmartReviewCenter /></ProtectedLayout>} />
      <Route path="/gdpr-actions" element={<ProtectedLayout><GDPRActions /></ProtectedLayout>} />
      <Route path="/audit-logs" element={<ProtectedLayout><AuditLogs /></ProtectedLayout>} />

      <Route path="/exports" element={<ProtectedLayout><Exports /></ProtectedLayout>} />
      <Route path="/exports/datev" element={<ProtectedLayout><DatevExport /></ProtectedLayout>} />
      <Route path="/compliance" element={<ProtectedLayout><ComplianceDashboard /></ProtectedLayout>} />
      <Route path="/investor-dashboard" element={<ProtectedLayout><InvestorDashboard /></ProtectedLayout>} />
      <Route path="/onboarding" element={<ProtectedLayout><Onboarding /></ProtectedLayout>} />
      <Route path="/onboarding-wizard" element={<ProtectedLayout><OnboardingWizard /></ProtectedLayout>} />

      {/* System admin */}
      <Route path="/observability" element={<ProtectedLayout><ObservabilityDashboard /></ProtectedLayout>} />

      <Route path="/system-admin" element={<SystemAdminLayout><SystemAdminDashboard /></SystemAdminLayout>} />

      {/* Safe fallback */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default AppRoutes;
