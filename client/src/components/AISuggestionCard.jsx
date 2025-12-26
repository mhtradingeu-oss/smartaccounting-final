import React from 'react';
import PropTypes from 'prop-types';

/**
 * Displays a read-only AI suggestion with all required fields and safe labeling.
 */
export function AISuggestionCard({ suggestion }) {
  if (!suggestion) {
    // Visually hidden for accessibility, avoids blank render
    return <span className="sr-only">No suggestion available</span>;
  }
  return (
    <div className="border rounded p-4 bg-gray-50 shadow">
      <div className="text-xs font-bold text-blue-700 mb-2">Suggestion / Recommendation only</div>
      <div className="mb-1">
        <strong>Confidence:</strong> {Math.round(suggestion.confidence * 100)}%
      </div>
      <div className="mb-1">
        <strong>Severity:</strong> {suggestion.severity}
      </div>
      <div className="mb-1">
        <strong>Related Entity:</strong> {suggestion.relatedEntity}
      </div>
      <div className="mb-2">
        <strong>Explanation:</strong> {suggestion.explanation}
      </div>
      <div className="italic text-gray-600 text-xs">
        This is an advisory suggestion. No actions will be taken automatically.
      </div>
    </div>
  );
}

AISuggestionCard.propTypes = {
  suggestion: PropTypes.shape({
    confidence: PropTypes.number.isRequired,
    explanation: PropTypes.string.isRequired,
    severity: PropTypes.oneOf(['low', 'medium', 'high']).isRequired,
    relatedEntity: PropTypes.string.isRequired,
    advisory: PropTypes.bool.isRequired,
  }),
};
