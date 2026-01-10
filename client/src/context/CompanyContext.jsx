import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { resetClientState } from '../lib/resetClientState';

// CompanyContext will provide the current company and a setter
const CompanyContext = createContext();

export const CompanyProvider = ({ children }) => {
  const [activeCompany, setActiveCompany] = useState(null); // { id, name, ... }
  const [companies, setCompanies] = useState(null); // null = loading, [] = loaded but empty
  const [companiesError, setCompaniesError] = useState(null);
  const [reloadToken, setReloadToken] = useState(0);
  const activeCompanyId = activeCompany?.id ?? null;

  // Optionally, fetch companies from API here and setCompanies
  // Default to null so consumers can render a loading state before data arrives

  // Reset state on company switch
  const switchCompany = useCallback((company, options = { reset: true }) => {
    if (options.reset !== false) {
      resetClientState();
    }
    setActiveCompany(company);
    // Optionally: clear other state here (e.g., user, dashboard, etc.)
  }, []);

  const reloadCompanies = useCallback(() => {
    setCompanies(null);
    setCompaniesError(null);
    setReloadToken((prev) => prev + 1);
  }, []);

  useEffect(() => {
    if (!activeCompany) {
      return;
    }

    const hasActiveCompany =
      Array.isArray(companies) &&
      companies.some((company) => String(company.id) === String(activeCompany.id));

    if (!hasActiveCompany && activeCompany) {
      const timeoutId = setTimeout(() => {
        switchCompany(null, { reset: false });
      }, 0);
      return () => clearTimeout(timeoutId);
    }
  }, [activeCompany, companies, switchCompany]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    if (activeCompanyId) {
      window.__ACTIVE_COMPANY_ID__ = activeCompanyId;
      sessionStorage.setItem('activeCompanyId', String(activeCompanyId));
    } else {
      window.__ACTIVE_COMPANY_ID__ = null;
      sessionStorage.removeItem('activeCompanyId');
    }
  }, [activeCompanyId]);

  return (
    <CompanyContext.Provider
      value={{
        activeCompany,
        activeCompanyId,
        companies,
        setCompanies,
        switchCompany,
        companiesError,
        setCompaniesError,
        reloadCompanies,
        reloadToken,
      }}
    >
      {children}
    </CompanyContext.Provider>
  );
};
export const useCompany = () => {
  const context = useContext(CompanyContext);
  if (!context) {
    throw new Error('useCompany must be used within a CompanyProvider');
  }
  return context;
};

export default CompanyContext;
