
import React from 'react';
import { ChevronRightIcon } from '@heroicons/react/24/outline';

const EnhancedCard = ({ 
  children, 
  className = '', 
  variant = 'default',
  clickable = false,
  loading = false,
  header = null,
  footer = null,
  icon = null,
  badge = null,
  onClick,
  ...props 
}) => {
  const baseClasses = `
    bg-white dark:bg-gray-800 
    rounded-xl 
    border border-gray-200 dark:border-gray-700 
    transition-all duration-300 
    ${loading ? 'animate-pulse' : ''}
  `;

  const variantClasses = {
    default: 'shadow-soft hover:shadow-medium',
    elevated: 'shadow-medium hover:shadow-large transform hover:-translate-y-1',
    interactive: clickable ? 'cursor-pointer hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-large transform hover:-translate-y-1 active:translate-y-0' : '',
    success: 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20',
    warning: 'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20',
    danger: 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20',
    info: 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20',
  };

  const cardContent = (
    <div className={`${baseClasses} ${variantClasses[variant]} ${className}`} {...props}>
      {/* Header */}
      {header && (
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {icon && <div className="flex-shrink-0">{icon}</div>}
              <div>{header}</div>
            </div>
            {badge && <div className="flex-shrink-0">{badge}</div>}
            {clickable && <ChevronRightIcon className="h-5 w-5 text-gray-400" />}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className={loading ? 'opacity-50' : ''}>
        {children}
      </div>

      {/* Footer */}
      {footer && (
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-b-xl">
          {footer}
        </div>
      )}

      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 bg-white/50 dark:bg-gray-800/50 rounded-xl flex items-center justify-center">
          <div className="loading-spinner h-8 w-8"></div>
        </div>
      )}
    </div>
  );

  if (clickable && onClick) {
    return (
      <button
        onClick={onClick}
        className="w-full text-left focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 rounded-xl"
      >
        {cardContent}
      </button>
    );
  }

  return cardContent;
};

export default EnhancedCard;
