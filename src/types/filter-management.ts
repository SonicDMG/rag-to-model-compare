/**
 * CRITICAL TYPE DEFINITIONS: Filter Management
 * 
 * These types enforce compile-time safety for filter operations to prevent
 * race conditions and data inconsistency issues.
 * 
 * DO NOT MODIFY without reading docs/FILTER_MANAGEMENT_ARCHITECTURE.md
 */

/**
 * Branded type for Filter IDs
 * 
 * This prevents accidentally passing regular strings where filter IDs are expected.
 * Forces explicit type checking and validation.
 * 
 * Example:
 *   const filterId: FilterId = validateFilterId(someString);
 *   // Now filterId can only be used where FilterId is expected
 */
export type FilterId = string & { readonly __brand: 'FilterId' };

/**
 * Type guard to validate and brand a string as a FilterId
 * 
 * @param value - String to validate
 * @returns Branded FilterId if valid
 * @throws Error if invalid
 */
export function validateFilterId(value: unknown): FilterId {
  if (typeof value !== 'string') {
    throw new Error(`Invalid filter ID type: expected string, got ${typeof value}`);
  }
  
  if (value.trim() === '') {
    throw new Error('Invalid filter ID: empty string');
  }
  
  if (value.length < 5) {
    throw new Error(`Invalid filter ID: too short (${value.length} chars): ${value}`);
  }
  
  return value as FilterId;
}

/**
 * Type guard to check if a value is a valid FilterId
 * 
 * @param value - Value to check
 * @returns True if value is a valid FilterId
 */
