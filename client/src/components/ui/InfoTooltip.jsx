import React from 'react';

export default function InfoTooltip({ text }) {
  return (
    <span className="relative group inline-block align-middle ml-1">
      <svg
        className="w-4 h-4 text-blue-400 inline cursor-pointer"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="white" />
        <text x="12" y="16" textAnchor="middle" fontSize="12" fill="currentColor">
          i
        </text>
      </svg>
      <span className="absolute z-10 left-1/2 -translate-x-1/2 mt-2 w-64 p-2 rounded bg-white border border-gray-200 text-xs text-gray-700 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto">
        {text}
      </span>
    </span>
  );
}
