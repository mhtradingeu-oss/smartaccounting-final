import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { resetClientState } from '../lib/resetClientState';
import {
  clearStoredActiveCompanyId,
  getStoredActiveCompanyId,
  parseCompanyId,
  setStoredActiveCompanyId,
} from '../lib/companyStorage';

const normalizeCompany = (company) => {
  if (!company) {
    return null;
  }
  const normalizedId = parseCompanyId(company.id);
  if (normalizedId === null) {
    return company;
  }
  if (normalizedId === company.id) {
    return company;
  }
  return { ...company, id: normalizedId };
};

const toComparableCompanyId = (value) => {
  if (value === undefined || value === null) {
    return null;
  }
  return String(value);
};

const companyIdsMatch = (left, right) => {
  const leftId = toComparableCompanyId(left);
  const rightId = toComparableCompanyId(right);
  if (leftId === null || rightId === null) {
    return false;
  }
  return leftId === rightId;
};

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
    setActiveCompany(normalizeCompany(company));
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
      companies.some((company) => companyIdsMatch(company.id, activeCompany.id));

    if (!hasActiveCompany) {
      const timeoutId = setTimeout(() => {
        switchCompany(null, { reset: false });
      }, 0);
      return () => clearTimeout(timeoutId);
    }
  }, [activeCompany, companies, switchCompany]);

  useEffect(() => {
    if (!Array.isArray(companies) || companies.length === 0) {
      return;
    }

    if (
      activeCompany &&
      companies.some((company) => companyIdsMatch(company.id, activeCompany.id))
    ) {
      return;
    }

    const storedCompanyId = getStoredActiveCompanyId();
    const storedMatch =
      storedCompanyId !== null
        ? companies.find((company) => companyIdsMatch(company.id, storedCompanyId))
        : null;
    const targetCompany = storedMatch ?? companies[0];
    if (!targetCompany) {
      return;
    }

    const timeoutId = setTimeout(() => switchCompany(targetCompany, { reset: false }), 0);
    return () => clearTimeout(timeoutId);
  }, [companies, activeCompany, switchCompany]);

  useEffect(() => {
    if (activeCompanyId) {
      setStoredActiveCompanyId(activeCompanyId);
    } else {
      clearStoredActiveCompanyId();
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
