'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

type TabType = 'timing' | 'tokens' | 'cost' | 'context';

interface MetricsTabContextType {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  isExpanded: boolean;
  setIsExpanded: (expanded: boolean) => void;
}

const MetricsTabContext = createContext<MetricsTabContextType | undefined>(undefined);

export function MetricsTabProvider({ children }: { children: ReactNode }) {
  const [activeTab, setActiveTab] = useState<TabType>('timing');
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <MetricsTabContext.Provider value={{ activeTab, setActiveTab, isExpanded, setIsExpanded }}>
      {children}
    </MetricsTabContext.Provider>
  );
}

export function useMetricsTab() {
  const context = useContext(MetricsTabContext);
  if (context === undefined) {
    throw new Error('useMetricsTab must be used within a MetricsTabProvider');
  }
  return context;
}

// Made with Bob