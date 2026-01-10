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
    if (!Array.isArray(companies) || companies.length === 0) {
      return;
    }

    const hasActiveCompany =
      activeCompany &&
      companies.some((company) => String(company.id) === String(activeCompany.id));

    if (!activeCompany || !hasActiveCompany) {
      // Defer setState to avoid cascading renders in effect
      Promise.resolve().then(() => {
        switchCompany(companies[0], { reset: false });
      });
    }
  }, [activeCompany, companies, switchCompany]);

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
