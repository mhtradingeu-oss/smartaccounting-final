import React from 'react';
import { Badge } from './ui/Badge';
import aiIconUrl from '../assets/ai-premium.svg';

/**
 * Professional AI badge for premium/enterprise AI features.
 * Usage: <AIBadge />
 */
export function AIBadge({ label = 'AI', className = '', ...props }) {
  return (
    <Badge
      color="blue"
      className={`flex items-center gap-1 px-2 py-0.5 rounded font-semibold uppercase tracking-wide shadow-sm ${className} transition-all duration-200`}
      style={{ letterSpacing: '0.04em', fontSize: '0.75rem' }}
      {...props}
    >
      <span className="inline-flex items-center">
        <img
          src={aiIconUrl}
          width={16}
          height={16}
          alt="AI"
          className="mr-1"
        />
        {label}
      </span>
    </Badge>
  );
}
