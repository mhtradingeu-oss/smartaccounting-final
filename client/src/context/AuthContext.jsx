import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { logger } from '../lib/logger';
import { authAPI } from '../services/authAPI';
import { AUTH_FORCE_LOGOUT_EVENT } from '../services/api';

// Create the AuthContext
const AuthContext = createContext();

// AuthProvider component
export const AuthProvider = ({ children }) => {
  const [authState, setAuthState] = useState({
    status: 'checking',
    user: null,
    token: null,
    rateLimit: false,
    rateLimitMessage: '',
  });

  const applyAuthenticated = useCallback((user, token) => {
    if (token) {
      localStorage.setItem('token', token);
    }
    setAuthState((prev) => ({
      ...prev,
      status: 'authenticated',
      user,
      token,
      rateLimit: false,
      rateLimitMessage: '',
    }));
  }, []);

  const applyUnauthenticated = useCallback(() => {
    localStorage.removeItem('token');
    setAuthState((prev) => ({
      ...prev,
      status: 'unauthenticated',
      user: null,
      token: null,
      rateLimit: false,
      rateLimitMessage: '',
    }));
  }, []);

  useEffect(() => {
    const restoreSession = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        applyUnauthenticated();
        return;
      }

      try {
        const response = await authAPI.me();
        const payload = response?.data ?? response;
        if (payload?.success && payload.user) {
          applyAuthenticated(payload.user, token);
          return;
        }

        // Try silent refresh if token expired
        if (payload?.message?.toLowerCase().includes('expired')) {
          try {
            const refreshResp = await authAPI.refresh();
            if (refreshResp?.success && refreshResp.token) {
              localStorage.setItem('token', refreshResp.token);
              const meResp = await authAPI.me();
              if (meResp?.success && meResp.user) {
                applyAuthenticated(meResp.user, refreshResp.token);
                return;
              }
            }
          } catch (refreshErr) {
            logger.error('Silent refresh failed:', refreshErr);
          }
        }

        applyUnauthenticated();
      } catch (error) {
        if (error?.response?.data?.message?.toLowerCase().includes('expired')) {
          try {
            const refreshResp = await authAPI.refresh();
            if (refreshResp?.success && refreshResp.token) {
              localStorage.setItem('token', refreshResp.token);
              const meResp = await authAPI.me();
              if (meResp?.success && meResp.user) {
                applyAuthenticated(meResp.user, refreshResp.token);
                return;
              }
            }
          } catch (refreshErr) {
            logger.error('Silent refresh failed:', refreshErr);
          }
        }
        logger.error('Auth restore failed:', error);
        applyUnauthenticated();
      }
    };

    restoreSession();
  }, [applyAuthenticated, applyUnauthenticated]);

  useEffect(() => {
    const handleForceLogout = () => {
      applyUnauthenticated();
    };

    window.addEventListener(AUTH_FORCE_LOGOUT_EVENT, handleForceLogout);
    return () => {
      window.removeEventListener(AUTH_FORCE_LOGOUT_EVENT, handleForceLogout);
    };
  }, [applyUnauthenticated]);

  const login = async (credentials) => {
    setAuthState((prev) => ({ ...prev, status: 'checking' }));
    try {
      const response = await authAPI.login(credentials);
      const payload = response?.data ?? response;

      if (payload?.success && payload.token && payload.user) {
        applyAuthenticated(payload.user, payload.token);
        logger.info('Login successful');
        return { success: true, user: payload.user };
      }

      // Cookie-based fallback (if token not returned)
      if (payload?.success && payload.user) {
        applyAuthenticated(payload.user, null);
        logger.info('Login successful (cookie)');
        return { success: true, user: payload.user };
      }

      applyUnauthenticated();
      return { success: false, error: payload?.message || 'Login failed' };
    } catch (error) {
      logger.error('Login failed:', error);
      // Handle rate limit error
      if (error?.response?.status === 429) {
        setAuthState((prev) => ({
          ...prev,
          rateLimit: true,
          rateLimitMessage:
            error.response?.data?.message || 'Too many requests. Please wait and try again.',
        }));
      } else {
        applyUnauthenticated();
      }
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Login failed',
      };
    }
  };

  const logout = useCallback(async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      logger.warn('Logout request failed:', error);
    } finally {
      applyUnauthenticated();
      logger.info('User logged out');
    }
  }, [applyUnauthenticated]);

  const value = {
    user: authState.user,
    status: authState.status,
    token: authState.token,
    loading: authState.status === 'checking',
    isAuthenticated: authState.status === 'authenticated',
    rateLimit: authState.rateLimit,
    rateLimitMessage: authState.rateLimitMessage,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// useAuth hook
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Default export
export default AuthContext;
