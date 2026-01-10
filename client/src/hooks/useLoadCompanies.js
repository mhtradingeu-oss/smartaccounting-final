import { useEffect, useRef } from 'react';
import { useCompany } from '../context/CompanyContext';
import { companiesAPI } from '../services/companiesAPI';
import { useAuth } from '../context/AuthContext';
import { isSystemAdmin } from '../lib/systemAdmin';

let sessionFetchAttempts = 0;

// Loads companies for the current user and sets them in context
export function useLoadCompanies() {
  const { user } = useAuth();
  const { setCompanies, companies, setCompaniesError, reloadToken, switchCompany } = useCompany();
  const companiesRef = useRef(companies);
  const loadAttemptedRef = useRef(false);
  const resolvedRef = useRef(false);

  useEffect(() => {
    companiesRef.current = companies;
  }, [companies]);

  useEffect(() => {
    loadAttemptedRef.current = false;
    resolvedRef.current = false;
  }, [reloadToken]);

  useEffect(() => {
    if (resolvedRef.current || (companiesRef.current && companiesRef.current.length > 0)) {
      resolvedRef.current = true;
      return undefined;
    }

    if (loadAttemptedRef.current) {
      return undefined;
    }

    if (isSystemAdmin(user)) {
      resolvedRef.current = true;
      setCompanies([]);
      setCompaniesError(null);
      switchCompany(null, { reset: false });
      return undefined;
    }

    loadAttemptedRef.current = true;
    let cancelled = false;

    const loadCompanies = async () => {
      if (process.env.NODE_ENV === 'development') {
        sessionFetchAttempts += 1;
         
        console.debug(`[useLoadCompanies] session fetch #${sessionFetchAttempts}`);
      }

      try {
        const data = await companiesAPI.list();
        if (cancelled) {
          return;
        }
        const list = Array.isArray(data) ? data : data?.companies ?? [];
        resolvedRef.current = true;
        setCompaniesError(null);
        setCompanies(list);
      } catch (err) {
        if (cancelled) {
          return;
        }
        setCompaniesError(err || new Error('Unable to load companies.'));
        setCompanies([]);
        if (process.env.NODE_ENV === 'development') {
           
          console.warn('[useLoadCompanies] fetch error', err);
        }
      }
    };

    loadCompanies();

    return () => {
      cancelled = true;
    };
  }, [setCompanies, setCompaniesError, reloadToken, user, switchCompany]);
}
