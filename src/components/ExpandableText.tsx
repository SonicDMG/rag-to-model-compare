'use client';

import { useState, useRef, useEffect } from 'react';

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
  const [needsTruncation, setNeedsTruncation] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  
  // Check if text needs truncation based on character limit OR overflow
  useEffect(() => {
    const checkTruncation = () => {
      if (text.length > characterLimit) {
        setNeedsTruncation(true);
        return;
      }
      
      // Also check if content overflows the 180px height
      if (contentRef.current) {
        const isOverflowing = contentRef.current.scrollHeight > 180;
        setNeedsTruncation(isOverflowing);
      }
    };
    
    checkTruncation();
  }, [text, characterLimit]);
  
  // Get display text based on expansion state
  const displayText = text.length > characterLimit && !isExpanded
    ? text.slice(0, characterLimit) + '...'
    : text;

  return (
    <div className={`flex flex-col flex-shrink-0 ${className}`}>
      <div
        ref={contentRef}
        className="text-unkey-gray-300 whitespace-pre-wrap leading-relaxed"
        style={{
          minHeight: '180px',
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