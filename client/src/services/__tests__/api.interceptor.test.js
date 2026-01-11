import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest';
import api, { SKIP_FORCE_LOGOUT_ON_401_FLAG } from '../api';

const getRequestInterceptor = () => api.interceptors.request.handlers.at(-1).fulfilled;
const getResponseInterceptor = () => api.interceptors.response.handlers.at(-1).rejected;

describe('api interceptors', () => {
  let originalLocation;
  let replaceSpy;
  let dispatchSpy;

  beforeEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
    window.localStorage.setItem('token', 'test-token');

    originalLocation = window.location;
    replaceSpy = vi.fn();
    dispatchSpy = vi.spyOn(window, 'dispatchEvent');

    Object.defineProperty(window, 'location', {
      value: { ...originalLocation, pathname: '/dashboard', replace: replaceSpy },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      value: originalLocation,
      writable: true,
      configurable: true,
    });
  });

  it('omits Authorization header for auth routes', async () => {
    const requestInterceptor = getRequestInterceptor();
    const config = await requestInterceptor({ url: '/auth/login', headers: {} });

    expect(config.headers.Authorization).toBeUndefined();
  });

  it('attaches Authorization header for protected routes', async () => {
    const requestInterceptor = getRequestInterceptor();
    const config = await requestInterceptor({ url: '/invoices', headers: {} });

    expect(config.headers.Authorization).toBe('Bearer test-token');
  });

  it('does not force logout on 401 from /auth/login', async () => {
    const responseInterceptor = getResponseInterceptor();
    const error = {
      response: { status: 401, headers: {} },
      config: { url: '/auth/login', [SKIP_FORCE_LOGOUT_ON_401_FLAG]: true },
    };

    await expect(responseInterceptor(error)).rejects.toBe(error);

    expect(window.localStorage.getItem('token')).toBe('test-token');
    expect(dispatchSpy).not.toHaveBeenCalled();
    expect(replaceSpy).not.toHaveBeenCalled();
  });

  it('forces logout on 401 from protected APIs', async () => {
    const responseInterceptor = getResponseInterceptor();
    const error = {
      response: { status: 401, headers: {} },
      config: { url: '/invoices' },
    };

    await expect(responseInterceptor(error)).rejects.toBe(error);

    expect(window.localStorage.getItem('token')).toBeNull();
    expect(dispatchSpy).toHaveBeenCalled();
    expect(replaceSpy).toHaveBeenCalledWith('/login');
  });
});
