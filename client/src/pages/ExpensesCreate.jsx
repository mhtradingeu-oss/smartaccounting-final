import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { expensesAPI } from '../services/expensesAPI';
import { useCompany } from '../context/CompanyContext';
import LoadingSpinner from '../components/LoadingSpinner';

const INITIAL_FORM = {
  date: '',
  description: '',
  amount: '',
  currency: 'EUR',
  vendor: '',
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await expensesAPI.create({ ...form, companyId: activeCompany.id });
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
            className="input w-full"
          />
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
