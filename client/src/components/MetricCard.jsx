import React from 'react';
import { ArrowUpIcon as ArrowTrendingUpIcon, ArrowDownIcon as ArrowTrendingDownIcon } from '@heroicons/react/24/outline';
import EnhancedCard from './EnhancedCard';

const MetricCard = ({
  title,
  value,
  change,
  changeType = 'neutral', // 'positive', 'negative', neutral'
  icon,
  suffix = '',
  prefix = '',
  description = '',
  trend = null,
  loading = false,
  className = '',
}) => {
  const formatValue = (val) => {
    if (loading) {return '---';}
    if (typeof val === 'number') {
      return val.toLocaleString();
    }
    return val;
  };

  const getChangeColor = () => {
    switch (changeType) {
      case 'positive':
        return 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20';
      case 'negative':
        return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20';
      default:
        return 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/20';
    }
  };

  const getTrendIcon = () => {
    if (changeType === 'positive') {
      return <ArrowTrendingUpIcon className="h-4 w-4" />;
    } else if (changeType === 'negative') {
      return <ArrowTrendingDownIcon className="h-4 w-4" />;
    }
    return null;
  };

  return (
    <EnhancedCard
      variant="elevated"
      loading={loading}
      className={`relative overflow-hidden ${className}`}
    >
      <div className="p-6">
        {/* Header with icon and title */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            {icon && (
              <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
                <div className="h-6 w-6 text-primary-600 dark:text-primary-400">
                  {icon}
                </div>
              </div>
            )}
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
              {title}
            </h3>
          </div>

          {change && (
            <div className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-semibold ${getChangeColor()}`}>
              {getTrendIcon()}
              <span>{change}</span>
            </div>
          )}
        </div>

        {/* Main Value */}
        <div className="mb-2">
          <div className="text-3xl font-bold text-gray-900 dark:text-white leading-none">
            {prefix}{formatValue(value)}{suffix}
          </div>
        </div>

        {/* Description and Trend */}
        {(description || trend) && (
          <div className="flex items-center justify-between text-sm">
            {description && (
              <p className="text-gray-500 dark:text-gray-400">{description}</p>
            )}
            {trend && (
              <div className="text-xs text-gray-400 dark:text-gray-500">
                {trend}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Background Pattern */}
      <div className="absolute top-0 right-0 -mt-4 -mr-4 h-16 w-16 bg-gradient-to-br from-primary-500/10 to-transparent rounded-full"></div>
    </EnhancedCard>
  );
};

export default MetricCard;