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
      <ul className="max-w-md mx-auto text-sm mb-4 list-disc text-left pl-5 space-y-1">
        <li>Summarize risks, overdue items, and flagged transactions.</li>
        <li>Answer questions about invoices, expenses, and bank statements.</li>
        <li>Provide audit-friendly, explainable insights.</li>
      </ul>
      <div className="text-xs text-gray-400 max-w-md">
        Allowed: explanations and summaries. Blocked: creating, editing, deleting, or filing data.
      </div>
      <div className="mt-2 text-xs text-gray-400">
        Start by selecting an intent or typing your question below.
      </div>
    </div>
  );
}
