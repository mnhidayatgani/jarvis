/**
 * Core type definitions for JARVIS CLI
 * 
 * Central export point for all core type definitions.
 * 
 * @example
 * ```typescript
 * import type { MemoryEntry, SearchResult, ProjectConfig } from "@/core/types";
 * 
 * const entry: MemoryEntry = {
 *   id: "mem-123",
 *   content: "Example memory",
 *   type: "note",
 *   tags: [],
 *   created_at: new Date(),
 *   updated_at: new Date(),
 *   metadata: {}
 * };
 * ```
 */

export type {
  GlobalConfig,
  ProjectConfig,
  ConfigLayer,
  MergedConfig,
} from "./config";

export type {
  MemoryEntry,
  SearchResult,
  MemorySearchFilters,
  MemoryStatistics,
} from "./memory";

