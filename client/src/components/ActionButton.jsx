
import React from 'react';
import { ChevronRightIcon } from '@heroicons/react/24/outline';

const ActionButton = ({
  children,
  icon,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  onClick,
  href,
  target,
  className = '',
  ...props
}) => {
  const baseClasses = `
    inline-flex items-center justify-center font-medium rounded-xl 
    transition-all duration-200 focus:outline-none focus:ring-2 
    focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed 
    border border-transparent transform hover:-translate-y-0.5 
    active:translate-y-0
  `;

  const sizeClasses = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-6 py-3 text-base',
    xl: 'px-8 py-4 text-lg',
  };

  const variantClasses = {
    primary: `
      bg-gradient-to-r from-primary-600 to-primary-700 text-white 
      hover:from-primary-700 hover:to-primary-800 focus:ring-primary-500 
      shadow-lg shadow-primary-500/25 hover:shadow-xl hover:shadow-primary-500/30
    `,
    secondary: `
      bg-white text-gray-700 border-gray-300 hover:bg-gray-50 
      hover:border-gray-400 focus:ring-gray-500 dark:bg-gray-800 
      dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-700 
      shadow-sm hover:shadow-md
    `,
    success: `
      bg-gradient-to-r from-emerald-600 to-emerald-700 text-white 
      hover:from-emerald-700 hover:to-emerald-800 focus:ring-emerald-500 
      shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:shadow-emerald-500/30
    `,
    danger: `
      bg-gradient-to-r from-red-600 to-red-700 text-white 
      hover:from-red-700 hover:to-red-800 focus:ring-red-500 
      shadow-lg shadow-red-500/25 hover:shadow-xl hover:shadow-red-500/30
    `,
    warning: `
      bg-gradient-to-r from-amber-500 to-amber-600 text-white 
      hover:from-amber-600 hover:to-amber-700 focus:ring-amber-500 
      shadow-lg shadow-amber-500/25 hover:shadow-xl hover:shadow-amber-500/30
    `,
    ghost: `
      bg-transparent text-gray-700 hover:bg-gray-100 focus:ring-gray-500 
      dark:text-gray-300 dark:hover:bg-gray-800
    `,
    outline: `
      bg-transparent text-primary-600 border-primary-600 hover:bg-primary-50 
      hover:text-primary-700 focus:ring-primary-500 dark:text-primary-400 
      dark:border-primary-400 dark:hover:bg-primary-900/20
    `,
  };

  const widthClass = fullWidth ? 'w-full' : '';

  const classes = `
    ${baseClasses} 
    ${sizeClasses[size]} 
    ${variantClasses[variant]} 
    ${widthClass} 
    ${className}
  `;

  const content = (
    <>
      {loading && (
        <div className="loading-spinner h-4 w-4 mr-2"></div>
      )}
      {icon && !loading && (
        <div className="flex-shrink-0 -ml-1 mr-2">
          {icon}
        </div>
      )}
      <span>{children}</span>
      {href && (
        <ChevronRightIcon className="ml-2 -mr-1 h-4 w-4" />
      )}
    </>
  );

  if (href) {
    return (
      <a
        href={href}
        target={target}
        className={classes}
        {...props}
      >
        {content}
      </a>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className={classes}
      {...props}
    >
      {content}
    </button>
  );
};

export default ActionButton;
