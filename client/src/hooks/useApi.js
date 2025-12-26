import { useState, useCallback } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export const useApi = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { logout } = useAuth();

  const request = useCallback(
    async (apiCall) => {
      setLoading(true);
      setError(null);

      try {
        const response = await apiCall();
        return response.data;
      } catch (err) {
        if (err.response?.status === 401) {
          logout();
          // Instead of returning null, throw an error for consistent error handling
          throw new Error('Session expired. Please log in again.');
        }

        const errorMessage = err.response?.data?.message || err.message || 'An error occurred';
        setError(errorMessage);
        throw new Error(errorMessage);
      } finally {
        setLoading(false);
      }
    },
    [logout],
  );

  const get = useCallback(
    (url, config = {}) => {
      return request(() => api.get(url, config));
    },
    [request],
  );

  const post = useCallback(
    (url, data = {}, config = {}) => {
      return request(() => api.post(url, data, config));
    },
    [request],
  );

  const put = useCallback(
    (url, data = {}, config = {}) => {
      return request(() => api.put(url, data, config));
    },
    [request],
  );

  const del = useCallback(
    (url, config = {}) => {
      return request(() => api.delete(url, config));
    },
    [request],
  );

  return {
    loading,
    error,
    get,
    post,
    put,
    delete: del,
    clearError: () => setError(null),
  };
};
