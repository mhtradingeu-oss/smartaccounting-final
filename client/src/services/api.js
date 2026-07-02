import axios from 'axios';
import { getStoredActiveCompanyId } from '../lib/companyStorage';

export const API_BASE_URL = '/api';
export const AUTH_FORCE_LOGOUT_EVENT = 'AUTH_FORCE_LOGOUT';
export const SKIP_FORCE_LOGOUT_ON_401_FLAG = '__skip_logout__';

export function formatApiError(error, fallback = 'API Error') {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.response?.data?.code ||
    error?.message ||
    fallback
  );
}

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  if (!config.headers) {
    config.headers = {};
  }

  const path = typeof config.url === 'string' ? config.url.split('?')[0] : '';
  const publicAuthRoutes = ['/auth/login', '/auth/register', '/auth/refresh'];
  if (!publicAuthRoutes.includes(path)) {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }

  const companyId = getStoredActiveCompanyId();
  if (companyId) {
    config.headers['X-Company-Id'] = companyId;
  }

  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const skip = err?.config?.[SKIP_FORCE_LOGOUT_ON_401_FLAG];

    if (err?.response?.status === 401 && !skip) {
      window.dispatchEvent(new Event(AUTH_FORCE_LOGOUT_EVENT));
    }

    return Promise.reject(err);
  },
);

export { api };
export default api;
