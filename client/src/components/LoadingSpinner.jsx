
import React from 'react';

const sizeClasses = {
  small: 'w-4 h-4',
  medium: 'w-8 h-8',
  large: 'w-12 h-12',
};

const aliasSizes = {
  sm: 'small',
  md: 'medium',
  lg: 'large',
};

const LoadingSpinner = ({ size = 'medium', className = '', label = 'Loading' }) => {
  const normalizedSize = aliasSizes[size] || size;
  const spinnerSizeClass = sizeClasses[normalizedSize] || sizeClasses.medium;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={label}
      className={`animate-spin rounded-full border-2 border-gray-300 border-t-blue-600 ${spinnerSizeClass} ${className}`}
    />
  );
};

export default LoadingSpinner;
