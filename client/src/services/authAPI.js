import api, { SKIP_FORCE_LOGOUT_ON_401_FLAG } from './api';

export const authAPI = {
  refresh: async () => {
    // Try to refresh JWT using cookie-based refresh token
    const response = await api.post('/auth/refresh');
    return response.data;
  },
  login: async (credentials) => {
    const response = await api.post('/auth/login', credentials);
    return response.data;
  },
  logout: async () => {
    const response = await api.post('/auth/logout');
    return response.data;
  },
  register: async (userData) => {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },
  me: async () => {
    const response = await api.get('/auth/me', { [SKIP_FORCE_LOGOUT_ON_401_FLAG]: true });
    return response.data;
  },
};

export default authAPI;
