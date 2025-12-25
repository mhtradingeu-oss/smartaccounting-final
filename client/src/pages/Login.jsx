import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import Button from '../components/Button';
import Card from '../components/Card';
import Footer from '../components/Footer';
import RateLimitBanner from '../components/RateLimitBanner';

const Login = () => {
  const navigate = useNavigate();
  const { login, loading, rateLimit, rateLimitMessage } = useAuth();
  const loginDisabled = import.meta.env.VITE_DISABLE_LOGIN === 'true';
  useEffect(() => {
    if (loginDisabled) {
      window.location.href = '/dashboard';
    }
  }, [loginDisabled]);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    remember: false,
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    if (error) {
      setError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.email || !formData.password) {
      setError('Please fill in all fields');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const result = await login(formData);
      if (result.success) {
        // Always redirect to dashboard after login
        navigate('/dashboard', { replace: true });
      } else {
        setError(result.error || 'Login failed. Please check your credentials.');
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Login error:', error);
      }
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loginDisabled) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 px-4 py-8">
      <div className="w-full max-w-md">
        {rateLimit && <RateLimitBanner message={rateLimitMessage} />}
        <Card className="p-8 flex flex-col items-center gap-6 shadow-lg border-0">
          <img
            src="/brand/logo.png"
            alt="SmartAccounting Logo"
            className="max-h-16 w-auto mx-auto mb-2 object-contain"
            style={{ maxHeight: 64 }}
          />
          <h1 className="text-3xl font-extrabold text-blue-700 dark:text-blue-300 mb-1 tracking-tight">
            SmartAccounting
          </h1>
          <p className="text-base text-gray-600 dark:text-gray-300 font-medium mb-2 text-center">
            Modern Accounting. Smarter Decisions.
          </p>
          <form className="w-full space-y-5" onSubmit={handleSubmit} autoComplete="on">
            <div className="form-group">
              <label htmlFor="email" className="form-label font-semibold">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="input input-lg w-full"
                placeholder="Enter your email"
                value={formData.email}
                onChange={handleChange}
                disabled={isSubmitting}
              />
            </div>
            <div className="form-group relative">
              <label htmlFor="password" className="form-label font-semibold">
                Password
              </label>
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                className="input input-lg w-full pr-12"
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleChange}
                disabled={isSubmitting}
              />
              <button
                type="button"
                tabIndex={-1}
                className="absolute right-3 top-9 text-gray-400 hover:text-blue-600 focus:outline-none"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13.875 18.825A10.05 10.05 0 0112 19c-5.523 0-10-4.477-10-10 0-1.657.336-3.236.938-4.675m1.675-2.325A9.956 9.956 0 0112 3c5.523 0 10 4.477 10 10 0 1.657-.336 3.236-.938 4.675m-1.675 2.325A9.956 9.956 0 0112 21c-5.523 0-10-4.477-10-10 0-1.657.336-3.236.938-4.675"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13.875 18.825A10.05 10.05 0 0112 19c-5.523 0-10-4.477-10-10 0-1.657.336-3.236.938-4.675m1.675-2.325A9.956 9.956 0 0112 3c5.523 0 10 4.477 10 10 0 1.657-.336 3.236-.938 4.675m-1.675 2.325A9.956 9.956 0 0112 21c-5.523 0-10-4.477-10-10 0-1.657.336-3.236.938-4.675"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4.271 4.271l15.458 15.458"
                    />
                  </svg>
                )}
              </button>
            </div>
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="remember"
                  checked={formData.remember}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  className="form-checkbox rounded"
                />
                Remember me
              </label>
            </div>
            {error && (
              <div className="form-error alert alert-danger text-center">
                <span className="font-semibold">{error}</span>
              </div>
            )}
            <Button
              type="submit"
              variant="primary"
              size="large"
              disabled={isSubmitting}
              loading={isSubmitting}
              className="w-full text-base font-semibold mt-2"
            >
              Sign In
            </Button>
          </form>
          <div className="text-xs text-gray-400 mt-2 text-center">
            Secure • GDPR Compliant • Germany
          </div>
        </Card>
        <Footer />
      </div>
    </div>
  );
};

export default Login;
