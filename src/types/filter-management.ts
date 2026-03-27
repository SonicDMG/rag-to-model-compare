/**
 * Type definitions for OpenRAG Knowledge Filter Management
 * 
 * Defines interfaces for filter configuration, CRUD operations,
 * and UI component props for the visual filter management system.
 */

/**
 * OpenRAG Knowledge Filter Configuration
 * 
 * Represents a knowledge filter that scopes document retrieval
 * to specific data sources with configurable parameters.
 */
export interface FilterConfig {
  /** Unique filter identifier from OpenRAG */
  id: string;
  /** User-friendly filter name */
  name: string;
  /** Optional description */
  description?: string;
  /** Query configuration */
  queryData: {
    /** Number of chunks to retrieve */
    limit: number;
    /** Minimum relevance score threshold (0-1) */
    scoreThreshold: number;
    /** Filter color for visual identification */
    color?: string;
    /** Filters object */
    filters: {
      /** Array of document filenames to filter by */
      data_sources: string[];
    };
  };
  /** Creation timestamp */
  createdAt?: Date;
  /** Last modified timestamp */
  updatedAt?: Date;
}

/**
 * Filter selector component props
 */
export interface FilterSelectorProps {
  /** Currently selected filter ID */
  currentFilter: string | null;
  /** Array of available filters */
  availableFilters: FilterConfig[];
  /** Callback when filter selection changes */
  onFilterChange: (filterId: string) => void;
  /** Whether the selector is disabled */
  disabled?: boolean;
  /** Whether filters are being loaded */
  isLoading?: boolean;
  /** Callback to open filter management modal */
  onManageFilters: () => void;
}

/**
 * Filter form data for create/edit operations
 */
export interface FilterFormData {
  /** Filter name (required) */
  name: string;
  /** Filter description (optional) */
  description?: string;
  /** Number of chunks to retrieve (default: 5) */
  limit: number;
  /** Minimum relevance score (default: 0.5) */
  scoreThreshold: number;
  /** Filter color for visual identification (default: 'teal') */
  color?: string;
}

/**
 * Filter management modal props
 */
export interface FilterManagementModalProps {
  /** Whether modal is open */
  isOpen: boolean;
  /** Callback to close modal */
  onClose: () => void;
  /** Current filters list */
  filters: FilterConfig[];
  /** Callback when filters are updated */
  onFiltersUpdated: () => void;
  /** Currently selected filter ID */
  currentFilterId: string | null;
}

/**
 * Filter context state
 * 
 * Provides global state management for filter selection
 * and CRUD operations throughout the application.
 */
export interface FilterContextState {
  /** Currently selected filter */
  currentFilter: FilterConfig | null;
  /** All available filters */
  availableFilters: FilterConfig[];
  /** Whether filters are being loaded */
  isLoading: boolean;
  /** Error message if any */
  error: string | null;
  /** Select a filter by ID */
  selectFilter: (filterId: string) => Promise<void>;
  /** Refresh filters list from OpenRAG */
  refreshFilters: () => Promise<void>;
  /** Create a new filter */
  createFilter: (data: FilterFormData) => Promise<FilterConfig>;
  /** Update an existing filter */
  updateFilter: (filterId: string, data: Partial<FilterFormData>) => Promise<void>;
  /** Delete a filter */
  deleteFilter: (filterId: string) => Promise<void>;
}

/**
 * Request to create a new filter
 */
export interface CreateFilterRequest {
  name: string;
  description?: string;
  limit: number;
  scoreThreshold: number;
  color?: string;
}

/**
 * Response from filter creation
 */
export interface CreateFilterResponse {
  success: boolean;
  filter?: FilterConfig;
  error?: string;
}

/**
 * Request to list all filters
 */
export interface ListFiltersRequest {
  // No parameters needed - lists all filters
}

/**
 * Response from listing filters
 */
export interface ListFiltersResponse {
  success: boolean;
  filters: FilterConfig[];
  error?: string;
}

/**
 * Request to update a filter
 */
export interface UpdateFilterRequest {
  filterId: string;
  name?: string;
  description?: string;
  limit?: number;
  scoreThreshold?: number;
  color?: string;
  dataSources?: string[];
}

/**
 * Response from filter update
 */
export interface UpdateFilterResponse {
  success: boolean;
  filter?: FilterConfig;
  error?: string;
}

/**
 * Request to delete a filter
 */
export interface DeleteFilterRequest {
  filterId: string;
}

/**
 * Response from filter deletion
 */
export interface DeleteFilterResponse {
  success: boolean;
  error?: string;
}

// Made with Bob
