import React from 'react';

const confidenceColors = {
  high: 'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800',
  low: 'bg-red-100 text-red-800',
};

function AIInsightCard({
  type,
  summary,
  confidence,
  why,
  ExplainWhy,
}) {
  return (
    <div className="border rounded-lg shadow-sm p-5 bg-white">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-blue-700 uppercase tracking-wide">AI Suggestion</span>
        <span className={`px-2 py-1 rounded text-xs font-medium ${confidenceColors[confidence] || 'bg-gray-100 text-gray-700'}`}>
          Confidence: {confidence.charAt(0).toUpperCase() + confidence.slice(1)}
        </span>
      </div>
      <div className="mb-2">
        <span className="font-bold">{type}</span>
        <p className="mt-1 text-gray-800">{summary}</p>
      </div>
      <ExplainWhy why={why} />
    </div>
  );
}

export default AIInsightCard;
