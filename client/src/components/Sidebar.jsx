import React from 'react';
import clsx from 'clsx';
import { NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useRole } from '../context/RoleContext';

import { AIBadge } from './AIBadge';
import {
  HomeIcon,
  Cog6ToothIcon,
  ShieldCheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  UserCircleIcon,
  DocumentTextIcon,
  DocumentChartBarIcon,
} from '@heroicons/react/24/outline';
import {
  CORE_NAVIGATION_ITEMS,
  SYSTEM_ADMIN_NAVIGATION_ITEMS,
  ACCOUNTING_NAVIGATION_ITEMS,
  INTELLIGENCE_NAVIGATION_ITEMS,
  COMPLIANCE_NAVIGATION_ITEMS,
  ADMINISTRATION_NAVIGATION_ITEMS,
} from '../navigation/sidebarNavigation';
import { isSystemAdmin } from '../lib/systemAdmin';

const NAV_LINK_BASE_CLASSES =
  'relative group flex items-center px-3 py-2.5 text-sm font-medium min-h-[44px] rounded-xl transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-900';

const Sidebar = ({ isCollapsed, onToggleCollapse }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { role } = useRole();
  const location = useLocation();
  const [, setHoveredItem] = React.useState(null);
  const [isCompact, setIsCompact] = React.useState(false);
  const navRef = React.useRef(null);

  React.useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) {
      return;
    }
    const mediaQuery = window.matchMedia('(max-width: 1024px)');
    const handleChange = (event) => setIsCompact(event.matches);
    handleChange(mediaQuery);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const isCondensed = isCollapsed || isCompact;

  const evaluateEnabled = (item) => {
    if (typeof item.enabled === 'function') {
      return item.enabled({ role, user });
    }
    if (typeof item.enabled === 'boolean') {
      return item.enabled;
    }
    return true;
  };

  const enrichNavigation = (items) =>
    items.map((item) => ({
      ...item,
      name: t(item.nameKey),
      enabled: evaluateEnabled(item),
    }));

  const isSystemAdminUser = isSystemAdmin(user);
  const coreNavigation = enrichNavigation(
    isSystemAdminUser ? SYSTEM_ADMIN_NAVIGATION_ITEMS : CORE_NAVIGATION_ITEMS,
  );
  const accountingNavigation = isSystemAdminUser
    ? []
    : enrichNavigation(ACCOUNTING_NAVIGATION_ITEMS);
  const intelligenceNavigation = isSystemAdminUser
    ? []
    : enrichNavigation(INTELLIGENCE_NAVIGATION_ITEMS);
  const complianceNavigation = isSystemAdminUser
    ? []
    : enrichNavigation(COMPLIANCE_NAVIGATION_ITEMS);
  const administrationNavigation = isSystemAdminUser
    ? []
    : enrichNavigation(ADMINISTRATION_NAVIGATION_ITEMS);

  const shouldRenderSection = (items) => Array.isArray(items) && items.length > 0;

  const isActiveLink = (href) => {
    return (
      location.pathname === href || (href !== '/dashboard' && location.pathname.startsWith(href))
    );
  };

  const handleNavKeyDown = (event) => {
    if (!navRef.current) {
      return;
    }
    const keys = ['ArrowDown', 'ArrowUp', 'Home', 'End'];
    if (!keys.includes(event.key)) {
      return;
    }
    const items = Array.from(navRef.current.querySelectorAll('[data-sidebar-item="true"]'));
    if (!items.length) {
      return;
    }
    const currentIndex = items.indexOf(document.activeElement);
    let nextIndex = currentIndex;

    if (event.key === 'ArrowDown') {
      nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % items.length;
    } else if (event.key === 'ArrowUp') {
      nextIndex = currentIndex < 0 ? items.length - 1 : (currentIndex - 1 + items.length) % items.length;
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = items.length - 1;
    }

    event.preventDefault();
    items[nextIndex]?.focus();
  };

  const renderNavItem = (item, index, sectionKey = '') => {
    const isEnabled = item.enabled !== false;
    const isActive = item.href && isActiveLink(item.href);
    const IconComponent = isActive && item.iconSolid ? item.iconSolid : item.icon;
    if (isEnabled) {
      // Use AIBadge for AI navigation items
      const isAIFeature = item.badge === 'AI';
      let badgeNode = null;
      if (isAIFeature && !isCondensed) {
        badgeNode = <AIBadge className="ml-auto" />;
      }
      return (
        <NavLink
          key={`${sectionKey}-${item.href}`}
          to={item.href}
          className={clsx(
            NAV_LINK_BASE_CLASSES,
            isActive
              ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white font-semibold shadow-lg shadow-primary-500/25 before:absolute before:left-0 before:top-1/2 before:h-6 before:w-1 before:-translate-y-1/2 before:rounded-full before:bg-white/80 before:content-[\'\']'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-800',
          )}
          aria-current={isActive ? 'page' : undefined}
          aria-label={isCondensed ? item.name : undefined}
          title={isCondensed ? item.name : undefined}
          onMouseEnter={() => setHoveredItem(`${sectionKey}-${item.href}-${index}`)}
          onMouseLeave={() => setHoveredItem(null)}
          data-sidebar-item="true"
        >
          <div className="flex items-center w-full">
            <div
              className={`flex-shrink-0 ${isActive ? 'transform scale-110' : ''} transition-transform duration-200`}
            >
              <IconComponent className="h-5 w-5" />
            </div>
            {!isCondensed && (
              <>
                <span className="ml-3 flex-1 text-left truncate">{item.name}</span>
                {badgeNode}
                {/* fallback for other badges */}
                {!isAIFeature && item.badge && (
                  <span
                    className={`ml-auto inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : item.badge === 'NEW'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </>
            )}
            {isCondensed && (
              <span className="sr-only">{item.name}</span>
            )}
          </div>
          {isCondensed && (
            <div
              role="tooltip"
              className="absolute left-full top-1/2 z-20 hidden -translate-y-1/2 whitespace-nowrap rounded bg-gray-900 px-3 py-2 text-xs font-medium text-white shadow-lg group-hover:block group-focus-within:block"
            >
              {item.name}
            </div>
          )}
        </NavLink>
      );
    }
    // DISABLED (not clickable, with FeatureGate tooltip)
    const tooltipPrimary = item.description || 'Feature unavailable';
    const tooltipSecondary = item.disabledReason || 'This feature is currently disabled.';
    return (
      <div
        key={`${sectionKey}-${item.name}`}
        className="relative group flex items-center px-3 py-2.5 text-sm font-medium min-h-[44px] rounded-xl opacity-60 cursor-not-allowed text-gray-500 dark:text-gray-400"
        aria-disabled="true"
        aria-label={isCondensed ? item.name : undefined}
        title={isCondensed ? tooltipPrimary : undefined}
      >
        <div
          role="tooltip"
          className="absolute left-full top-1/2 z-20 hidden max-w-xs -translate-y-1/2 rounded bg-gray-900 px-3 py-2 text-xs text-white shadow-lg group-hover:block group-focus-within:block"
        >
          <p className="font-semibold">{tooltipPrimary}</p>
          <p className="text-gray-200">{tooltipSecondary}</p>
        </div>
        <div className="flex items-center w-full gap-3">
          <div className="flex-shrink-0">
            <IconComponent className="h-5 w-5" aria-hidden="true" />
          </div>
          {!isCondensed && <span className="flex-1 text-left truncate">{item.name}</span>}
          {isCondensed && <span className="sr-only">{item.name}</span>}
        </div>
      </div>
    );
  };

  const renderSection = (title, items, sectionKey, icon = null) => {
    if (!items || items.length === 0) {
      return null;
    }

    const SectionIcon = icon;
    return (
      <div className="space-y-2">
        {!isCondensed && (
          <div className="px-3 pt-3 pb-1">
            <div className="flex items-center space-x-2">
              {SectionIcon && <SectionIcon className="h-4 w-4 text-gray-300 dark:text-gray-600" />}
              <h3 className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest dark:text-gray-400">
                {title}
              </h3>
            </div>
          </div>
        )}
        <div className="space-y-1">
          {items.map((item, index) => renderNavItem(item, index, sectionKey))}
        </div>
      </div>
    );
  };

  // Optional: Prevent rendering until user/role are loaded (avoid flicker)
  if (!user || !role) {
    return (
      <div className="flex items-center justify-center h-full w-full p-8">
        <div className="flex flex-col items-center space-y-2">
          <svg
            className="animate-spin h-6 w-6 text-primary-500 mb-2"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
          </svg>
          <span className="text-gray-500 text-sm">Loading user context...</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={clsx(
        'fixed inset-y-0 left-0 z-30 flex max-h-screen flex-col bg-white border-r border-gray-200 transition-all duration-300 ease-in-out dark:bg-gray-900 dark:border-gray-700',
        isCondensed ? 'sidebar-collapsed' : 'sidebar-expanded',
        isCollapsed ? '-translate-x-full md:translate-x-0' : 'translate-x-0',
      )}
    >
      {/* Enhanced Header */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-primary-50 to-blue-50 dark:from-gray-800 dark:to-gray-800">
        {!isCondensed && (
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-sm">SA</span>
            </div>
            <div>
              <h1 className="text-lg font-bold bg-gradient-to-r from-primary-600 to-primary-800 bg-clip-text text-transparent">
                SmartAccounting
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {isSystemAdminUser ? 'Platform Control' : 'Professional Suite'}
              </p>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={onToggleCollapse}
          className="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-white/50 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-800 transition-all duration-200 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-900"
          aria-label={isCollapsed ? t('sidebar.expand') : t('sidebar.collapse')}
        >
          {isCollapsed ? (
            <ChevronRightIcon className="h-4 w-4" />
          ) : (
            <ChevronLeftIcon className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Enhanced User Profile */}
      <div
        className={`p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 ${isCondensed ? 'px-3' : ''}`}
      >
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0 relative">
            <UserCircleIcon className="h-10 w-10 text-gray-500 dark:text-gray-400" />
            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white dark:border-gray-800"></div>
          </div>
          {!isCondensed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate dark:text-white">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-gray-500 truncate dark:text-gray-400">{user?.email}</p>
              <div className="mt-2 flex items-center space-x-2">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gradient-to-r from-primary-100 to-blue-100 text-primary-800 dark:from-primary-900/40 dark:to-blue-900/40 dark:text-primary-200">
                  {isSystemAdminUser ? 'Platform' : user?.subscriptionPlan || 'Professional'}
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">
                  {isSystemAdminUser ? 'System Admin' : user?.role || 'Admin'}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Enhanced Navigation */}
      <nav
        ref={navRef}
        className="flex-1 min-h-0 px-2 py-4 space-y-4 overflow-y-auto scrollbar-thin"
        aria-label={t('navigation.sidebar')}
        onKeyDown={handleNavKeyDown}
      >
        {shouldRenderSection(coreNavigation) &&
          renderSection(t('navigation.core'), coreNavigation, 'core', HomeIcon)}
        {shouldRenderSection(accountingNavigation) &&
          renderSection(
            t('navigation.accounting'),
            accountingNavigation,
            'accounting',
            DocumentTextIcon,
          )}
        {shouldRenderSection(intelligenceNavigation) &&
          renderSection(
            t('navigation.intelligence'),
            intelligenceNavigation,
            'intelligence',
            DocumentChartBarIcon,
          )}
        {shouldRenderSection(complianceNavigation) &&
          renderSection(
            t('navigation.compliance_audit'),
            complianceNavigation,
            'compliance',
            ShieldCheckIcon,
          )}
        {shouldRenderSection(administrationNavigation) &&
          renderSection(
            t('navigation.administration'),
            administrationNavigation,
            'administration',
            Cog6ToothIcon,
          )}
      </nav>
    </div>
  );
};

export default Sidebar;
