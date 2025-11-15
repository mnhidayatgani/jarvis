/**
 * Memory system type definitions for JARVIS CLI
 * 
 * Defines types for memory entries, search results, and memory operations.
 */

/**
 * Memory entry representing a stored piece of information.
 * 
 * Entries can be decisions, notes, or contextual information that can be
 * recalled later using semantic search.
 * 
 * @example
 * ```typescript
 * const entry: MemoryEntry = {
 *   id: "mem-abc123",
 *   content: "Using PostgreSQL for better ACID guarantees",
 *   type: "decision",
 *   tags: ["database", "architecture"],
 *   file_path: "src/db/config.ts",
 *   created_at: new Date("2025-11-15T10:30:00Z"),
 *   updated_at: new Date("2025-11-15T10:30:00Z"),
 *   metadata: {
 *     author: "developer",
 *     priority: "high"
 *   }
 * };
 * ```
 */
export interface MemoryEntry {
  /** Unique identifier for the memory entry (UUID format) */
  id: string;

  /** Content text (1-10,000 characters) */
  content: string;

  /** Type of memory: decision, note, or context */
  type: "decision" | "note" | "context";

  /** Tags for categorization (max 10 tags) */
  tags: string[];

  /** Optional file path associated with this memory */
  file_path?: string;

  /** ISO 8601 timestamp when entry was created */
  created_at: Date | string;

  /** ISO 8601 timestamp when entry was last updated */
  updated_at: Date | string;

  /** Additional metadata as key-value pairs */
  metadata: Record<string, unknown>;
}

/**
 * Search result with relevance scoring.
 * 
 * Returned from memory search operations with similarity scores
 * to help rank results by relevance.
 * 
 * @example
 * ```typescript
 * const result: SearchResult = {
 *   entry: {
 *     id: "mem-abc123",
 *     content: "Using PostgreSQL for ACID guarantees",
 *     type: "decision",
 *     tags: ["database"],
 *     created_at: "2025-11-15T10:30:00Z",
 *     updated_at: "2025-11-15T10:30:00Z",
 *     metadata: {}
 *   },
 *   score: 0.95,
 *   highlights: ["PostgreSQL", "ACID"]
 * };
 * ```
 */
export interface SearchResult {
  /** The memory entry that matched the search */
  entry: MemoryEntry;

  /** Relevance score from 0.0 (no match) to 1.0 (perfect match) */
  score: number;

  /** Highlighted text fragments that matched the query */
  highlights: string[];
}

/**
 * Memory search filters for narrowing results.
 * 
 * @example
 * ```typescript
 * const filters: MemorySearchFilters = {
 *   type: "decision",
 *   file_path: "src/db/**",
 *   tags: ["database", "architecture"],
 *   created_after: "2025-11-01T00:00:00Z",
 *   created_before: "2025-11-15T23:59:59Z"
 * };
 * ```
 */
export interface MemorySearchFilters {
  /** Filter by memory type */
  type?: "decision" | "note" | "context";

  /** Filter by file path (supports glob patterns) */
  file_path?: string;

  /** Filter entries that have ALL specified tags */
  tags?: string[];

  /** Only include entries created after this date (ISO 8601) */
  created_after?: string;

  /** Only include entries created before this date (ISO 8601) */
  created_before?: string;

  /** Filter by project ID */
  project_id?: string;
}

/**
 * Memory statistics aggregated across all layers.
 * 
 * @example
 * ```typescript
 * const stats: MemoryStatistics = {
 *   total_entries: 1250,
 *   by_type: {
 *     decision: 450,
 *     note: 600,
 *     context: 200
 *   },
 *   by_layer: {
 *     factual: 800,
 *     semantic: 1200,
 *     snapshot: 50
 *   },
 *   recent_activity: {
 *     last_7_days: 45,
 *     last_30_days: 180
 *   },
 *   disk_usage_mb: 12.5
 * };
 * ```
 */
export interface MemoryStatistics {
  /** Total number of memory entries across all layers */
  total_entries: number;

  /** Count of entries by type */
  by_type: Record<"decision" | "note" | "context", number>;

  /** Count of entries by memory layer (L1=factual, L2=semantic, L3=snapshot) */
  by_layer: {
    factual: number;
    semantic: number;
    snapshot: number;
  };

  /** Recent activity statistics */
  recent_activity: {
    /** Entries created in last 7 days */
    last_7_days: number;

    /** Entries created in last 30 days */
    last_30_days: number;
  };

  /** Total disk usage in megabytes */
  disk_usage_mb: number;
}

