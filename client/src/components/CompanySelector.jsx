import React from 'react';
import { useCompany } from '../context/CompanyContext';

const CompanySelector = () => {
  const { companies, activeCompany, switchCompany } = useCompany();

  if (!companies || companies.length === 0) {
    return <div className="text-gray-500">No companies available.</div>;
  }

  return (
    <select
      className="border rounded px-2 py-1"
      value={activeCompany ? activeCompany.id : ''}
      onChange={e => {
        const selected = companies.find(c => c.id === e.target.value);
        switchCompany(selected);
      }}
    >
      <option value="" disabled>
        Select company
      </option>
      {companies.map(company => (
        <option key={company.id} value={company.id}>
          {company.name}
        </option>
      ))}
    </select>
  );
};

export default CompanySelector;
