import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import CompanySelector from './CompanySelector';
import { useLoadCompanies } from '../hooks/useLoadCompanies';
import { useCompany } from '../context/CompanyContext';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import LanguageSwitcher from './LanguageSwitcher';
import { isReadOnlyRole } from '../lib/permissions';
import { FEATURE_FLAGS } from '../lib/constants';
import {
  BellIcon,
  MagnifyingGlassIcon,
  SunIcon,
  MoonIcon,
  UserCircleIcon,
  ArrowRightOnRectangleIcon,
  ChevronDownIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XMarkIcon,
  ClockIcon,
  CalendarDaysIcon,
  CurrencyEuroIcon,
  BanknotesIcon,
  LockClosedIcon,
} from '@heroicons/react/24/outline';
import {
  BellIcon as BellIconSolid,
  UserCircleIcon as UserCircleIconSolid,
} from '@heroicons/react/24/solid';

const MOCK_SEARCH_RESULTS = [
  {
    type: 'invoice',
    title: 'Invoice #2024-0156',
    subtitle: 'Müller GmbH - €2,450.00',
    // href: '/invoices/2024-0156',
    href: '/invoices',
    icon: CurrencyEuroIcon,
  },
  {
    type: 'client',
    title: 'Hans Schmidt GmbH',
    subtitle: 'Client • 15 invoices',
    href: '/companies',
    icon: UserCircleIcon,
  },
  {
    type: 'report',
    title: 'Bank Statement Dec • 42 tx',
    subtitle: 'Pending reconciliation',
    href: '/bank-statements',
    icon: BanknotesIcon,
  },
];

