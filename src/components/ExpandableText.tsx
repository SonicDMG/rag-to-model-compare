'use client';

import { useState } from 'react';

interface ExpandableTextProps {
  text: string;
  characterLimit?: number;
  className?: string;
}

export function ExpandableText({
  text,
  characterLimit = 400,
  className = ''
}: ExpandableTextProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Check if text needs truncation
  const needsTruncation = text.length > characterLimit;
  
  // Get display text based on expansion state
  const displayText = needsTruncation && !isExpanded
    ? text.slice(0, characterLimit) + '...'
    : text;

  return (
    <div className={`flex flex-col flex-shrink-0 ${className}`}>
      <div
        className="text-unkey-gray-300 whitespace-pre-wrap leading-relaxed"
        style={{
          height: isExpanded ? 'auto' : '180px',
          overflow: isExpanded ? 'visible' : 'hidden'
        }}
      >
        {displayText}
      </div>
      
      {needsTruncation && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-unkey-teal-400 hover:text-unkey-teal-300 transition-colors focus:outline-none focus:ring-2 focus:ring-unkey-teal-500 focus:ring-offset-2 focus:ring-offset-unkey-gray-900 rounded-unkey-md px-2 py-1 self-start flex-shrink-0"
          aria-expanded={isExpanded}
          aria-label={isExpanded ? 'Show less text' : 'Show more text'}
        >
          {isExpanded ? (
            <>
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 15l7-7 7 7"
                />
              </svg>
              Show less
            </>
          ) : (
            <>
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
              Show more
            </>
          )}
        </button>
      )}
    </div>
  );
}

// Made with Bob