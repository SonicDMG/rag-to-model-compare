/**
 * Type definitions for tabbed interface
 */

/**
 * Available tab identifiers
 */
export type TabId = 'ingest' | 'query' | 'performance' | 'charts';

/**
 * Tab configuration
 */
export interface TabConfig {
  /** Unique identifier for the tab */
  id: TabId;
  /** Display label */
  label: string;
  /** Icon/emoji for the tab */
  icon: string;
  /** Whether the tab is currently enabled/accessible */
  enabled: boolean;
  /** Optional badge text (e.g., document name, query count) */
  badge?: string;
  /** Optional badge color variant */
  badgeVariant?: 'default' | 'success' | 'warning' | 'info';
}

/**
 * Tab state management
 */
export interface TabState {
  /** Currently active tab */
  activeTab: TabId;
  /** Function to change active tab */
  setActiveTab: (tab: TabId) => void;
  /** Tab configurations with enabled states */
  tabs: TabConfig[];
}

/**
 * Query history item stored in localStorage
 */
export interface QueryHistoryItem {
  /** Unique identifier */
  id: string;
  /** The query text */
  query: string;
  /** When the query was executed */
  timestamp: Date;
  /** RAG pipeline result */
  ragResult: any; // Using any to avoid circular dependencies
  /** Hybrid pipeline result (uses direct context with RAG data when needed) */
  hybridResult: any;
  /** Direct pipeline result (via Ollama) */
  directResult?: any;
}

/**
 * Props for TabContainer component
 */
export interface TabContainerProps {
  /** Initial tab to display */
  defaultTab?: TabId;
  /** Whether document has been uploaded */
  hasDocument: boolean;
  /** Whether any query has been executed */
  hasQueryResults: boolean;
  /** Optional document name for badge */
  documentName?: string;
  /** Optional query count for badge */
  queryCount?: number;
  /** Children (tab panels) - can be render props or regular children */
  children: React.ReactNode | ((tabState: TabState) => React.ReactNode);
}

/**
 * Props for TabNavigation component
 */
export interface TabNavigationProps {
  /** Current tab state */
  tabState: TabState;
  /** Callback when tab is clicked */
  onTabChange: (tab: TabId) => void;
}

/**
 * Props for TabPanel component
 */
export interface TabPanelProps {
  /** Tab identifier this panel belongs to */
  tabId: TabId;
  /** Currently active tab */
  activeTab: TabId;
  /** Panel content */
  children: React.ReactNode;
  /** Optional className for custom styling */
  className?: string;
}

// Made with Bob