import React from 'react';

export default function ChatTypingIndicator({ isAssistant }) {
  return (
    <div className={`flex w-full ${isAssistant ? 'justify-start' : 'justify-end'} mb-2`}>
      {isAssistant && (
        <div className="flex-shrink-0 mr-2">
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold">
            AI
          </div>
        </div>
      )}
      <div
        className={`max-w-[70%] w-fit ${isAssistant ? 'bg-white border border-gray-200' : 'bg-primary-50 border border-primary-200'} rounded-xl p-3 shadow-sm flex items-center gap-2`}
      >
        <span
          className="inline-block w-2 h-2 bg-gray-400 rounded-full animate-bounce"
          style={{ animationDelay: '0ms' }}
        ></span>
        <span
          className="inline-block w-2 h-2 bg-gray-400 rounded-full animate-bounce"
          style={{ animationDelay: '150ms' }}
        ></span>
        <span
          className="inline-block w-2 h-2 bg-gray-400 rounded-full animate-bounce"
          style={{ animationDelay: '300ms' }}
        ></span>
        <span className="ml-2 text-xs text-gray-400">
          {isAssistant ? 'AI is typing...' : 'You are typing...'}
        </span>
      </div>
    </div>
  );
}
