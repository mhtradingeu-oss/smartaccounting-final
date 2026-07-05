import {
  HomeIcon,
  DocumentChartBarIcon,
  DocumentTextIcon,
  CreditCardIcon,
  BanknotesIcon,
  BuildingOfficeIcon,
  UsersIcon,
  ShieldCheckIcon,
  ArrowDownTrayIcon,
  UserCircleIcon,
  DocumentMagnifyingGlassIcon,
  SparklesIcon,
  LightBulbIcon,
  ChatBubbleLeftRightIcon,
} from '@heroicons/react/24/outline';
import {
  HomeIcon as HomeIconSolid,
  DocumentChartBarIcon as DocumentChartBarIconSolid,
  DocumentTextIcon as DocumentTextIconSolid,
  CreditCardIcon as CreditCardIconSolid,
  BanknotesIcon as BanknotesIconSolid,
  BuildingOfficeIcon as BuildingOfficeIconSolid,
  UsersIcon as UsersIconSolid,
  ShieldCheckIcon as ShieldCheckIconSolid,
  ArrowDownTrayIcon as ArrowDownTrayIconSolid,
  UserCircleIcon as UserCircleIconSolid,
  DocumentMagnifyingGlassIcon as DocumentMagnifyingGlassIconSolid,
  SparklesIcon as SparklesIconSolid,
  LightBulbIcon as LightBulbIconSolid,
  ChatBubbleLeftRightIcon as ChatBubbleLeftRightIconSolid,
} from '@heroicons/react/24/solid';
import { FEATURE_FLAGS } from '../lib/constants';
import { isOCRPreviewEnabled } from '../lib/featureFlags';
import { roles } from '../context/RoleContext';

const isAdminRole = (role) => role === roles.ADMIN || role === roles.SUPER_ADMIN;

export const CORE_NAVIGATION_ITEMS = [
  {
    nameKey: 'navigation.dashboard',
    href: '/dashboard',
    icon: HomeIcon,
    iconSolid: HomeIconSolid,
    badge: null,
    description: 'Dashboard overview and analytics',
    enabled: true,
  },
];

export const SYSTEM_ADMIN_NAVIGATION_ITEMS = [
  {
    nameKey: 'navigation.system_admin_dashboard',
    href: '/system-admin',
    icon: HomeIcon,
    iconSolid: HomeIconSolid,
    badge: null,
    description: 'Platform overview and system governance',
    enabled: true,
  },
];

export const ACCOUNTING_NAVIGATION_ITEMS = [
  {
    nameKey: 'navigation.invoices',
    href: '/invoices',
    icon: DocumentTextIcon,
    iconSolid: DocumentTextIconSolid,
    badge: null,
    description: 'Invoices',
    enabled: ({ role }) => role !== roles.VIEWER,
    disabledReason: 'Value operations are limited to accountant or admin roles.',
  },
  {
    nameKey: 'navigation.expenses',
    href: '/expenses',
    icon: CreditCardIcon,
    iconSolid: CreditCardIconSolid,
    badge: null,
    description: 'Expenses',
    enabled: true,
  },
  {
    nameKey: 'navigation.bank_statements',
    href: '/bank-statements',
    icon: BanknotesIcon,
    iconSolid: BanknotesIconSolid,
    badge: null,
    description: 'Bank Statements',
    enabled: true,
  },
  {
    nameKey: 'navigation.document_inbox',
    href: '/documents/inbox',
    icon: DocumentMagnifyingGlassIcon,
    iconSolid: DocumentMagnifyingGlassIconSolid,
    badge: 'AI',
    description: 'AI document intake inbox',
    enabled: true,
  },
  {
    nameKey: 'navigation.ocr_preview',
    href: '/ocr-preview',
    icon: ArrowDownTrayIcon,
    iconSolid: ArrowDownTrayIconSolid,
    badge: 'Preview',
    description: 'OCR Preview',
    enabled: isOCRPreviewEnabled,
    disabledReason: 'OCR preview is toggled by the dedicated feature flag.',
  },
];

