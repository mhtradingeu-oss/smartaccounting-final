
import appVersionData from '../../appVersion.json';
import { isAIAssistantEnabled } from './featureFlags';

/*
 * v0.1 scope definition:
 * - Enabled: Auth, company profile, user management, invoices, dashboard stats, bank statements.
 * - Disabled: VAT/tax reporting, Stripe billing, German compliance/Elster exports.
 * - Out of scope: analytics intelligence, OCR automation, multi-entity billing.
 * Disabled flows present a "Not available in v0.1" notice and never emit network calls.
 */

export const APP_VERSION = appVersionData.APP_VERSION;

export const FEATURE_FLAGS = {
  GERMAN_TAX: { enabled: false, label: 'German VAT/Tax reporting' },
  STRIPE_BILLING: { enabled: false, label: 'Stripe billing' },
  ELSTER_COMPLIANCE: { enabled: false, label: 'Elster/compliance' },
  AI_ASSISTANT: { enabled: isAIAssistantEnabled(), label: 'AI Assistant' },
};

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
  },
  USERS: '/users',
  COMPANIES: '/companies',
  INVOICES: '/invoices',
  DASHBOARD: '/dashboard',
  STRIPE: '/stripe',
};

export const USER_ROLES = {
  ADMIN: 'admin',
  ACCOUNTANT: 'accountant',
  AUDITOR: 'auditor',
  VIEWER: 'viewer',
};

export const SUBSCRIPTION_PLANS = {
  BASIC: 'basic',
  PRO: 'pro',
  ENTERPRISE: 'enterprise',
};

export const THEME = {
  COLORS: {
    PRIMARY: '#3B82F6',
    SECONDARY: '#6B7280',
    SUCCESS: '#10B981',
    WARNING: '#F59E0B',
    ERROR: '#EF4444',
  },
  BREAKPOINTS: {
    SM: '640px',
    MD: '768px',
    LG: '1024px',
    XL: '1280px',
  },
};

export const VALIDATION = {
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PASSWORD_MIN_LENGTH: 8,
  PHONE_REGEX: /^\+?[\d\s-()]+$/,
};

export const STORAGE_KEYS = {
  AUTH_TOKEN: 'smartaccounting_token',
  USER_DATA: 'smartaccounting_user',
  LANGUAGE: 'smartaccounting_language',
  THEME: 'smartaccounting_theme',
};
