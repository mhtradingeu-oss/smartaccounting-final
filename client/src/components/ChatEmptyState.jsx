import React from 'react';

export default function ChatEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center text-gray-500">
      <div className="mb-4">
        <span className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-50 text-blue-600 text-3xl font-bold">
          AI
        </span>
      </div>
      <h2 className="text-xl font-semibold text-gray-800 mb-2">How can the AI Assistant help?</h2>
      <p className="max-w-md mx-auto text-sm mb-4">
        • Summarize risks, overdue items, and explain flagged transactions.
        <br />
        • Answer questions about invoices, expenses, and bank statements.
        <br />
        • Provide audit-friendly, explainable insights.
        <br />
        <span className="block mt-2 text-xs text-gray-400">
          All answers are advisory, read-only, and logged for compliance.
        </span>
      </p>
      <div className="mt-2 text-xs text-gray-400">
        Start by selecting an intent or typing your question below.
      </div>
    </div>
  );
}
