import { useEffect } from 'react';
import { useCompany } from '../context/CompanyContext';
import { companiesAPI } from '../services/companiesAPI';

// Loads companies for the current user and sets them in context
export function useLoadCompanies() {
  const { setCompanies, companies } = useCompany();

  useEffect(() => {
    if (companies && companies.length > 0) { return; } // Already loaded
    companiesAPI.list().then((data) => {
      if (Array.isArray(data)) {
        setCompanies(data);
      } else if (data && Array.isArray(data.companies)) {
        setCompanies(data.companies);
      }
    });
  }, [setCompanies, companies]);
}
