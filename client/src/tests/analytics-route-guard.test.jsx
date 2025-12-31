import React from 'react';
import { render, screen } from '@testing-library/react';
import { Routes, Route, MemoryRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';

import ProtectedRoute from '../components/ProtectedRoute';
import AuthContext from '../context/AuthContext';

describe('Analytics route guard', () => {
  it('redirects unauthenticated visitors to login', () => {
    render(
      <AuthContext.Provider
        value={{
          status: 'unauthenticated',
          user: null,
          token: null,
          isAuthenticated: false,
          loading: false,
          login: () => {},
          logout: () => {},
          rateLimit: false,
          rateLimitMessage: '',
        }}
      >
        <MemoryRouter initialEntries={['/analytics']}>
          <Routes>
            <Route path="/login" element={<div>Login page</div>} />
            <Route
              path="/analytics"
              element={
                <ProtectedRoute>
                  <div>Analytics page</div>
                </ProtectedRoute>
              }
            />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>,
    );

    expect(screen.getByText(/Login page/i)).toBeInTheDocument();
  });
});
