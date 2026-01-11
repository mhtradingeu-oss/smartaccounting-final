import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '../AuthContext';
import { authAPI } from '../../services/authAPI';
import { companiesAPI } from '../../services/companiesAPI';

vi.mock('../../services/authAPI', () => ({
  authAPI: {
    login: vi.fn(),
    logout: vi.fn(),
    me: vi.fn(),
    refresh: vi.fn(),
  },
}));

vi.mock('../../services/companiesAPI', () => ({
  companiesAPI: {
    clearCache: vi.fn(),
  },
}));

vi.mock('../../lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
  });

  it('stores token only after successful login', async () => {
    authAPI.login.mockResolvedValue({ success: true, token: 'jwt-123', user: { id: 1 } });

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    await act(async () => {
      await result.current.login({ email: 'demo@example.com', password: 'pw' });
    });

    expect(window.localStorage.getItem('token')).toBe('jwt-123');
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user).toEqual(expect.objectContaining({ id: 1 }));
  });

  it('clears token on failed login', async () => {
    window.localStorage.setItem('token', 'stale-token');
    authAPI.me.mockResolvedValueOnce({ success: false });
    authAPI.login.mockRejectedValue({
      response: { status: 401, data: { message: 'Invalid credentials' } },
    });

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    await act(async () => {
      await result.current.login({ email: 'demo@example.com', password: 'wrong' });
    });

    expect(window.localStorage.getItem('token')).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.status).toBe('unauthenticated');
    expect(companiesAPI.clearCache).toHaveBeenCalled();
  });
});
