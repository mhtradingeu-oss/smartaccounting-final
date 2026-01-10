import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import Button from '../components/Button';
import Card from '../components/Card';
import Footer from '../components/Footer';
import RateLimitBanner from '../components/RateLimitBanner';
import { EmptyState } from '../components/ui/EmptyState';
import { Input } from '../components/ui/Input';
import { getSafeErrorMeta } from '../lib/errorMeta';
import { getDefaultRouteForUser } from '../lib/systemAdmin';

const Login = () => {
  const navigate = useNavigate();
  const { login, loading, rateLimit, rateLimitMessage } = useAuth();
  const loginDisabled = import.meta.env.VITE_DISABLE_LOGIN === 'true';
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    remember: false,
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [forgotMessage, setForgotMessage] = useState('');

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
        navigate(getDefaultRouteForUser(result.user), { replace: true });
      } else {
        setError(result.error || 'Login failed. Please check your credentials.');
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Login error', getSafeErrorMeta(error));
      }
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loginDisabled) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 py-8">
        <EmptyState
          title="Login temporarily paused"
          description="Sign-ins are disabled right now while we work on the next secure session rollout. Please try again shortly or contact support."
          action={
            <Button
              variant="primary"
              disabled
              className="cursor-not-allowed uppercase tracking-widest"
            >
              Coming soon
            </Button>
          }
        />
      </div>
    );
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
            className="max-h-125 w-auto mx-auto mb-2 object-contain"
            style={{ maxHeight: 125 }}
          />
          <h1 className="text-3xl font-extrabold text-blue-700 dark:text-blue-300 mb-1 tracking-tight">
            SmartAccounting
          </h1>
          <p className="text-base text-gray-600 dark:text-gray-300 font-medium mb-2 text-center">
            Modern Accounting. Smarter Decisions.
          </p>
          <form
            className="w-full space-y-5"
            onSubmit={handleSubmit}
            autoComplete="on"
            aria-describedby={error ? 'login-error' : undefined}
          >
            <div className="space-y-2">
              <label
                htmlFor="email"
                className="text-sm font-semibold text-gray-700 dark:text-gray-200"
              >
                Email
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="hello@demo.com"
                value={formData.email}
                onChange={handleChange}
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <label
                htmlFor="password"
                className="text-sm font-semibold text-gray-700 dark:text-gray-200"
              >
                Password
              </label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  style={{ paddingRight: '3rem' }}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded"
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
            </div>
            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 font-medium text-gray-600 dark:text-gray-300">
                <input
                  type="checkbox"
                  name="remember"
                  checked={formData.remember}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                Remember me
              </label>
              <button
                type="button"
                className="text-sm font-semibold text-primary-600 hover:text-primary-500 focus:outline-none focus-visible:underline"
                onClick={() =>
                  setForgotMessage(
                    'Forgot password support is coming soon. Contact support@smartaccounting.de for a reset.',
                  )
                }
              >
                Forgot password?
              </button>
            </div>
            {forgotMessage && (
              <p className="text-xs text-primary-600" role="status">
                {forgotMessage}
              </p>
            )}
            {error && (
              <div
                id="login-error"
                className="rounded bg-red-50 border border-red-200 py-3 px-4 text-center text-sm font-semibold text-red-700"
                role="alert"
                aria-live="assertive"
              >
                {error}
              </div>
            )}
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={isSubmitting}
              loading={isSubmitting}
              className="w-full text-base font-semibold mt-2"
            >
              {isSubmitting ? 'Signing in…' : 'Sign In'}
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
