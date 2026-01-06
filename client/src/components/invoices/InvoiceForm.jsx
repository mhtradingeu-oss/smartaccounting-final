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
  items: [
    {
      description: '',
      quantity: 1,
      unitPrice: '',
      vatRate: '',
      netAmount: '',
      vatAmount: '',
      grossAmount: '',
    },
  ],
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

  // Line items logic
  const handleItemChange = (idx, field, value) => {
    setFormState((prev) => {
      const items = prev.items.map((item, i) => {
        if (i !== idx) {return item;}
        const updated = { ...item, [field]: value };
        // Auto-calc net/vat/gross if relevant fields change
        const qty = parseFloat(updated.quantity) || 0;
        const unit = parseFloat(updated.unitPrice) || 0;
        const vatR = parseFloat(updated.vatRate) || 0;
        updated.netAmount = (qty * unit).toFixed(2);
        updated.vatAmount = ((qty * unit * vatR) / 100).toFixed(2);
        updated.grossAmount = (qty * unit + (qty * unit * vatR) / 100).toFixed(2);
        return updated;
      });
      return { ...prev, items };
    });
  };

  const handleAddItem = () => {
    setFormState((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          description: '',
          quantity: 1,
          unitPrice: '',
          vatRate: '',
          netAmount: '',
          vatAmount: '',
          grossAmount: '',
        },
      ],
    }));
  };

  const handleRemoveItem = (idx) => {
    setFormState((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== idx),
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const items = formState.items.map((item) => ({
      description: item.description,
      quantity: parseFloat(item.quantity) || 0,
      unitPrice: parseFloat(item.unitPrice) || 0,
      vatRate: parseFloat(item.vatRate) || 0,
      netAmount: parseFloat(item.netAmount) || 0,
      vatAmount: parseFloat(item.vatAmount) || 0,
      grossAmount: parseFloat(item.grossAmount) || 0,
    }));
    // Recompute subtotal/total from items
    const subtotal = items.reduce((sum, i) => sum + (i.netAmount || 0), 0);
    const total = items.reduce((sum, i) => sum + (i.grossAmount || 0), 0);
    const payload = {
      invoiceNumber: formState.invoiceNumber.trim(),
      clientName: formState.clientName.trim(),
      date: formState.date,
      dueDate: formState.dueDate,
      currency: (formState.currency || 'EUR').toUpperCase(),
      subtotal,
      total,
      notes: formState.notes ? formState.notes.trim() : null,
      items,
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
      </div>

      {/* Line Items Table */}
      <div>
        <Label required>Line Items</Label>
        <table className="min-w-full divide-y divide-gray-200 mt-2 mb-2">
          <thead>
            <tr>
              <th className="px-2 py-1 text-left text-xs font-medium text-gray-500">Description</th>
              <th className="px-2 py-1 text-left text-xs font-medium text-gray-500">Qty</th>
              <th className="px-2 py-1 text-left text-xs font-medium text-gray-500">Unit Price</th>
              <th className="px-2 py-1 text-left text-xs font-medium text-gray-500">VAT %</th>
              <th className="px-2 py-1 text-left text-xs font-medium text-gray-500">Net</th>
              <th className="px-2 py-1 text-left text-xs font-medium text-gray-500">VAT</th>
              <th className="px-2 py-1 text-left text-xs font-medium text-gray-500">Gross</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {formState.items.map((item, idx) => (
              <tr key={idx}>
                <td className="px-2 py-1">
                  <input
                    className={inputBaseClasses}
                    value={item.description}
                    onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                    disabled={disabled}
                    required
                  />
                </td>
                <td className="px-2 py-1">
                  <input
                    type="number"
                    min="1"
                    className={inputBaseClasses}
                    value={item.quantity}
                    onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                    disabled={disabled}
                    required
                  />
                </td>
                <td className="px-2 py-1">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className={inputBaseClasses}
                    value={item.unitPrice}
                    onChange={(e) => handleItemChange(idx, 'unitPrice', e.target.value)}
                    disabled={disabled}
                    required
                  />
                </td>
                <td className="px-2 py-1">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className={inputBaseClasses}
                    value={item.vatRate}
                    onChange={(e) => handleItemChange(idx, 'vatRate', e.target.value)}
                    disabled={disabled}
                    required
                  />
                </td>
                <td className="px-2 py-1">
                  <input
                    type="number"
                    className={inputBaseClasses}
                    value={item.netAmount}
                    disabled
                  />
                </td>
                <td className="px-2 py-1">
                  <input
                    type="number"
                    className={inputBaseClasses}
                    value={item.vatAmount}
                    disabled
                  />
                </td>
                <td className="px-2 py-1">
                  <input
                    type="number"
                    className={inputBaseClasses}
                    value={item.grossAmount}
                    disabled
                  />
                </td>
                <td className="px-2 py-1">
                  {formState.items.length > 1 && (
                    <Button
                      type="button"
                      variant="danger"
                      size="xs"
                      onClick={() => handleRemoveItem(idx)}
                      disabled={disabled}
                    >
                      Remove
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={handleAddItem}
          disabled={disabled}
        >
          Add Item
        </Button>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label={<Label required>Subtotal</Label>} required>
          <input
            type="number"
            step="0.01"
            min="0"
            className={inputBaseClasses}
            name="subtotal"
            value={formState.items
              .reduce((sum, i) => sum + (parseFloat(i.netAmount) || 0), 0)
              .toFixed(2)}
            disabled
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
            value={formState.items
              .reduce((sum, i) => sum + (parseFloat(i.grossAmount) || 0), 0)
              .toFixed(2)}
            disabled
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
