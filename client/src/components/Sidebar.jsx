import React from 'react';
import clsx from 'clsx';
import { NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useRole, roles } from '../context/RoleContext';
import {
  HomeIcon,
  Cog6ToothIcon,
  ShieldCheckIcon,
  BellIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline';
import {
  MAIN_NAVIGATION_ITEMS,
  MANAGEMENT_NAVIGATION_ITEMS,
  ADMIN_NAVIGATION_ITEMS,
} from '../navigation/sidebarNavigation';

const NAV_LINK_BASE_CLASSES =
  'relative group flex items-center px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-900';

const Sidebar = ({ isCollapsed, onToggleCollapse }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { role } = useRole();
  const location = useLocation();
  const [, setHoveredItem] = React.useState(null);

  const evaluateEnabled = (item) => {
    if (typeof item.enabled === 'function') {
      return item.enabled();
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

  const mainNavigation = enrichNavigation(MAIN_NAVIGATION_ITEMS);
  const managementNavigation = enrichNavigation(MANAGEMENT_NAVIGATION_ITEMS);
  const adminNavigation = enrichNavigation(ADMIN_NAVIGATION_ITEMS);

  // Set to null to avoid rendering empty section
  const systemNavigation = null;

  // Role-based navigation filtering
  // Example: Only admin/accountant can see invoices, viewers cannot
  const filteredMainNavigation = mainNavigation.filter((item) => {
    if (item.href === '/invoices' && role === roles.VIEWER) {
      return false;
    }
    return true;
  });

  const visibleMainNavigation = filteredMainNavigation.filter((item) => item.enabled !== false);

  // Example: Only admin can see adminNavigation
  const filteredAdminNavigation = (adminNavigation || []).filter(() => role === roles.ADMIN);

  // Example: Only admin/accountant can see managementNavigation
  const filteredManagementNavigation = (managementNavigation || []).filter(
    () => role !== roles.VIEWER,
  );

  const isActiveLink = (href) => {
    return (
      location.pathname === href || (href !== '/dashboard' && location.pathname.startsWith(href))
    );
  };

  const renderNavItem = (item, index, sectionKey = '') => {
    const isEnabled = item.enabled !== false;
    const isActive = item.href && isActiveLink(item.href);

    const IconComponent = isActive && item.iconSolid ? item.iconSolid : item.icon;
    if (isEnabled) {
      return (
        <NavLink
          key={`${sectionKey}-${item.href}`}
          to={item.href}
          className={clsx(
            NAV_LINK_BASE_CLASSES,
            isActive
              ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-lg shadow-primary-500/25'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-800',
          )}
          aria-current={isActive ? 'page' : undefined}
          onMouseEnter={() => setHoveredItem(`${sectionKey}-${item.href}-${index}`)}
          onMouseLeave={() => setHoveredItem(null)}
        >
          <div className="flex items-center w-full">
            <div
              className={`flex-shrink-0 ${isActive ? 'transform scale-110' : ''} transition-transform duration-200`}
            >
              <IconComponent className="h-5 w-5" />
            </div>
            {!isCollapsed && (
              <>
                <span className="ml-3 flex-1 text-left truncate">{item.name}</span>
                {item.badge && (
                  <span
                    className={`ml-auto inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
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
          </div>
        </NavLink>
      );
    }
    // DISABLED (not clickable, with tooltip)
    return (
      <button
        key={`${sectionKey}-${item.name}`}
        type="button"
        className="relative group flex items-center px-3 py-2.5 text-sm font-medium rounded-xl opacity-60 cursor-not-allowed text-gray-500 dark:text-gray-400"
        title={item.description ? `${item.description} (Coming soon)` : 'Coming soon'}
        aria-disabled="true"
        disabled
        onMouseEnter={() => setHoveredItem(`${sectionKey}-${item.name}-${index}`)}
        onMouseLeave={() => setHoveredItem(null)}
      >
        <div className="flex items-center w-full gap-3">
          <div className="flex-shrink-0">
            <IconComponent className="h-5 w-5" aria-hidden="true" />
          </div>
          {!isCollapsed && <span className="flex-1 text-left truncate">{item.name}</span>}
        </div>
      </button>
    );
  };

  const renderSection = (title, items, sectionKey, icon = null) => {
    if (!items || items.length === 0) {
      return null;
    }

    const SectionIcon = icon;
    return (
      <div className="space-y-1">
        {!isCollapsed && (
          <div className="px-3 pt-4 pb-2">
            <div className="flex items-center space-x-2">
              {SectionIcon && <SectionIcon className="h-4 w-4 text-gray-300 dark:text-gray-600" />}
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider dark:text-gray-400">
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
      className={`fixed inset-y-0 left-0 z-30 bg-white border-r border-gray-200 transition-all duration-300 ease-in-out dark:bg-gray-900 dark:border-gray-700 ${
        isCollapsed ? 'sidebar-collapsed' : 'sidebar-expanded'
      }`}
    >
      {/* Enhanced Header */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-primary-50 to-blue-50 dark:from-gray-800 dark:to-gray-800">
        {!isCollapsed && (
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-sm">SA</span>
            </div>
            <div>
              <h1 className="text-lg font-bold bg-gradient-to-r from-primary-600 to-primary-800 bg-clip-text text-transparent">
                SmartAccounting
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">Professional Suite</p>
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
        className={`p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 ${isCollapsed ? 'px-3' : ''}`}
      >
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0 relative">
            <UserCircleIcon className="h-10 w-10 text-gray-500 dark:text-gray-400" />
            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white dark:border-gray-800"></div>
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate dark:text-white">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-gray-500 truncate dark:text-gray-400">{user?.email}</p>
              <div className="mt-2 flex items-center space-x-2">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gradient-to-r from-primary-100 to-blue-100 text-primary-800 dark:from-primary-900/40 dark:to-blue-900/40 dark:text-primary-200">
                  {user?.subscriptionPlan || 'Professional'}
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">
                  {user?.role || 'Admin'}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Enhanced Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-6 overflow-y-auto scrollbar-thin">
        {renderSection(t('navigation.main'), visibleMainNavigation, 'main', HomeIcon)}
        {filteredManagementNavigation.length > 0 &&
          renderSection(
            t('navigation.management'),
            filteredManagementNavigation,
            'management',
            Cog6ToothIcon,
          )}
        {filteredAdminNavigation.length > 0 &&
          renderSection(
            t('navigation.administration'),
            filteredAdminNavigation,
            'admin',
            ShieldCheckIcon,
          )}
        {/* Only render system section if not null and has items */}
        {systemNavigation &&
          renderSection(t('navigation.system'), systemNavigation, 'system', BellIcon)}
      </nav>
    </div>
  );
};

export default Sidebar;
