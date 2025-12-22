
import React from 'react';
import { DocumentIcon, PlusIcon } from '@heroicons/react/24/outline';
import ActionButton from './ActionButton';

const EmptyState = ({
  icon: CustomIcon,
  title,
  description,
  action,
  actionText = 'Get Started',
  actionIcon = <PlusIcon className="h-4 w-4" />,
  className = '',
  variant = 'default', // 'default', 'minimal', 'illustrated'
}) => {
  const Icon = CustomIcon || DocumentIcon;

  return (
    <div className={`text-center py-12 px-6 ${className}`}>
      {/* Icon */}
      <div className="mx-auto h-24 w-24 text-gray-400 dark:text-gray-500 mb-6">
        <Icon className="h-full w-full" />
      </div>

      {/* Content */}
      <div className="max-w-sm mx-auto">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          {title}
        </h3>
        
        {description && (
          <p className="text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
            {description}
          </p>
        )}

        {/* Action */}
        {action && (
          <div className="mt-6">
            {typeof action === 'function' ? (
              <ActionButton
                onClick={action}
                icon={actionIcon}
                variant="primary"
              >
                {actionText}
              </ActionButton>
            ) : (
              action
            )}
          </div>
        )}
      </div>

      {/* Background Pattern for illustrated variant */}
      {variant === 'illustrated' && (
        <div className="absolute inset-0 -z-10 bg-pattern opacity-30"></div>
      )}
    </div>
  );
};

export default EmptyState;
