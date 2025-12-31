import React from 'react';
import { useTranslation } from 'react-i18next';
import { useCompany } from '../context/CompanyContext';

const CompanySelector = () => {
  const { t } = useTranslation();
  const { companies, activeCompany, switchCompany } = useCompany();

  if (!companies || companies.length === 0) {
    return <div className="text-gray-500">No companies available.</div>;
  }

  return (
    <select
      className="border rounded px-2 py-1 text-sm bg-white dark:bg-gray-800"
      value={activeCompany ? activeCompany.id : ''}
      onChange={(e) => {
        const selected = companies.find((c) => c.id === e.target.value);
        switchCompany(selected);
      }}
      aria-label={t('company_selector.label')}
      title={t('company_selector.label')}
    >
      <option value="" disabled>
        {t('company_selector.placeholder')}
      </option>
      {companies.map((company) => (
        <option key={company.id} value={company.id}>
          {company.name}
        </option>
      ))}
    </select>
  );
};

export default CompanySelector;
