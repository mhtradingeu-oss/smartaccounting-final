import React, { createContext, useContext, useState } from 'react';
import { resetClientState } from '../lib/resetClientState';

// CompanyContext will provide the current company and a setter
const CompanyContext = createContext();

export const CompanyProvider = ({ children }) => {
  const [activeCompany, setActiveCompany] = useState(null); // { id, name, ... }
  const [companies, setCompanies] = useState([]); // List of companies user can access

  // Optionally, fetch companies from API here and setCompanies
  // For now, leave as empty array; to be filled by consuming components/services

  // Reset state on company switch
  const switchCompany = (company, options = { reset: true }) => {
    if (options.reset !== false) {
      resetClientState();
    }
    setActiveCompany(company);
    // Optionally: clear other state here (e.g., user, dashboard, etc.)
  };

  return (
    <CompanyContext.Provider value={{ activeCompany, companies, setCompanies, switchCompany }}>
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
