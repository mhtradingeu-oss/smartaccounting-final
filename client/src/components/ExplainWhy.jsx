import React from 'react';

const ExplainWhy = ({ why }) => (
  <div className="mt-2 text-sm text-gray-600 border-l-4 border-blue-200 pl-3 bg-blue-50">
    <span className="font-semibold text-blue-700">Why this matters:</span>
    <div className="mt-1">{why.text}</div>
    {why.legal && (
      <div className="mt-1 text-xs text-gray-500">
        <span className="font-semibold">Legal context:</span> {why.legal}
      </div>
    )}
    {why.hint && (
      <div className="mt-1 text-xs text-yellow-700">
        <span className="font-semibold">Compliance hint:</span> {why.hint}
      </div>
    )}
  </div>
);

export default ExplainWhy;
