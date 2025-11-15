/**
 * Type definitions for CLI commands
 */

// Status Command Types
export interface StatusOptions {
  verbose?: boolean;
  json?: boolean;
}

export interface DatabaseStatus {
  sqlite: boolean;
  sqliteSize: string;
  chroma: boolean;
}

export interface ConfigStatus {
  exists: boolean;
  settings: {
    persona?: string;
    language?: string;
    [key: string]: unknown;
  } | null;
}

export interface ProjectInfo {
  name: string | null;
  techStack: string[];
}

export interface MemoryStats {
  total_entries: number;
  decisions?: number;
  notes?: number;
  last_activity?: string;
  disk_usage_mb?: number;
  collections?: Record<string, number>;
}

export interface StatusResult {
  initialized: boolean;
  directory: string;
  databases: DatabaseStatus;
  config: ConfigStatus;
  project: ProjectInfo;
  memory: MemoryStats | null;
}

// Config Command Types
export interface ConfigOptions {
  key?: string;
  value?: string;
  list?: boolean;
  unset?: boolean;
}

export interface ConfigResult {
  success: boolean;
  key?: string;
  value?: unknown;
  all?: Record<string, unknown>;
}
