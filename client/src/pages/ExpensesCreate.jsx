import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { expensesAPI } from '../services/expensesAPI';
import { useCompany } from '../context/CompanyContext';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import { DEMO_DATA } from '../lib/demoMode';
import { can } from '../lib/permissions';

const INITIAL_FORM = {
  date: '',
  description: '',
  amount: '',
  currency: 'EUR',
  vendor: '',
  category: 'materials',
};

const ExpensesCreate = () => {
  const { activeCompany } = useCompany();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(INITIAL_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const canCreateExpense = can('expense.create', user?.role);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleUseDemoExpense = () => {
    const demo = DEMO_DATA.expenses?.[0] ?? {};
    setForm({
      date: demo.date || new Date().toISOString().split('T')[0],
      description: demo.number ? `Demo expense ${demo.number}` : 'Demo expense',
      amount: demo.amount?.toString() ?? '0',
      currency: 'EUR',
      vendor: demo.vendor || 'Demo Vendor',
      category: 'materials',
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!activeCompany) {
      setError('Select an active company first.');
      return;
    }
    setLoading(true);
    setError('');

    // حساب VAT
    const netAmount = Number(form.amount) || 0;
    const vatRate = 0.19;
    const vatAmount = +(netAmount * vatRate).toFixed(2);
    const grossAmount = +(netAmount + vatAmount).toFixed(2);

    // استخراج userId من سياق المستخدم
    const createdByUserId = user?.id || 1;

    const payload = {
      companyId: activeCompany.id,
      createdByUserId,
      expenseDate: form.date || new Date().toISOString().split('T')[0],
      currency: form.currency,
      status: 'draft',
      source: 'manual',
      category: form.category || 'Office Supplies',
      description: form.description,
      netAmount,
      vatAmount,
      grossAmount,
      vatRate,
      vendorName: form.vendor || 'Unknown vendor',
    };
    try {
      await expensesAPI.create(payload);
      setForm(INITIAL_FORM);
      navigate('/expenses');
    } catch (err) {
      setError('Failed to create expense.');
    } finally {
      setLoading(false);
    }
  };

  if (!activeCompany) {
    return (
      <EmptyState
        title="Select a company"
        description="Expenses are scoped per entity. Choose an active company before creating a new expense."
        action={
          <Button variant="primary" onClick={() => navigate('/companies')}>
            Select company
          </Button>
        }
      />
    );
  }

  if (!canCreateExpense) {
    return (
      <EmptyState
        title="Insufficient permissions"
        description="Your role does not allow creating expenses. Contact an admin if you need access."
        action={
          <Button variant="secondary" onClick={() => navigate('/expenses')}>
            Back to expenses
          </Button>
        }
      />
    );
  }

  return (
    <Card className="max-w-lg mx-auto mt-8 p-6">
      <h2 className="text-2xl font-bold mb-4">Create Expense</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label>Date</label>
          <input
            type="date"
            name="date"
            value={form.date}
            onChange={handleChange}
            required
            className="input w-full"
          />
        </div>
        <div>
          <label>Description</label>
          <input
            type="text"
            name="description"
            value={form.description}
            onChange={handleChange}
            required
            className="input w-full"
          />
        </div>
        <div>
          <label>Amount</label>
          <input
            type="number"
            name="amount"
            value={form.amount}
            onChange={handleChange}
            required
            className="input w-full"
          />
        </div>
        <div>
          <label>Currency</label>
          <select
            name="currency"
            value={form.currency}
            onChange={handleChange}
            className="input w-full"
          >
            <option value="EUR">EUR</option>
            <option value="USD">USD</option>
          </select>
        </div>
        <div>
          <label>Vendor</label>
          <input
            type="text"
            name="vendor"
            value={form.vendor}
            onChange={handleChange}
            required
            className="input w-full"
          />
        </div>
        <div>
          <label>Category</label>
          <select
            name="category"
            value={form.category}
            onChange={handleChange}
            className="input w-full"
          >
            <option value="materials">Materials</option>
            <option value="services">Services</option>
            <option value="travel">Travel</option>
            <option value="equipment">Equipment</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="secondary" onClick={handleUseDemoExpense}>
            Use demo expense
          </Button>
        </div>
        {error && <div className="text-red-500">{error}</div>}
        <Button type="submit" variant="primary" disabled={loading}>
          {loading ? <LoadingSpinner size="sm" /> : 'Create Expense'}
        </Button>
      </form>
    </Card>
  );
};

export default ExpensesCreate;
