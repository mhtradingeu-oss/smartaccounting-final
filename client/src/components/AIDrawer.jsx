import React from 'react';
import AIInsightCard from './AIInsightCard';
import { AIBadge } from './AIBadge';

function AIDrawer({ open, onClose, insights }) {
  // context: { companyId, route, selectedEntityId }
  // insights: array of { type, summary, confidence, why }
  if (!open) {
    // Render offscreen but hidden for accessibility, avoids blank render
    return (
      <aside
        className="fixed right-[-9999px] top-0 h-full w-96 bg-white shadow-lg z-50 flex flex-col"
        aria-hidden="true"
      />
    );
  }
  return (
    <aside
      className="fixed right-0 top-0 h-full w-96 bg-white shadow-lg z-50 flex flex-col transition-all duration-300"
      role="dialog"
      aria-modal="true"
      aria-label="AI Insights Drawer"
      tabIndex={-1}
    >
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <AIBadge label="AI" />
          <span className="font-bold text-lg" id="ai-insights-drawer-label">
            AI Insights
          </span>
        </div>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-900 transition-colors duration-200 focus:outline-blue-700 focus:ring-2 focus:ring-blue-700"
          aria-label="Close insights drawer"
        >
          ×
        </button>
      </div>
      <div className="p-4 overflow-y-auto flex-1 transition-all duration-300" aria-live="polite">
        {insights && insights.length > 0 ? (
          insights.map((insight, idx) => (
            <AIInsightCard
              key={insight.id || idx}
              {...insight}
              severity={insight.severity}
              dataSource={insight.dataSource}
              lastEvaluated={insight.lastEvaluated || insight.updatedAt || insight.timestamp}
              whyMatters={typeof insight.rationale === 'string' ? insight.rationale : insight.summary}
              ExplainWhy={({ why }) => (
                <div className="mt-2 text-xs text-gray-600" aria-label="AI insight context">
                  <strong>Context:</strong> {why}
                </div>
              )}
            />
          ))
        ) : (
          <div className="text-gray-500 text-sm">
            No insights available yet. Sync data or review recent invoices and transactions to
            surface new insights.
          </div>
        )}
      </div>
    </aside>
  );
}

export default AIDrawer;
