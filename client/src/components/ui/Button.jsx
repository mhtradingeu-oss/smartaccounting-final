import React from 'react';
import clsx from 'clsx';

import { designTokens } from '../../lib/designTokens';

const variantClasses = {
  primary: 'bg-primary-600 text-white hover:bg-primary-700 focus-visible:ring-primary-500',
  secondary:
    'bg-gray-100 text-gray-900 hover:bg-gray-200 border border-transparent focus-visible:ring-primary-500',
  danger: 'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500',
  outline: 'border border-gray-300 bg-transparent text-gray-900 hover:bg-gray-50 focus-visible:ring-primary-500',
  ghost: 'bg-transparent text-gray-900 hover:bg-gray-100 focus-visible:ring-primary-500',
};

const sizeStyles = {
  sm: {
    padding: `${designTokens.spacing.sm} ${designTokens.spacing.md}`,
    fontSize: '0.875rem',
  },
  md: {
    padding: `${designTokens.spacing.md} ${designTokens.spacing.lg}`,
    fontSize: '1rem',
  },
  lg: {
    padding: `${designTokens.spacing.lg} ${designTokens.spacing.xl}`,
    fontSize: '1.125rem',
  },
};

const Spinner = ({ variant }) => {
  const borderColor =
    variant === 'secondary' || variant === 'ghost' || variant === 'outline'
      ? 'border-primary-500'
      : 'border-white';
  return (
    <span
      aria-hidden="true"
      className={clsx(
        'inline-block h-4 w-4 animate-spin rounded-full border-2 border-t-transparent',
        borderColor,
      )}
    />
  );
};

export const Button = React.forwardRef(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      loading = false,
      disabled = false,
      className = '',
      ...props
    },
    ref,
  ) => {
    const isDisabled = disabled || loading;
    const sizeStyle = sizeStyles[size] || sizeStyles.md;
    return (
    <button
      ref={ref}
      type={props.type || 'button'}
      className={clsx(
        'inline-flex items-center justify-center gap-2 rounded font-semibold transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:opacity-60 disabled:cursor-not-allowed',
        variantClasses[variant],
        className,
      )}
      style={{
        borderRadius: designTokens.radius.base,
        boxShadow: isDisabled ? 'none' : designTokens.shadow.base,
        padding: sizeStyle.padding,
        fontSize: sizeStyle.fontSize,
      }}
      disabled={isDisabled}
      aria-disabled={isDisabled}
      aria-busy={loading}
      {...props}
    >
        {loading && <Spinner variant={variant} />}
        <span className={loading ? 'opacity-80' : undefined}>{children}</span>
      </button>
    );
  },
);

Button.displayName = 'Button';

export default Button;
