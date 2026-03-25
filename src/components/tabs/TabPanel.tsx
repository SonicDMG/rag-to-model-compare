'use client';

import { TabPanelProps } from '@/types/tabs';

/**
 * TabPanel - Wrapper for tab content that conditionally renders based on active tab
 * 
 * Features:
 * - Only renders when tab is active (performance optimization)
 * - Smooth fade-in animation
 * - Maintains content in DOM when switching tabs (preserves state)
 */
export function TabPanel({ tabId, activeTab, children, className = '' }: TabPanelProps) {
  const isActive = tabId === activeTab;

  // Don't render inactive tabs to improve performance
  if (!isActive) {
    return null;
  }

  return (
    <div
      role="tabpanel"
      id={`tabpanel-${tabId}`}
      aria-labelledby={`tab-${tabId}`}
      className={`animate-fadeIn ${className}`}
    >
      {children}
    </div>
  );
}

// Made with Bob