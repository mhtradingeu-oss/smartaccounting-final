import { useEffect, useMemo, useState } from 'react';
import Button from '../Button';
import FormField from '../ui/FormField';
import Label from '../ui/Label';

const INITIAL_FORM_STATE = {
  invoiceNumber: '',
  clientName: '',
  date: '',
  dueDate: '',
  currency: 'EUR',
  subtotal: '',
  total: '',
  notes: '',
};

const normalizeNumericField = (value) =>
  value === undefined || value === null ? '' : String(value);

const InvoiceForm = ({
  initialValues = {},
  disabled = false,
  loading = false,
  submitLabel = 'Save invoice',
  onSubmit = () => {},
}) => {
  const normalizedInitial = useMemo(
    () => ({
      ...INITIAL_FORM_STATE,
      ...initialValues,
      currency: (initialValues.currency || 'EUR').toUpperCase(),
      subtotal: normalizeNumericField(initialValues.subtotal),
      total: normalizeNumericField(initialValues.total),
    }),
    [initialValues],
  );

  const [formState, setFormState] = useState(normalizedInitial);

  useEffect(() => {
    setFormState(normalizedInitial);
  }, [normalizedInitial]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const payload = {
      invoiceNumber: formState.invoiceNumber.trim(),
      clientName: formState.clientName.trim(),
      date: formState.date,
      dueDate: formState.dueDate,
      currency: (formState.currency || 'EUR').toUpperCase(),
      subtotal: parseFloat(formState.subtotal) || 0,
      total: parseFloat(formState.total) || parseFloat(formState.subtotal) || 0,
      notes: formState.notes ? formState.notes.trim() : null,
    };
    onSubmit(payload);
  };

  const inputBaseClasses =
    'w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 placeholder-gray-400 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:focus:border-primary-500';

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label={<Label required>Invoice Number</Label>} required>
          <input
            className={inputBaseClasses}
            name="invoiceNumber"
            value={formState.invoiceNumber}
            onChange={handleChange}
            disabled={disabled}
            required
            placeholder="INV-2024-001"
          />
        </FormField>
        <FormField label={<Label required>Client Name</Label>} required>
          <input
            className={inputBaseClasses}
            name="clientName"
            value={formState.clientName}
            onChange={handleChange}
            disabled={disabled}
            required
            placeholder="Müller GmbH"
          />
        </FormField>
        <FormField label={<Label required>Issue Date</Label>} required>
          <input
            type="date"
            className={inputBaseClasses}
            name="date"
            value={formState.date}
            onChange={handleChange}
            disabled={disabled}
            required
          />
        </FormField>
        <FormField label={<Label required>Due Date</Label>} required>
          <input
            type="date"
            className={inputBaseClasses}
            name="dueDate"
            value={formState.dueDate}
            onChange={handleChange}
            disabled={disabled}
            required
          />
        </FormField>
        <FormField label={<Label required>Currency</Label>} required>
          <input
            className={inputBaseClasses}
            name="currency"
            value={formState.currency}
            onChange={handleChange}
            disabled={disabled}
            required
          />
        </FormField>
        <FormField label={<Label required>Subtotal</Label>} required>
          <input
            type="number"
            step="0.01"
            min="0"
            className={inputBaseClasses}
            name="subtotal"
            value={formState.subtotal}
            onChange={handleChange}
            disabled={disabled}
            required
            placeholder="0.00"
          />
        </FormField>
        <FormField label={<Label>Total</Label>}>
          <input
            type="number"
            step="0.01"
            min="0"
            className={inputBaseClasses}
            name="total"
            value={formState.total}
            onChange={handleChange}
            disabled={disabled}
            placeholder="Auto = subtotal"
          />
        </FormField>
      </div>
      <FormField label={<Label>Notes (optional)</Label>}>
        <textarea
          className={`${inputBaseClasses} min-h-[110px] resize-none`}
          name="notes"
          value={formState.notes}
          onChange={handleChange}
          disabled={disabled}
        />
      </FormField>
      <div className="flex justify-end">
        <Button type="submit" loading={loading} disabled={disabled} variant="primary">
          {submitLabel}
        </Button>
      </div>
    </form>
  );
};

export default InvoiceForm;
