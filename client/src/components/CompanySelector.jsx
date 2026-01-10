import React from 'react';
import { useTranslation } from 'react-i18next';
import { useCompany } from '../context/CompanyContext';

const CompanySelector = () => {
  const { t } = useTranslation();
  const { companies, activeCompany, switchCompany, companiesError, reloadCompanies } = useCompany();

  if (companies === null) {
    return <div className="text-gray-500">Loading companies...</div>;
  }

  if (companiesError) {
    return (
      <div className="text-sm text-red-600">
        Unable to load companies.{' '}
        <button type="button" className="underline" onClick={reloadCompanies}>
          Retry
        </button>
      </div>
    );
  }

  if (!companies || companies.length === 0) {
    return <div className="text-gray-500">No companies available.</div>;
  }

  return (
    <select
      className="border rounded px-2 py-1 text-sm bg-white dark:bg-gray-800"
      value={activeCompany ? String(activeCompany.id) : ''}
      onChange={(e) => {
        const selected = companies.find((c) => String(c.id) === e.target.value);
        if (selected) {
          switchCompany(selected);
        }
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
