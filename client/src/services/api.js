
import axios from 'axios';

/*
 * API contract v0.1
 * baseURL = /api/v1
 *
 * Public:
 *   POST /auth/login
 *   POST /auth/register
 *
 * Authenticated:
 *   GET /auth/me
 *   GET /dashboard/stats
 *
 * Companies:
 *   GET /companies
 *   PUT /companies
 *
 * Users:
 *   GET /users
 *   POST /users
 *   PUT /users/:userId
 *   DELETE /users/:userId
 *
 * Invoices:
 *   GET /invoices
 *   POST /invoices
 *   PUT /invoices/:invoiceId
 *
 * Bank statements:
 *   GET /bank-statements
 *   POST /bank-statements/import
 *   GET /bank-statements/:id/transactions
 *   POST /bank-statements/reconcile
 *   PUT /bank-statements/transactions/:id/categorize
 */


const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

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

const logError = (...args) => {
  if (import.meta.env.DEV) {
    console.error(...args);
  }
};

const logWarn = (...args) => {
  if (import.meta.env.DEV) {
    console.warn(...args);
  }
};

export const formatApiError = (
  error,
  fallbackMessage = 'An error occurred. Please try again.',
) => {
  const formatted = {
    status: error?.response?.status ?? null,
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

    const serverMessage =
      data?.message || (typeof data === 'string' && data.length ? data : null);
    if (serverMessage) {
      formatted.message = serverMessage;
    }

    if (status === 403) {
      formatted.type = 'forbidden';
      formatted.message = 'Not allowed';
      formatted.retryable = false;
    } else if (status === 429) {
      formatted.type = 'rate_limit';
      formatted.retryable = true;
      formatted.message =
        'Too many requests. Please wait a moment and try again.';
    } else if (status >= 500) {
      formatted.type = 'server_error';
      formatted.retryable = true;
      formatted.message =
        'Server is temporarily unavailable. Please try again shortly.';
    } else {
      formatted.type = 'http';
    }
  } else if (error.request) {
    formatted.retryable = true;
    formatted.type = 'network';
    formatted.message =
      'Unable to reach the server. Check your connection and try again.';
  } else if (error.message) {
    formatted.message = error.message;
  }

  return formatted;
};

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (import.meta.env.DEV) {
      console.log(
        `🚀 API Request: ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`,
      );
    }

    return config;
  },
  (error) => {
    logError('❌ Request interceptor error:', error);
    return Promise.reject(error);
  },
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    if (import.meta.env.DEV) {
      console.log(
        `✅ API Response: ${response.config.method?.toUpperCase()} ${response.config.url} - ${response.status}`,
      );
    }
    return response;
  },
  (error) => {
    if (error.response) {
      const { status, data } = error.response;

      logError(`❌ API Error ${status}:`, data);

      switch (status) {
        case 401:
          emitForceLogout();
          break;
        case 403:
          logError('🚫 Forbidden:', data?.message);
          break;
        case 404:
          logError('🔍 Not Found:', error.config.url);
          break;
        case 501:
          logWarn('🟡 Feature disabled in v0.1:', data?.feature);
          break;
        case 500:
          logError('🔥 Server error:', data?.message);
          break;
        default:
          logError(`⚠️ API Error ${status}:`, data?.message);
      }
    } else if (error.request) {
      logError('🌐 Network error - backend may be down:', error.message);
    } else {
      logError('❌ API request failed:', error.message);
    }

    return Promise.reject(error);
  },
);

export default api;
