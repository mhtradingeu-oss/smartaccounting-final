const ACTIVE_COMPANY_STORAGE_KEY = 'activeCompanyId';

const safeGetItem = (storage) => {
  if (!storage) {
    return null;
  }
  try {
    return storage.getItem(ACTIVE_COMPANY_STORAGE_KEY);
  } catch {
    return null;
  }
};

const safeSetItem = (storage, value) => {
  if (!storage) {
    return;
  }
  try {
    storage.setItem(ACTIVE_COMPANY_STORAGE_KEY, value);
  } catch {
    // ignore failures (e.g., storage disabled)
  }
};

const safeRemoveItem = (storage) => {
  if (!storage) {
    return;
  }
  try {
    storage.removeItem(ACTIVE_COMPANY_STORAGE_KEY);
  } catch {
    // ignore failures (e.g., storage disabled)
  }
};

const normalizeToInteger = (value) => {
  if (value === undefined || value === null) {
    return null;
  }
  const stringValue = typeof value === 'string' ? value.trim() : String(value);
  if (stringValue === '') {
    return null;
  }
  const parsed = Number(stringValue);
  return Number.isInteger(parsed) ? parsed : null;
};

export const parseCompanyId = normalizeToInteger;

export const getStoredActiveCompanyId = () => {
  if (typeof window === 'undefined') {
    return null;
  }

  const fromMemory = normalizeToInteger(window.__ACTIVE_COMPANY_ID__);
  if (fromMemory !== null) {
    return fromMemory;
  }

  const fromLocal = normalizeToInteger(safeGetItem(window.localStorage));
  if (fromLocal !== null) {
    window.__ACTIVE_COMPANY_ID__ = fromLocal;
    return fromLocal;
  }

  const fromSession = normalizeToInteger(safeGetItem(window.sessionStorage));
  if (fromSession !== null) {
    window.__ACTIVE_COMPANY_ID__ = fromSession;
  }
  return fromSession;
};

export const setStoredActiveCompanyId = (value) => {
  const normalized = normalizeToInteger(value);
  if (normalized === null) {
    clearStoredActiveCompanyId();
    return;
  }

  if (typeof window !== 'undefined') {
    window.__ACTIVE_COMPANY_ID__ = normalized;
  }
  const stringValue = String(normalized);
  safeSetItem(typeof window !== 'undefined' ? window.localStorage : null, stringValue);
  safeSetItem(typeof window !== 'undefined' ? window.sessionStorage : null, stringValue);
};

export const clearStoredActiveCompanyId = () => {
  if (typeof window === 'undefined') {
    return;
  }
  window.__ACTIVE_COMPANY_ID__ = null;
  safeRemoveItem(window.localStorage);
  safeRemoveItem(window.sessionStorage);
};

export { ACTIVE_COMPANY_STORAGE_KEY };
