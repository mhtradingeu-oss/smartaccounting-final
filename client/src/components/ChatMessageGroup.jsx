import React from 'react';

/**
 * ChatMessageGroup groups consecutive messages from the same speaker, with timestamp and styling.
 * Props:
 * - group: { speaker: "user"|"assistant", messages: [{ id, text, timestamp, highlights, references, error }], avatar?: ReactNode }
 */
export default function ChatMessageGroup({ group }) {
  const isAssistant = group.speaker === 'assistant';
  return (
    <div className={`flex w-full ${isAssistant ? 'justify-start' : 'justify-end'} mb-4`}>
      {isAssistant && (
        <div className="flex-shrink-0 mr-2">
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold">
            AI
          </div>
        </div>
      )}
      <div
        className={`max-w-[70%] w-fit ${isAssistant ? 'bg-white border border-gray-200' : 'bg-primary-50 border border-primary-200'} rounded-xl p-3 shadow-sm`}
      >
        {group.messages.map((msg) => (
          <div key={msg.id} className="mb-2 last:mb-0">
            {msg.error && <div className="text-xs text-red-600 mb-1">{msg.error}</div>}
            <div className="text-sm text-gray-900 whitespace-pre-line">{msg.text}</div>
            {msg.highlights && (
              <ul className="mt-1 space-y-1 text-xs text-gray-600">
                {msg.highlights.map((line, i) => (
                  <li key={i}>• {line}</li>
                ))}
              </ul>
            )}
            {msg.references && (
              <div className="mt-1 text-[11px] text-gray-500">
                References: {msg.references.join(' · ')}
              </div>
            )}
            {msg.meta && (
              <div className="mt-1 text-[11px] text-gray-500">
                Source: {msg.meta.source || 'Not available'} · Confidence:{' '}
                {msg.meta.confidence || 'Not available'} · Last updated:{' '}
                {msg.meta.lastUpdated || 'Not available'}
              </div>
            )}
            {msg.timestamp && (
              <div className="mt-1 text-[10px] text-gray-400 text-right">{msg.timestamp}</div>
            )}
          </div>
        ))}
      </div>
      {!isAssistant && (
        <div className="flex-shrink-0 ml-2">
          <div className="w-8 h-8 rounded-full bg-primary-200 flex items-center justify-center text-primary-800 font-bold">
            You
          </div>
        </div>
      )}
    </div>
  );
}
