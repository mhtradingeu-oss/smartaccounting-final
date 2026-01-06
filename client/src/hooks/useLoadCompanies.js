import { useEffect, useRef } from 'react';
import { useCompany } from '../context/CompanyContext';
import { companiesAPI } from '../services/companiesAPI';

let sessionFetchAttempts = 0;

// Loads companies for the current user and sets them in context
export function useLoadCompanies() {
  const { setCompanies, companies } = useCompany();
  const companiesRef = useRef(companies);
  const loadAttemptedRef = useRef(false);
  const resolvedRef = useRef(false);

  useEffect(() => {
    companiesRef.current = companies;
  }, [companies]);

  useEffect(() => {
    if (resolvedRef.current || (companiesRef.current && companiesRef.current.length > 0)) {
      resolvedRef.current = true;
      return undefined;
    }

    if (loadAttemptedRef.current) {
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
        if (list.length > 0) {
          setCompanies(list);
        }
      } catch (err) {
        if (process.env.NODE_ENV === 'development') {
           
          console.warn('[useLoadCompanies] fetch error', err);
        }
      }
    };

    loadCompanies();

    return () => {
      cancelled = true;
    };
  }, [setCompanies]);
}
