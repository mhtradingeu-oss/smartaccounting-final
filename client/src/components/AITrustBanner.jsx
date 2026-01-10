import React from 'react';
import PropTypes from 'prop-types';
import clsx from '../lib/clsx';

const defaultItems = [
  'AI outputs are advisory only and never execute actions.',
  'All interactions are logged to the audit trail.',
  'Review with a qualified professional before acting.',
  'Access and visibility depend on role and feature flags.',
];

export default function AITrustBanner({
  title = 'AI Advisory Notice',
  summary = 'AI outputs are advisory and do not change your data.',
  items = defaultItems,
  policyUrl = 'https://www.iso.org/isoiec-23894-ai-risk-management.html',
  className = '',
}) {
  return (
    <section
      className={clsx(
        'rounded-lg border border-blue-100 bg-blue-50/60 px-4 py-3 text-blue-900',
        className,
      )}
      role="status"
      aria-label="AI advisory notice"
    >
      <div className="text-sm font-semibold">{title}</div>
      <p className="text-xs text-blue-800 mt-1">{summary}</p>
      <details className="mt-2 text-xs text-blue-700">
        <summary className="cursor-pointer font-semibold text-blue-700 hover:text-blue-900">
          Learn more
        </summary>
        <ul className="mt-2 list-disc pl-5 space-y-1">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        {policyUrl ? (
          <div className="mt-2">
            <a
              href={policyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="underline text-blue-800"
            >
              Policy and responsibility boundaries
            </a>
          </div>
        ) : null}
      </details>
    </section>
  );
}

AITrustBanner.propTypes = {
  title: PropTypes.string,
  summary: PropTypes.string,
  items: PropTypes.arrayOf(PropTypes.string),
  policyUrl: PropTypes.string,
  className: PropTypes.string,
};
