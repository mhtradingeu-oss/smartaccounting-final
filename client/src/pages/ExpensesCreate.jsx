import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { expensesAPI } from '../services/expensesAPI';
import { useCompany } from '../context/CompanyContext';
import LoadingSpinner from '../components/LoadingSpinner';
import { DEMO_DATA } from '../lib/demoMode';

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
  const navigate = useNavigate();
  const [form, setForm] = useState(INITIAL_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
    const payload = {
      vendorName: form.vendor || 'Unknown vendor',
      description: form.description,
      category: form.category || 'materials',
      grossAmount: Number(form.amount) || 0,
      netAmount: Number(form.amount) || 0,
      currency: form.currency,
      expenseDate: form.date || new Date().toISOString(),
      companyId: activeCompany.id,
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
