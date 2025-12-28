import React from 'react';
import Label from './Label';

/**
 * FormField: Standardized field with label, input, helper, and error.
 * Props:
 * - label: string
 * - required: boolean
 * - error: string | boolean
 * - helper: string
 * - children: ReactNode (input)
 */
export function FormField({ label, required, error, helper, children }) {
  return (
    <div className="mb-4">
      <Label required={required}>{label}</Label>
      {children}
      {helper && !error && <div className="mt-1 text-xs text-gray-500">{helper}</div>}
      {error && <div className="mt-1 text-xs text-red-600">{error}</div>}
    </div>
  );
}

export default FormField;
