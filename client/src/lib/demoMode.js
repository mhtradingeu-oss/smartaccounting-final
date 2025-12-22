// Demo mode flag utility
export const isDemoMode = () => import.meta.env.VITE_DEMO_MODE === 'true';

// Example demo data for key entities
export const DEMO_DATA = {
  dashboard: {
    revenue: 120000,
    expenses: 45000,
    profit: 75000,
    invoicesCount: 42,
    usersCount: 8,
    companiesCount: 3,
    // ...add more as needed
  },
  invoices: [
    { id: 1, number: 'INV-1001', amount: 1200, status: 'paid', date: '2025-12-01' },
    { id: 2, number: 'INV-1002', amount: 800, status: 'unpaid', date: '2025-12-05' },
  ],
  users: [
    { id: 1, name: 'Demo User', email: 'demo@smartaccounting.com', role: 'admin' },
    { id: 2, name: 'Accountant', email: 'accountant@smartaccounting.com', role: 'accountant' },
  ],
  companies: [
    { id: 1, name: 'Demo GmbH', country: 'Germany' },
    { id: 2, name: 'Test AG', country: 'Germany' },
  ],
  bankStatements: [
    { id: 1, account: 'DE1234567890', balance: 50000, date: '2025-12-10' },
  ],
};
