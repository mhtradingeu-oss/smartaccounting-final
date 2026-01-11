import axios from 'axios';
import { getSafeErrorMeta } from '../lib/errorMeta';
import { getStoredActiveCompanyId } from '../lib/companyStorage';

/**
 * API BASE URL
 * - Production: /api (Nginx proxy)
 * - Dev: VITE_API_URL (required for docker/dev setups)
 */

const raw = import.meta.env.VITE_API_URL?.trim();
let API_BASE_URL = '/api';

if (raw) {
  const isSafe = /^https?:\/\/(localhost|127\.0\.0\.1):\d+\/api$/.test(raw);
  if (typeof window !== 'undefined' && raw.includes('backend:')) {
    throw new Error(
      'VITE_API_URL must not use docker service names in browser. Use http://localhost:5001/api or leave empty.',
    );
  }
  if (isSafe) {
    API_BASE_URL = raw;
  } else {
    console.warn(
      `[api] Invalid VITE_API_URL "${raw}". Docker service names are not allowed in browser. Falling back to "/api".`,
    );
  }
} else {
  console.info('[api] Using "/api" via Vite proxy');
}

export { API_BASE_URL };

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  withCredentials: true, // required for cookies / auth
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

const COMPANY_ID_HEADER = 'X-Company-Id';
const COMPANY_OPTIONAL_ROUTES = [
  '/auth',
  '/system',
  '/monitoring',
  '/telemetry',
  '/logs',
  '/email-test',
  '/public',
];

const isCompanyOptionalRoute = (path) =>
  COMPANY_OPTIONAL_ROUTES.some((prefix) => path.startsWith(prefix));

const normalizePath = (urlValue) => {
  if (typeof urlValue !== 'string') {
    return '';
  }
  if (urlValue.startsWith('http')) {
    try {
      return new URL(urlValue).pathname;
    } catch {
      return '';
    }
  }
  return urlValue;
};

/* ================================
   AUTH FORCE LOGOUT EVENT
================================ */
export const AUTH_FORCE_LOGOUT_EVENT = 'smartaccounting:force-logout';

const emitForceLogout = () => {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.removeItem('token');
  window.dispatchEvent(new CustomEvent(AUTH_FORCE_LOGOUT_EVENT));

  if (window.location.pathname !== '/login') {
    window.location.replace('/login');
  }
};

/* ================================
   DEV LOGGING (SAFE)
================================ */
const isDev = import.meta.env.DEV;

const logError = (...args) => {
  if (isDev) {
    console.error(...args);
  }
};

/* ================================
   API ERROR FORMATTER
================================ */
export const formatApiError = (error, fallbackMessage = 'An error occurred. Please try again.') => {
  const formatted = {
    status: null,
    message: fallbackMessage,
    retryable: false,
    type: 'generic',
  };

  if (!error) {
    return formatted;
  }

  if (error.response) {
    const { status, data } = error.response;
    formatted.status = status;

    // Keep fallback message or type-specific overrides only

    const errorCode = data?.code || data?.errorCode;
    if (errorCode === 'PLAN_RESTRICTED') {
      formatted.type = 'plan_restricted';
      formatted.message = data?.message || fallbackMessage;
      formatted.feature = data?.feature || null;
      formatted.plan = data?.plan || null;
      formatted.upgradePath = data?.upgradePath || '/pricing';
      formatted.retryable = false;
      return formatted;
    }

    if (status === 401) {
      formatted.type = 'unauthorized';
    } else if (status === 403) {
      formatted.type = 'forbidden';
      formatted.message = 'Not allowed';
    } else if (status === 429) {
      formatted.type = 'rate_limit';
      formatted.retryable = true;
      formatted.message = 'Too many requests. Please try again later.';
    } else if (status >= 500) {
      formatted.type = 'server_error';
      formatted.retryable = true;
      formatted.message = 'Server is temporarily unavailable. Please try again shortly.';
    } else {
      formatted.type = 'http';
    }
  } else if (error.request) {
    formatted.type = 'network';
    formatted.retryable = true;

    formatted.message = 'Unable to reach the server. Check your connection and try again.';
  } else if (error.message) {
    formatted.message = error.message;
  }

  return formatted;
};

/* ================================
   REQUEST INTERCEPTOR
================================ */
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    const path = normalizePath(config.url);
    if (!isCompanyOptionalRoute(path)) {
    const existingCompanyHeader =
      config.headers?.[COMPANY_ID_HEADER] || config.headers?.[COMPANY_ID_HEADER.toLowerCase()];
    const companyId = getStoredActiveCompanyId();
      if (!existingCompanyHeader) {
        if (!companyId) {
          const err = new Error('Company context is required for this request.');
          err.code = 'COMPANY_HEADER_REQUIRED';
          return Promise.reject(err);
        }
        if (!config.headers) {
          config.headers = {};
        }
        config.headers[COMPANY_ID_HEADER] = companyId;
      } else if (companyId && String(existingCompanyHeader) !== String(companyId)) {
        const err = new Error('Company context mismatch detected.');
        err.code = 'COMPANY_HEADER_MISMATCH';
        return Promise.reject(err);
      }
    }

    if (isDev) {
      console.log(`➡️ ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
    }

    return config;
  },
  (error) => {
    logError('❌ Request error:', error);
    return Promise.reject(error);
  },
);

/* ================================
   RESPONSE INTERCEPTOR
================================ */
// Global for last requestId (safe, not PII)
if (typeof window !== 'undefined') {
  window.__LAST_REQUEST_ID__ = null;
}

api.interceptors.response.use(
  (response) => {
    // Capture X-Request-Id from headers
    const reqId = response.headers?.['x-request-id'] || response.headers?.['X-Request-Id'];
    if (reqId && typeof window !== 'undefined') {
      window.__LAST_REQUEST_ID__ = reqId;
    }
    if (isDev) {
      console.log(`⬅️ ${response.status} ${response.config.url}`);
    }
    return response;
  },
  (error) => {
    // Also try to capture from error responses
    const reqId =
      error?.response?.headers?.['x-request-id'] || error?.response?.headers?.['X-Request-Id'];
    if (reqId && typeof window !== 'undefined') {
      window.__LAST_REQUEST_ID__ = reqId;
    }
    if (error.response) {
      const { status } = error.response;
      logError(`❌ API Error ${status}`, getSafeErrorMeta(error));
      if (status === 401) {
        emitForceLogout();
      }
    } else if (error.request) {
      logError('🌐 Network error:', error.message);
    } else {
      logError('❌ Unknown API error:', error.message);
    }
    return Promise.reject(error);
  },
);

export default api;