export function isFilterId(value: unknown): value is FilterId {
  try {
    validateFilterId(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Filter creation result
 * 
 * Ensures filter operations return properly typed results
 */
export interface FilterCreationResult {
  /** The created or found filter ID */
  readonly filterId: FilterId;
  /** Whether the filter was newly created (true) or already existed (false) */
  readonly wasCreated: boolean;
  /** Timestamp when the filter was obtained */
  readonly timestamp: Date;
}

/**
 * Filter validation result
 * 
 * Used for runtime validation checks
 */
export interface FilterValidationResult {
  /** Whether the filter is valid */
  readonly isValid: boolean;
  /** The validated filter ID (only if valid) */
  readonly filterId?: FilterId;
  /** Error message (only if invalid) */
  readonly error?: string;
}

/**
 * Filter update batch
 * 
 * Represents a batch of filenames to add to a filter
 */
export interface FilterUpdateBatch {
  /** The filter ID to update */
  readonly filterId: FilterId;
  /** Filenames to add to the filter's data_sources */
  readonly filenames: ReadonlyArray<string>;
  /** Timestamp when the batch was created */
  readonly timestamp: Date;
}

/**
 * Filter lock state
 * 
 * Represents the state of the filter creation lock
 */
export interface FilterLockState {
  /** Whether a lock is currently active */
  readonly isLocked: boolean;
  /** The filter ID being created/found (if locked) */
  readonly filterId?: FilterId;
  /** When the lock was acquired */
  readonly lockedAt?: Date;
  /** Identifier of the request that acquired the lock */
  readonly lockHolder?: string;
}

/**
 * Filter cache entry
 * 
 * Represents a cached filter ID with metadata
 */
export interface FilterCacheEntry {
  /** The cached filter ID */
  readonly filterId: FilterId;
  /** When the entry was cached */
  readonly cachedAt: Date;
  /** When the entry expires */
  readonly expiresAt: Date;
  /** Whether the entry is still valid */
  readonly isValid: boolean;
}

/**
 * Type-safe filter manager interface
 * 
 * Defines the contract for filter management operations
 * All implementations MUST follow this interface
 */
export interface IFilterManager {
  /**
   * Ensure a knowledge filter exists, creating it if necessary
   * 
   * CRITICAL: This method MUST be idempotent and thread-safe
   * Multiple concurrent calls MUST return the same filter ID
   * 
   * @returns Promise resolving to the filter ID
   * @throws Error if filter creation/retrieval fails
   */
  ensureKnowledgeFilter(): Promise<FilterId>;
  
  /**
   * Schedule a batch update to add filenames to a filter
   * 
   * CRITICAL: This method MUST use debouncing to prevent race conditions
   * 
   * @param filterId - The filter to update
   * @param filename - The filename to add
   * @returns Promise that resolves when the update is scheduled
   */
  scheduleBatchUpdate(filterId: FilterId, filename: string): Promise<void>;
  
  /**
   * Validate that a filter exists and is accessible
   * 
   * @param filterId - The filter ID to validate
   * @returns Promise resolving to validation result
   */
  validateFilter(filterId: FilterId): Promise<FilterValidationResult>;
  
  /**
   * Get the current lock state
   * 
   * @returns Current lock state
   */
  getLockState(): FilterLockState;
  
  /**
   * Get the current cache entry (if any)
   * 
   * @returns Current cache entry or undefined
   */
  getCacheEntry(): FilterCacheEntry | undefined;
}

/**
 * Filter consistency check result
 * 
 * Used to verify all documents in a batch use the same filter
 */
export interface FilterConsistencyCheck {
  /** Whether all documents use the same filter */
  readonly isConsistent: boolean;
  /** The expected filter ID */
  readonly expectedFilterId: FilterId;
  /** Filter IDs found in documents */
  readonly foundFilterIds: ReadonlyArray<FilterId>;
  /** Documents with mismatched filter IDs */
  readonly mismatches: ReadonlyArray<{
    readonly documentId: string;
    readonly filename: string;
    readonly filterId: FilterId;
  }>;
}

/**
 * Type guard to ensure a value is a non-empty array of FilterIds
 * 
 * @param value - Value to check
 * @returns True if value is a non-empty array of FilterIds
 */
export function isFilterIdArray(value: unknown): value is ReadonlyArray<FilterId> {
  return Array.isArray(value) && value.length > 0 && value.every(isFilterId);
}

/**
 * Helper to create a filter consistency check
 * 
 * @param expectedFilterId - The filter ID all documents should have
 * @param documentFilterIds - Map of document IDs to their filter IDs
 * @returns Consistency check result
 */
export function checkFilterConsistency(
  expectedFilterId: FilterId,
  documentFilterIds: ReadonlyMap<string, { filterId: FilterId; filename: string }>
): FilterConsistencyCheck {
  const foundFilterIds = new Set<FilterId>();
  const mismatches: Array<{
    documentId: string;
    filename: string;
    filterId: FilterId;
  }> = [];
  
  for (const [documentId, { filterId, filename }] of documentFilterIds) {
    foundFilterIds.add(filterId);
    
    if (filterId !== expectedFilterId) {
      mismatches.push({ documentId, filename, filterId });
    }
  }
  
  return {
    isConsistent: mismatches.length === 0,
    expectedFilterId,
    foundFilterIds: Array.from(foundFilterIds),
    mismatches,
  };
}

/**
 * Error class for filter-related errors
 * 
 * Use this for all filter management errors to make them easily identifiable
 */
export class FilterManagementError extends Error {
  constructor(
    message: string,
    public readonly code: FilterErrorCode,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'FilterManagementError';
  }
}

/**
 * Error codes for filter operations
 */
export enum FilterErrorCode {
  /** Filter ID is invalid or malformed */
  INVALID_FILTER_ID = 'INVALID_FILTER_ID',
  /** Filter does not exist in OpenRAG */
  FILTER_NOT_FOUND = 'FILTER_NOT_FOUND',
  /** Failed to create filter */
  CREATION_FAILED = 'CREATION_FAILED',
  /** Failed to update filter */
  UPDATE_FAILED = 'UPDATE_FAILED',
  /** Race condition detected */
  RACE_CONDITION = 'RACE_CONDITION',
  /** Filter ID mismatch between documents */
  INCONSISTENT_FILTER_IDS = 'INCONSISTENT_FILTER_IDS',
  /** Lock acquisition timeout */
  LOCK_TIMEOUT = 'LOCK_TIMEOUT',
  /** Cache corruption detected */
  CACHE_CORRUPTED = 'CACHE_CORRUPTED',
}

/**
 * Configuration for filter management
 */
export interface FilterManagementConfig {
  /** Cache TTL in milliseconds */
  readonly cacheTTL: number;
  /** Batch update delay in milliseconds */
  readonly batchUpdateDelay: number;
  /** Lock timeout in milliseconds */
  readonly lockTimeout: number;
  /** Filter name to use */
  readonly filterName: string;
}

/**
 * Default filter management configuration
 */
export const DEFAULT_FILTER_CONFIG: FilterManagementConfig = {
  cacheTTL: 60000, // 60 seconds
  batchUpdateDelay: 2000, // 2 seconds
  lockTimeout: 30000, // 30 seconds
  filterName: 'Compare',
} as const;

// Made with Bob
