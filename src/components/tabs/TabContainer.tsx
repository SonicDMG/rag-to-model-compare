'use client';

import { useState, useEffect, useMemo } from 'react';
import { TabContainerProps, TabId, TabConfig } from '@/types/tabs';
import { TabNavigation } from './TabNavigation';

/**
 * Check if there's query history in localStorage
 */
function hasQueryHistory(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const stored = localStorage.getItem('queryHistory');
    if (!stored) return false;
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) && parsed.length > 0;
  } catch {
    return false;
  }
}

/**
 * TabContainer - Main container that manages tab state and navigation
 *
 * Features:
 * - Manages active tab state
 * - Syncs with URL hash (#ingest, #query, #performance, #charts)
 * - Keyboard shortcuts (Cmd/Ctrl + 1/2/3/4)
 * - Auto-enables tabs based on workflow progress
 * - Charts tab enabled when localStorage has data
 * - Provides tab state to children via render props
 */
export function TabContainer({
  defaultTab = 'ingest',
  hasDocument,
  hasQueryResults,
  documentName,
  queryCount,
  children,
}: TabContainerProps) {
  const [activeTab, setActiveTab] = useState<TabId>(defaultTab);
  const [hasHistoryData, setHasHistoryData] = useState(false);

  // Check for query history on mount and when queryCount changes
  useEffect(() => {
    setHasHistoryData(hasQueryHistory());
  }, [queryCount]);

  // Build tab configurations based on current state
  const tabs = useMemo<TabConfig[]>(() => {
    return [
      {
        id: 'ingest',
        label: 'Ingest',
        icon: '📤',
        enabled: true,
        badge: documentName,
        badgeVariant: 'success',
      },
      {
        id: 'query',
        label: 'Query',
        icon: '🔍',
        enabled: hasDocument,
        badge: queryCount && queryCount > 0 ? `${queryCount}` : undefined,
        badgeVariant: 'info',
      },
      {
        id: 'performance',
        label: 'Performance',
        icon: '📊',
        enabled: hasQueryResults,
        badge: hasQueryResults ? 'Ready' : undefined,
        badgeVariant: 'default',
      },
      {
        id: 'charts',
        label: 'Charts',
        icon: '📈',
        enabled: hasHistoryData,
        badge: hasHistoryData && queryCount ? `${queryCount}` : undefined,
        badgeVariant: 'info',
      },
    ];
  }, [hasDocument, hasQueryResults, documentName, queryCount, hasHistoryData]);

  // Sync active tab with URL hash
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1) as TabId;
      if (hash && ['ingest', 'query', 'performance', 'charts'].includes(hash)) {
        const tab = tabs.find((t) => t.id === hash);
        if (tab?.enabled) {
          setActiveTab(hash);
        }
      }
    };

    // Set initial tab from hash
    handleHashChange();

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [tabs]);

  // Update URL hash when tab changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.location.hash = activeTab;
    }
  }, [activeTab]);

  // Keyboard shortcuts: Cmd/Ctrl + 1/2/3/4
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey) {
        const keyMap: Record<string, TabId> = {
          '1': 'ingest',
          '2': 'query',
          '3': 'performance',
          '4': 'charts',
        };

        const targetTab = keyMap[e.key];
        if (targetTab) {
          const tab = tabs.find((t) => t.id === targetTab);
          if (tab?.enabled) {
            e.preventDefault();
            setActiveTab(targetTab);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [tabs]);

  const handleTabChange = (tab: TabId) => {
    setActiveTab(tab);
  };

  const tabState = {
    activeTab,
    setActiveTab,
    tabs,
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Tab Navigation */}
      <TabNavigation tabState={tabState} onTabChange={handleTabChange} />

      {/* Tab Content */}
      <div className="flex-1">
        {typeof children === 'function' ? children(tabState) : children}
      </div>
    </div>
  );
}

// Made with Bob