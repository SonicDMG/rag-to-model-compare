'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

type TabType = 'timing' | 'tokens' | 'cost' | 'context';

interface MetricsTabContextType {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
}

const MetricsTabContext = createContext<MetricsTabContextType | undefined>(undefined);

export function MetricsTabProvider({ children }: { children: ReactNode }) {
  const [activeTab, setActiveTab] = useState<TabType>('timing');

  return (
    <MetricsTabContext.Provider value={{ activeTab, setActiveTab }}>
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