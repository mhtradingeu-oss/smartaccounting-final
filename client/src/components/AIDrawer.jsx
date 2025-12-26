import React from 'react';
import AIInsightCard from './AIInsightCard';

function AIDrawer({ open, onClose, insights }) {
  // context: { companyId, route, selectedEntityId }
  // insights: array of { type, summary, confidence, why }
  if (!open) {
    // Render offscreen but hidden for accessibility, avoids blank render
    return (
      <aside
        className="fixed right-[-9999px] top-0 h-full w-96 bg-white shadow-lg z-50 flex flex-col"
        aria-hidden="true"
        tabIndex={-1}
      />
    );
  }
  return (
    <aside className="fixed right-0 top-0 h-full w-96 bg-white shadow-lg z-50 flex flex-col">
      <div className="flex items-center justify-between p-4 border-b">
        <span className="font-bold text-lg">AI Insights</span>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-900">
          ✕
        </button>
      </div>
      <div className="p-4 overflow-y-auto flex-1">
        {insights && insights.length > 0 ? (
          insights.map((insight, idx) => (
            <AIInsightCard
              key={idx}
              {...insight}
              ExplainWhy={({ why }) => (
                <div className="mt-2 text-xs text-gray-600">
                  <span className="font-semibold">Why:</span> {why}
                </div>
              )}
            />
          ))
        ) : (
          <div className="text-center text-gray-500 mt-10">
            <div className="mb-2">No insights available for this context.</div>
            <div className="italic">AI can explain and recommend, but cannot change data.</div>
          </div>
        )}
      </div>
      <div className="p-4 border-t text-xs text-gray-700 bg-gray-50">
        <span className="font-semibold">Insight / Recommendation — No actions executed</span>
      </div>
    </aside>
  );
}

export default AIDrawer;