export const INTELLIGENCE_NAVIGATION_ITEMS = [
  {
    nameKey: 'navigation.ai_manager',
    href: '/ai-manager',
    icon: SparklesIcon,
    iconSolid: SparklesIconSolid,
    badge: 'AI',
    description: 'AI Accounting Manager command center',
    highlight: true,
    enabled: true,
  },
  {
    nameKey: 'navigation.ai_insights',
    href: '/ai-advisor',
    icon: LightBulbIcon,
    iconSolid: LightBulbIconSolid,
    badge: 'AI',
    description: 'AI insights and accounting risks',
    enabled: true,
  },
  {
    nameKey: 'navigation.ai_assistant',
    href: '/ai-assistant',
    icon: ChatBubbleLeftRightIcon,
    iconSolid: ChatBubbleLeftRightIconSolid,
    badge: 'AI',
    description: 'AI Assistant',
    enabled: true,
  },
  {
    nameKey: 'navigation.analytics',
    href: '/analytics',
    icon: DocumentChartBarIcon,
    iconSolid: DocumentChartBarIconSolid,
    badge: null,
    description: 'Business analytics & KPIs',
    enabled: true,
  },
];

export const ADMINISTRATION_NAVIGATION_ITEMS = [
  {
    nameKey: 'navigation.companies',
    href: '/companies',
    icon: BuildingOfficeIcon,
    iconSolid: BuildingOfficeIconSolid,
    badge: null,
    description: 'Companies directory',
    enabled: true,
  },
  {
    nameKey: 'navigation.users',
    href: '/users',
    icon: UsersIcon,
    iconSolid: UsersIconSolid,
    badge: null,
    description: 'User management',
    enabled: ({ role }) => isAdminRole(role),
    disabledReason: 'Only administrators can edit users.',
  },
  {
    nameKey: 'navigation.billing',
    href: '/billing',
    icon: CreditCardIcon,
    iconSolid: CreditCardIconSolid,
    badge: null,
    description: 'Billing',
    enabled: () => FEATURE_FLAGS.STRIPE_BILLING.enabled,
    disabledReason: 'Stripe billing flows open when the billing feature flag turns on.',
  },
  {
    nameKey: 'navigation.profile',
    href: '/profile-settings',
    icon: UserCircleIcon,
    iconSolid: UserCircleIconSolid,
    badge: null,
    description: 'Profile',
    enabled: true,
  },
];

export const COMPLIANCE_NAVIGATION_ITEMS = [
  {
    nameKey: 'navigation.smart_review',
    href: '/review-center',
    icon: DocumentMagnifyingGlassIcon,
    iconSolid: DocumentMagnifyingGlassIconSolid,
    badge: 'Review',
    description: 'Smart Review Center',
    enabled: true,
  },
  {
    nameKey: 'navigation.tax_bridge',
    href: '/tax-bridge',
    icon: ShieldCheckIcon,
    iconSolid: ShieldCheckIconSolid,
    badge: 'Bridge',
    description: 'Tax readiness cockpit',
    enabled: true,
  },
  {
    nameKey: 'navigation.tax_reports',
    href: '/german-tax-reports',
    icon: DocumentChartBarIcon,
    iconSolid: DocumentChartBarIconSolid,
    badge: 'NEW',
    description: 'Tax Reports',
    enabled: () => FEATURE_FLAGS.GERMAN_TAX.enabled,
    disabledReason: 'Tax reports appear once the German tax feature flag is active.',
  },
  {
    nameKey: 'navigation.gdpr_actions',
    href: '/gdpr-actions',
    icon: ArrowDownTrayIcon,
    iconSolid: ArrowDownTrayIconSolid,
    badge: null,
    description: 'GDPR Actions',
    enabled: true,
  },
  {
    nameKey: 'navigation.audit_logs',
    href: '/audit-logs',
    icon: DocumentMagnifyingGlassIcon,
    iconSolid: DocumentMagnifyingGlassIconSolid,
    badge: null,
    description: 'Audit Logs',
    enabled: ({ role }) => isAdminRole(role),
    disabledReason: 'Audit exports are restricted to admins.',
  },
];

export const ADMIN_NAVIGATION_ITEMS = COMPLIANCE_NAVIGATION_ITEMS;