const TopBar = ({ isDarkMode, onToggleDarkMode, isCollapsed }) => {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const isReadOnlySession = isReadOnlyRole(user?.role);
  useLoadCompanies();
  const { companies } = useCompany();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  // Remove local state for searchResults and showSearchResults
  const navigate = useNavigate();
  const profileRef = useRef(null);
  const notificationsRef = useRef(null);
  const searchRef = useRef(null);

  // Enhanced notifications with more variety
  const isGermanTaxEnabled = FEATURE_FLAGS.GERMAN_TAX.enabled;

  const notifications = useMemo(() => {
    const baseNotifications = [
      {
        id: 1,
        type: 'success',
        title: t('notifications.invoice_processed'),
        message: 'Invoice #2024-0156 has been successfully processed and sent to Müller GmbH',
        time: '2 min ago',
        read: false,
        priority: 'high',
        action: 'View Invoice',
        href: '/invoices',
      },
      {
        id: 3,
        type: 'info',
        title: 'Payment Received',
        message: 'Payment of €2,450.00 received from Hans Schmidt GmbH',
        time: '3 hours ago',
        read: true,
        priority: 'normal',
        action: 'View Payment',
        href: '/bank-statements',
      },
      {
        id: 4,
        type: 'success',
        title: t('notifications.backup_complete'),
        message: 'Monthly database backup completed successfully',
        time: '1 day ago',
        read: true,
        priority: 'low',
      },
      {
        id: 5,
        type: 'info',
        title: 'New Feature Available',
        message: 'AI-powered expense categorization is now available in your dashboard',
        time: '2 days ago',
        read: false,
        priority: 'normal',
        action: 'Explore',
        href: '/dashboard',
      },
    ];

    if (!isGermanTaxEnabled) {
      return baseNotifications;
    }

    const taxNotification = {
      id: 2,
      type: 'warning',
      title: t('notifications.tax_deadline'),
      message: 'VAT return deadline approaching in 5 days. Current amount due: €4,250.30',
      time: '1 hour ago',
      read: false,
      priority: 'urgent',
      action: 'Review Tax',
      href: '/german-tax-reports',
    };

    return [
      baseNotifications[0],
      taxNotification,
      ...baseNotifications.slice(1),
    ];
  }, [t, isGermanTaxEnabled]);

  // Mock search results
  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
        setIsNotificationsOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setSearchQuery('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredSearchResults = useMemo(() => {
    if (searchQuery.length > 2) {
      return MOCK_SEARCH_RESULTS.filter(
        (item) =>
          item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.subtitle.toLowerCase().includes(searchQuery.toLowerCase()),
      );
    }
    return [];
  }, [searchQuery]);

  const showSearchResults = searchQuery.length > 2 && filteredSearchResults.length > 0;

  // Removed useEffect for searchResults and showSearchResults

  const handleLogout = () => {
    logout();
    setIsProfileOpen(false);
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckCircleIcon className="h-5 w-5 text-emerald-500" />;
      case 'warning':
        return <ExclamationTriangleIcon className="h-5 w-5 text-amber-500" />;
      case 'info':
        return <InformationCircleIcon className="h-5 w-5 text-blue-500" />;
      default:
        return <InformationCircleIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'high':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400';
      case 'normal':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'low':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  const currentTime = new Date().toLocaleTimeString('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const currentDate = new Date().toLocaleDateString('de-DE', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <header
      className={`fixed top-0 right-0 z-20 bg-gradient-to-b from-white/95 to-gray-50/90 backdrop-blur border-b border-gray-200 shadow-[0_2px_8px_0_rgba(0,0,0,0.03)] dark:bg-gradient-to-b dark:from-gray-900/95 dark:to-gray-800/90 dark:border-gray-700 transition-all duration-300 ease-in-out ${
        isCollapsed ? 'main-collapsed' : 'main-expanded'
      }`}
    >
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Search */}
          <div className="flex items-center gap-6 min-w-fit">
            <Link to="/dashboard" className="flex items-center">
              <img
                src="/brand/logo.png"
                alt="SmartAccounting Logo"
                className="h-8 w-auto object-contain drop-shadow-sm"
                style={{ maxHeight: 40 }}
                loading="eager"
              />
            </Link>
          </div>
          {/* Enhanced Search with autocomplete */}
          <div className="flex-1 max-w-2xl relative" ref={searchRef}>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && filteredSearchResults[0]) {
                    navigate(filteredSearchResults[0].href);
                    setSearchQuery('');
                  }
                }}
                className="block w-full pl-10 pr-12 py-2.5 border border-gray-300 rounded-xl leading-5 bg-white/80 placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-800/80 dark:border-gray-600 dark:text-white dark:placeholder-gray-400 transition-all duration-200"
                placeholder={t('search.enhanced_placeholder')}
                aria-label={t('search.enhanced_placeholder')}
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center space-x-2">
                <kbd className="hidden sm:inline-block px-2 py-1 text-xs font-semibold text-gray-500 bg-gray-100 border border-gray-200 rounded dark:bg-gray-700 dark:text-gray-400 dark:border-gray-600">
                  ⌘K
                </kbd>
              </div>
            </div>

            {/* Enhanced Search Results */}
            {showSearchResults && filteredSearchResults.length > 0 && (
            <div
              className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-200 dark:bg-gray-800 dark:border-gray-700 max-h-96 overflow-y-auto z-50"
              role="listbox"
              aria-label={t('topbar.search_results_title')}
              aria-live="polite"
            >
              <div className="p-3">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  {t('topbar.search_results_title')}
                </div>
                {filteredSearchResults.map((result, _index) => (
                    <Link
                      key={`${result.type}-${result.title}`}
                      to={result.href}
                      className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
                      onClick={() => setSearchQuery('')}
                      role="option"
                      aria-label={`${result.title} • ${result.subtitle}`}
                    >
                      <div className="flex-shrink-0">
                        <result.icon className="h-5 w-5 text-gray-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {result.title}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {result.subtitle}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Company Selector (if companies exist) */}
          <div className="flex items-center gap-2 mr-4">
            {companies?.length > 0 ? (
              <CompanySelector />
            ) : (
              <span className="text-xs text-gray-400">{t('topbar.no_company')}</span>
            )}
            {user?.role && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gradient-to-r from-primary-50 to-blue-50 text-primary-700 dark:from-primary-900/20 dark:to-blue-900/20 dark:text-primary-200 opacity-80">
                {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
              </span>
            )}
          </div>
          {/* Right side enhanced actions */}
          <div className="flex items-center space-x-4">
            {/* Current Time Display */}
            <div
              className="hidden lg:flex items-center space-x-3 text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 px-3 py-2 rounded-lg"
              aria-live="polite"
              aria-atomic="true"
              aria-label={`${t('topbar.current_time_label')}: ${currentTime}. ${currentDate}`}
            >
              <ClockIcon className="h-4 w-4" />
              <span className="font-medium">{currentTime}</span>
              <span className="text-gray-400">•</span>
              <CalendarDaysIcon className="h-4 w-4" />
              <span className="hidden xl:inline">{currentDate}</span>
            </div>

            {/* Language Switcher */}
            <LanguageSwitcher />

            {/* Enhanced Dark Mode Toggle */}
            <button
              onClick={onToggleDarkMode}
              className="p-2.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-800 transition-all duration-200 relative group"
              aria-label={isDarkMode ? t('theme.light') : t('theme.dark')}
              aria-pressed={isDarkMode}
            >
              <div className="relative">
                {isDarkMode ? (
                  <SunIcon className="h-5 w-5 transition-transform duration-200 group-hover:rotate-12" />
                ) : (
                  <MoonIcon className="h-5 w-5 transition-transform duration-200 group-hover:-rotate-12" />
                )}
              </div>
            </button>

            {/* Enhanced Notifications */}
            <div className="relative" ref={notificationsRef}>
              <button
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                className="relative p-2.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-800 transition-all duration-200 group"
                aria-label={t('notifications.title')}
                aria-expanded={isNotificationsOpen}
              >
                {unreadCount > 0 ? (
                  <BellIconSolid className="h-5 w-5 text-primary-500 animate-bounce-gentle" />
                ) : (
                  <BellIcon className="h-5 w-5" />
                )}
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 bg-gradient-to-r from-red-500 to-red-600 rounded-full flex items-center justify-center shadow-lg">
                    <span className="text-xs font-bold text-white">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  </span>
                )}
              </button>

              {isNotificationsOpen && (
                <div
                  className="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-xl border border-gray-200 dark:bg-gray-800 dark:border-gray-700 animate-fade-in max-h-[32rem] overflow-hidden"
                  role="region"
                  aria-label={t('notifications.title')}
                >
                  <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-primary-50 to-blue-50 dark:from-gray-800 dark:to-gray-800">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {t('notifications.title')}
                      </h3>
                      <div className="flex items-center space-x-2">
                        {unreadCount > 0 && (
                          <span className="badge-info text-xs">
                            {unreadCount} {t('notifications.new')}
                          </span>
                        )}
                        <button
                          onClick={() => setIsNotificationsOpen(false)}
                          className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                          type="button"
                          aria-label={t('common.close')}
                        >
                          <XMarkIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="max-h-80 overflow-y-auto scrollbar-thin">
                    {notifications.length > 0 ? (
                      notifications.map((notification) => (
                        <div
                          key={notification.id}
                          className={`p-4 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200 ${
                            !notification.read
                              ? 'bg-primary-50/50 dark:bg-primary-900/10 border-l-4 border-l-primary-500'
                              : ''
                          }`}
                        >
                          <div className="flex items-start space-x-3">
                            <div className="flex-shrink-0 mt-0.5">
                              {getNotificationIcon(notification.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1">
                                <p className="text-sm font-medium text-gray-900 dark:text-white">
                                  {notification.title}
                                </p>
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getPriorityBadge(notification.priority)}`}
                                >
                                  {notification.priority}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                {notification.message}
                              </p>
                              <div className="flex items-center justify-between">
                                <p className="text-xs text-gray-500 dark:text-gray-500">
                                  {notification.time}
                                </p>
                                {notification.action && notification.href ? (
                                  <Link
                                    to={notification.href}
                                    className="text-xs text-primary-600 hover:text-primary-700 dark:text-primary-400 font-medium"
                                    onClick={() => setIsNotificationsOpen(false)}
                                    type="button"
                                    >
                                    {notification.action} →
                                  </Link>
                                ) : notification.action ? (
                                  <button
                                    disabled
                                    className="text-xs opacity-50 cursor-not-allowed"
                                    title={t('topbar.notifications.action_coming_soon')}
                                    aria-label={t('topbar.notifications.action_coming_soon')}
                                    aria-disabled="true"
                                    type="button"
                                  >
                                    {notification.action}
                                  </button>
                                ) : null}
                              </div>
                            </div>
                            {!notification.read && (
                              <div className="w-2 h-2 bg-primary-600 rounded-full mt-2"></div>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-8 text-center">
                        <BellIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500 dark:text-gray-400">
                          {t('notifications.empty')}
                        </p>
                      </div>
                    )}
                  </div>

                  {notifications.length > 0 && (
                    <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                      <div className="flex justify-between items-center">
                        <button
                          type="button"
                          disabled
                          className="text-sm opacity-50 cursor-not-allowed"
                          title={t('topbar.notifications.bulk_actions_coming_soon')}
                          aria-label={t('topbar.notifications.bulk_actions_coming_soon')}
                          aria-disabled="true"
                        >
                          {t('topbar.notifications.mark_all')}
                        </button>
                        <button
                          type="button"
                          disabled
                          className="text-sm opacity-50 cursor-not-allowed"
                          title={t('topbar.notifications.full_inbox_coming_soon')}
                          aria-label={t('topbar.notifications.full_inbox_coming_soon')}
                          aria-disabled="true"
                        >
                          {t('notifications.view_all')} →
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Enhanced User Profile */}
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center space-x-3 p-2 text-sm rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 border border-transparent hover:border-gray-200 dark:hover:border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-400"
                aria-label={t('topbar.profile.open_menu')}
                aria-haspopup="true"
                aria-expanded={isProfileOpen}
              >
                <div className="relative">
                  <UserCircleIconSolid className="h-8 w-8 text-gray-400" />
                  <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white dark:border-gray-800"></div>
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                    {user?.role} • {user?.subscriptionPlan || t('topbar.profile.plan_professional')}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-2 text-[11px]">
                  {isReadOnlySession ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                      <LockClosedIcon className="h-3 w-3" />
                      {t('topbar.profile.session_read_only')}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      <CheckCircleIcon className="h-3 w-3" />
                      {t('topbar.profile.session_full_access')}
                    </span>
                  )}
                  </div>
                </div>
                <ChevronDownIcon
                  className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${isProfileOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {isProfileOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-gray-200 dark:bg-gray-800 dark:border-gray-700 animate-fade-in">
                  <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-primary-50 to-blue-50 dark:from-gray-800 dark:to-gray-800">
                    <div className="flex items-center space-x-3">
                      <div className="relative">
                        <UserCircleIconSolid className="h-12 w-12 text-gray-400" />
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white dark:border-gray-800"></div>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {user?.firstName} {user?.lastName}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{user?.email}</p>
                        <div className="flex items-center space-x-2 mt-2">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-800 dark:bg-primary-900/40 dark:text-primary-200">
                            {user?.role}
                          </span>
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">
                            {user?.subscriptionPlan || t('topbar.profile.plan_pro')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="py-2">
                    <button
                      disabled
                      className="flex items-center w-full px-4 py-3 text-sm text-gray-400 opacity-50 cursor-not-allowed"
                      title={t('topbar.profile.profile_tooltip')}
                      aria-label={t('topbar.profile.profile_tooltip')}
                    >
                      <UserCircleIcon className="h-4 w-4 mr-3" />
                      {t('topbar.profile.view')}
                      <span className="ml-auto text-xs text-gray-400">⌘P</span>
                    </button>
                  </div>

                  <div className="py-2 border-t border-gray-200 dark:border-gray-700 space-y-2">
                    <p className="text-xs text-gray-500">
                      {t('topbar.profile.session_hint')}
                    </p>
                    <button
                      onClick={handleLogout}
                      className="flex items-center w-full px-4 py-3 text-sm text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 transition-colors duration-200"
                      title="Sign out and end your session."
                    >
                      <ArrowRightOnRectangleIcon className="h-4 w-4 mr-3" />
                      {t('auth.logout')}
                      <span className="ml-auto text-xs text-gray-400">⌘Q</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default TopBar;
