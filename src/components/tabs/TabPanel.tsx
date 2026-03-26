'use client';

import { TabPanelProps } from '@/types/tabs';

/**
 * TabPanel - Wrapper for tab content that conditionally renders based on active tab
 *
 * Features:
 * - Keeps all tabs mounted but hidden (preserves component state)
 * - Shows active tab with fade-in animation
 * - Maintains content in DOM when switching tabs (preserves state)
 */
export function TabPanel({ tabId, activeTab, children, className = '' }: TabPanelProps) {
  const isActive = tabId === activeTab;

  return (
    <div
      role="tabpanel"
      id={`tabpanel-${tabId}`}
      aria-labelledby={`tab-${tabId}`}
      className={`${isActive ? 'animate-fadeIn' : 'hidden'} ${className}`}
    >
      {children}
    </div>
  );
}

// Made with Bob