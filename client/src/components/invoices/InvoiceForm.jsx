import { useEffect, useMemo, useRef, useState } from 'react';
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

const EMPTY_INITIAL_VALUES = {};

const InvoiceForm = ({
  initialValues = EMPTY_INITIAL_VALUES,
  disabled = false,
  loading = false,
  submitLabel = 'Save invoice',
  onSubmit = () => {},
}) => {
  // Immutability: lock form if status is immutable
  const immutableStatuses = ['SENT', 'PAID', 'OVERDUE', 'CANCELLED', 'PARTIALLY_PAID'];
  const isImmutable = immutableStatuses.includes((initialValues.status || '').toUpperCase());
  const effectiveDisabled = disabled || isImmutable;
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

  const normalizedInitialSignature = useMemo(
    () => JSON.stringify(normalizedInitial),
    [normalizedInitial],
  );

  const normalizedSignatureRef = useRef(normalizedInitialSignature);

  const [formState, setFormState] = useState(normalizedInitial);

  useEffect(() => {
    if (normalizedSignatureRef.current === normalizedInitialSignature) {
      return undefined;
    }
    normalizedSignatureRef.current = normalizedInitialSignature;
    const timeoutId = setTimeout(() => {
      setFormState(normalizedInitial);
    }, 0);
    return () => clearTimeout(timeoutId);
  }, [normalizedInitial, normalizedInitialSignature]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
  };

  // Line items logic
  const handleItemChange = (idx, field, value) => {
    setFormState((prev) => {
      const items = prev.items.map((item, i) => {
        if (i !== idx) {
          return item;
        }
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

  const [vatErrors, setVatErrors] = useState([]);

  const validateVAT = () => {
    const errors = [];
    let totalNet = 0,
      totalGross = 0;
    formState.items.forEach((item, idx) => {
      // const qty = parseFloat(item.quantity) || 0;
      // const unit = parseFloat(item.unitPrice) || 0;
      const vatR = parseFloat(item.vatRate);
      const net = parseFloat(item.netAmount) || 0;
      const vat = parseFloat(item.vatAmount) || 0;
      const gross = parseFloat(item.grossAmount) || 0;
      totalNet += net;
      totalGross += gross;
      if (item.vatRate === '' || isNaN(vatR)) {
        errors.push(`Line ${idx + 1}: VAT rate is required.`);
      }
      if (item.vatAmount === '' || isNaN(vat)) {
        errors.push(`Line ${idx + 1}: VAT amount is required.`);
      }
      if (Math.abs(net + vat - gross) > 0.01) {
        errors.push(`Line ${idx + 1}: Net + VAT must equal Gross.`);
      }
      if (vatR === 0) {
        errors.push(
          `Line ${idx + 1}: VAT exemption (0%) detected. Please add a note explaining exemption or reverse charge.`,
        );
      }
    });
    // Totals validation
    const subtotal = formState.items.reduce((sum, i) => sum + (parseFloat(i.netAmount) || 0), 0);
    const total = formState.items.reduce((sum, i) => sum + (parseFloat(i.grossAmount) || 0), 0);
    if (Math.abs(totalNet - subtotal) > 0.01) {
      errors.push('Subtotal does not match sum of net values.');
    }
    if (Math.abs(totalGross - total) > 0.01) {
      errors.push('Total does not match sum of gross values.');
    }
    setVatErrors(errors);
    return errors.length === 0;
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!validateVAT()) {
      return;
    }
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

  // Audit trail extraction (simulate fields: createdBy, createdAt, statusHistory)
  const audit = initialValues.audit || {};
  const createdBy = audit.createdBy || initialValues.createdBy || 'Unknown';
  const createdAt = audit.createdAt || initialValues.createdAt || '';
  const statusHistory = audit.statusHistory || initialValues.statusHistory || [];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {isImmutable && (
        <div className="bg-yellow-50 border border-yellow-300 text-yellow-900 rounded p-3 mb-2 text-sm font-semibold">
          <span role="img" aria-label="lock" className="mr-2">
            🔒
          </span>
          This invoice is immutable after being sent. No edits are allowed except status transitions
          or credit notes. (GoBD §146)
        </div>
      )}
      {/* Audit Trail Section */}
      <div className="border border-gray-200 bg-gray-50 rounded-lg p-4 mb-4">
        <h3 className="text-lg font-semibold text-gray-700 mb-2">Audit Trail</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
          <div>
            <span className="font-medium text-gray-600">Created by:</span> {createdBy}
          </div>
          <div>
            <span className="font-medium text-gray-600">Created at:</span>{' '}
            {createdAt ? new Date(createdAt).toLocaleString() : 'Unknown'}
          </div>
        </div>
        <div className="mt-2">
          <span className="font-medium text-gray-600">Status changes:</span>
          <ul className="list-disc ml-5 mt-1 text-xs">
            {Array.isArray(statusHistory) && statusHistory.length > 0 ? (
              statusHistory.map((entry, idx) => (
                <li key={idx} className="mb-1">
                  {entry.status} by {entry.user || 'Unknown'} at{' '}
                  {entry.timestamp ? new Date(entry.timestamp).toLocaleString() : 'Unknown'}
                </li>
              ))
            ) : (
              <li>No status changes recorded.</li>
            )}
          </ul>
        </div>
        <div className="mt-2 text-xs text-gray-500">
          Audit information is read-only and cannot be changed.
        </div>
      </div>
      {vatErrors.length > 0 && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded p-3 mb-2 text-sm">
          <strong>VAT validation errors:</strong>
          <ul className="list-disc ml-5">
            {vatErrors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label={<Label required>Invoice Number</Label>} required>
          <input
            className={inputBaseClasses}
            name="invoiceNumber"
            value={formState.invoiceNumber}
            onChange={handleChange}
            disabled={effectiveDisabled}
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
            disabled={effectiveDisabled}
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
            disabled={effectiveDisabled}
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
            disabled={effectiveDisabled}
            required
          />
        </FormField>
        <FormField label={<Label required>Currency</Label>} required>
          <input
            className={inputBaseClasses}
            name="currency"
            value={formState.currency}
            onChange={handleChange}
            disabled={effectiveDisabled}
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
                    disabled={effectiveDisabled}
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
                    disabled={effectiveDisabled}
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
                    disabled={effectiveDisabled}
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
                    disabled={effectiveDisabled}
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
                      disabled={effectiveDisabled}
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
          disabled={effectiveDisabled}
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

      {/* VAT Breakdown Section */}
      {initialValues.vatSummary && (
        <div className="border border-primary-100 bg-primary-50 rounded-lg p-4 my-4">
          <h3 className="text-md font-semibold text-primary-700 mb-2">VAT Breakdown</h3>
          <table className="min-w-full text-sm mb-2">
            <thead>
              <tr>
                <th className="px-2 py-1 text-left">Rate (%)</th>
                <th className="px-2 py-1 text-left">Net</th>
                <th className="px-2 py-1 text-left">VAT</th>
                <th className="px-2 py-1 text-left">Gross</th>
              </tr>
            </thead>
            <tbody>
              {initialValues.vatSummary.items.map((row, idx) => (
                <tr key={idx}>
                  <td className="px-2 py-1">{row.rate}</td>
                  <td className="px-2 py-1">{row.net.toFixed(2)}</td>
                  <td className="px-2 py-1">{row.vat.toFixed(2)}</td>
                  <td className="px-2 py-1">{row.gross.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="text-sm font-medium text-primary-800">
            Total VAT: {initialValues.vatSummary.totalVat.toFixed(2)} EUR
          </div>
        </div>
      )}

      <FormField label={<Label>Notes (optional)</Label>}>
        <textarea
          className={`${inputBaseClasses} min-h-[110px] resize-none`}
          name="notes"
          value={formState.notes}
          onChange={handleChange}
          disabled={effectiveDisabled}
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
