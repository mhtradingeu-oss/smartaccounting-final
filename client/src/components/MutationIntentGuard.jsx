// Detects mutation intent in AI prompts and blocks unsafe requests
import React from 'react';

import mutationIntentConfig from '../../../shared/ai/mutationIntentConfig.json';

const compiledPatterns = (mutationIntentConfig.patterns || []).map((pattern) => ({
  regex: new RegExp(pattern.pattern, pattern.flags || 'i'),
}));

export function detectMutationIntent(prompt) {
  if (!prompt) {
    return false;
  }
  const normalized = prompt.toLowerCase();
  if (mutationIntentConfig.keywords.some((keyword) => normalized.includes(keyword))) {
    return true;
  }
  return compiledPatterns.some(({ regex }) => regex.test(prompt));
}

export default function MutationIntentGuard({ prompt }) {
  if (detectMutationIntent(prompt)) {
    return (
      <div className="bg-yellow-100 text-yellow-800 p-2 rounded text-xs font-semibold mb-2">
        Read-only mode: I can explain and recommend, but I cannot change data.
      </div>
    );
  }
  // Visually hidden for accessibility, avoids blank render
  return <span className="sr-only">No mutation intent detected</span>;
}
