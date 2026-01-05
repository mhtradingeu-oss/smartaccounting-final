import {
  HomeIcon,
  DocumentTextIcon,
  BanknotesIcon,
  DocumentChartBarIcon,
  CreditCardIcon,
  ShieldCheckIcon,
  BuildingOfficeIcon,
  UsersIcon,
  DocumentMagnifyingGlassIcon,
  ChatBubbleLeftEllipsisIcon,
} from '@heroicons/react/24/outline';
import {
  HomeIcon as HomeIconSolid,
  DocumentTextIcon as DocumentTextIconSolid,
  BanknotesIcon as BanknotesIconSolid,
  DocumentChartBarIcon as DocumentChartBarIconSolid,
  DocumentMagnifyingGlassIcon as DocumentMagnifyingGlassIconSolid,
  ChatBubbleLeftEllipsisIcon as ChatBubbleLeftEllipsisIconSolid,
  CreditCardIcon as CreditCardIconSolid,
  ShieldCheckIcon as ShieldCheckIconSolid,
  BuildingOfficeIcon as BuildingOfficeIconSolid,
  UsersIcon as UsersIconSolid,
} from '@heroicons/react/24/solid';
import { FEATURE_FLAGS } from '../lib/constants';
import { isAIAssistantEnabled, isOCRPreviewEnabled } from '../lib/featureFlags';

export const MAIN_NAVIGATION_ITEMS = [
  {
    nameKey: 'navigation.dashboard',
    href: '/dashboard',
    icon: HomeIcon,
    iconSolid: HomeIconSolid,
    badge: null,
    description: 'Overview & Analytics',
    enabled: true,
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
    nameKey: 'navigation.ai_assistant',
    href: '/ai-assistant',
    icon: ChatBubbleLeftEllipsisIcon,
    iconSolid: ChatBubbleLeftEllipsisIconSolid,
    badge: 'AI',
    description: 'Conversational read-only advisor',
    enabled: isAIAssistantEnabled,
  },
  {
    nameKey: 'navigation.invoices',
    href: '/invoices',
    icon: DocumentTextIcon,
    iconSolid: DocumentTextIconSolid,
    badge: null,
    description: 'Create & Manage Invoices',
    enabled: true,
  },
  {
    nameKey: 'navigation.bank_statements',
    href: '/bank-statements',
    icon: BanknotesIcon,
    iconSolid: BanknotesIconSolid,
    badge: null,
    description: 'Bank Transactions',
    enabled: true,
  },
  {
    nameKey: 'navigation.ocr_preview',
    href: '/ocr-preview',
    icon: DocumentMagnifyingGlassIcon,
    iconSolid: DocumentMagnifyingGlassIconSolid,
    badge: 'Preview',
    description: 'Preview OCR extractions',
    enabled: isOCRPreviewEnabled,
  },
  {
    nameKey: 'navigation.german_tax',
    href: '/german-tax-reports',
    icon: DocumentChartBarIcon,
    iconSolid: DocumentChartBarIconSolid,
    badge: 'NEW',
    description: 'German Tax Compliance',
    enabled: () => FEATURE_FLAGS.GERMAN_TAX.enabled,
  },
  {
    nameKey: 'navigation.billing',
    href: '/billing',
    icon: CreditCardIcon,
    iconSolid: CreditCardIconSolid,
    badge: null,
    description: 'Subscription & Billing',
    enabled: () => FEATURE_FLAGS.STRIPE_BILLING.enabled,
  },
  {
    nameKey: 'navigation.compliance',
    href: '/compliance',
    icon: ShieldCheckIcon,
    iconSolid: ShieldCheckIconSolid,
    badge: null,
    description: 'GDPR & GoBD Compliance',
    enabled: () => FEATURE_FLAGS.ELSTER_COMPLIANCE.enabled,
  },
];

export const MANAGEMENT_NAVIGATION_ITEMS = [
  {
    nameKey: 'navigation.companies',
    href: '/companies',
    icon: BuildingOfficeIcon,
    iconSolid: BuildingOfficeIconSolid,
    badge: null,
    description: 'Company directory',
    enabled: true,
  },
];

export const ADMIN_NAVIGATION_ITEMS = [
  {
    nameKey: 'navigation.users',
    href: '/users',
    icon: UsersIcon,
    iconSolid: UsersIconSolid,
    badge: null,
    description: 'User management',
    enabled: true,
  },
];
