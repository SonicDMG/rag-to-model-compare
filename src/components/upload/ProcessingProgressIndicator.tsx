'use client';

import { useEffect, useState } from 'react';

interface ProcessingProgressIndicatorProps {
  totalFiles: number;
  completedFiles: number;
  processingFiles: number;
  isActive: boolean;
}

export function ProcessingProgressIndicator({
  totalFiles,
  completedFiles,
  processingFiles,
  isActive,
}: ProcessingProgressIndicatorProps) {
  const marchingBoxes = [0, 1, 2, 3, 4];
  const [animationOffset, setAnimationOffset] = useState(0);

  // Animate marching boxes
  useEffect(() => {
    if (!isActive) return;

    const interval = setInterval(() => {
      setAnimationOffset((prev) => (prev + 1) % 5);
    }, 300);

    return () => clearInterval(interval);
  }, [isActive]);

  // Calculate progress percentage
  const progressPercentage = totalFiles > 0 ? (completedFiles / totalFiles) * 100 : 0;

  if (!isActive) return null;

  return (
    <div className="space-y-3">
      {/* Marching Boxes Animation */}
      <div className="flex items-center gap-2">
        <div className="flex gap-1.5">
          {marchingBoxes.map((box, index) => {
            const isActive = (index + animationOffset) % 5 < 3;
            return (
              <div
                key={box}
                className={`
                  w-3 h-3 rounded-sm transition-all duration-300
                  ${isActive 
                    ? 'bg-unkey-teal-500 shadow-[0_0_8px_rgba(20,184,166,0.6)]' 
                    : 'bg-unkey-gray-700'
                  }
                `}
              />
            );
          })}
        </div>
        <span className="text-sm text-unkey-gray-300 font-medium">
          Processing...
        </span>
      </div>

      {/* Progress Bar with File Count */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-unkey-gray-400">
            {completedFiles} of {totalFiles} files processed
          </span>
          {processingFiles > 0 && (
            <span className="text-unkey-teal-400 animate-pulse">
              {processingFiles} in progress
            </span>
          )}
        </div>
        
        {/* Progress Bar */}
        <div className="relative w-full h-2 bg-unkey-gray-800 rounded-full overflow-hidden">
          {/* Background shimmer effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-unkey-gray-700 to-transparent animate-shimmer" />
          
          {/* Actual progress */}
          <div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-unkey-teal-500 to-unkey-teal-400 transition-all duration-500 ease-out rounded-full"
            style={{ width: `${progressPercentage}%` }}
          >
            {/* Animated shine effect on progress bar */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shine" />
          </div>
        </div>
      </div>

      {/* Pulsing Dots Indicator */}
      <div className="flex items-center gap-2">
        <div className="flex gap-1">
          {[0, 1, 2].map((dot) => (
            <div
              key={dot}
              className="w-2 h-2 rounded-full bg-unkey-teal-500 animate-pulse"
              style={{
                animationDelay: `${dot * 150}ms`,
                animationDuration: '1.5s',
              }}
            />
          ))}
        </div>
        <span className="text-xs text-unkey-gray-500">
          Parsing and indexing documents
        </span>
      </div>
    </div>
  );
}

// Made with Bob
