import axios from 'axios';

/**
 * API BASE URL
 * - Production: /api (Nginx proxy)
 * - Dev: VITE_API_URL (required for docker/dev setups)
 */
const viteApiUrl = import.meta.env.VITE_API_URL?.trim();
export const API_BASE_URL = viteApiUrl || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  withCredentials: true, // required for cookies / auth
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

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

    if (data?.message) {
      formatted.message = data.message;
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
api.interceptors.response.use(
  (response) => {
    if (isDev) {
      console.log(`⬅️ ${response.status} ${response.config.url}`);
    }
    return response;
  },
  (error) => {
    if (error.response) {
      const { status } = error.response;

      logError(`❌ API Error ${status}`, error.response.data);

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
