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

// Scan Command Types
export interface ScanOptions {
  verbose?: boolean;
  quiet?: boolean;
  json?: boolean;
  interactive?: boolean;
}

export interface CodebaseAnalysis {
  tech_stack?: string[];
  dependencies?: Record<string, string[] | Record<string, string>>;
  file_count?: number;
  directory_count?: number;
  inconsistencies?: Array<{
    type: string;
    description: string;
    examples?: string[];
  }>;
  questions?: string[];
  suggestions?: string[];
}

export interface ScanResult {
  success: boolean;
  data?: CodebaseAnalysis;
  report?: string;
  error?: string;
}

// Remember Command Types
export interface RememberOptions {
  content?: string;
  type?: string;
  tags?: string[];
  file?: string;
  verbose?: boolean;
  quiet?: boolean;
  json?: boolean;
}

export interface RememberResult {
  success: boolean;
  memory_id: string;
  type: string;
  timestamp?: string;
  error?: string;
}

// Recall Command Types
export interface RecallOptions {
  query?: string;
  type?: string;
  file?: string;
  since?: string;
  limit?: number;
  verbose?: boolean;
  quiet?: boolean;
  json?: boolean;
  id?: string; // For drill-down by specific memory ID
}

export interface MemoryItem {
  id: string;
  content: string;
  type?: string;
  timestamp?: string;
  file_path?: string;
  tags?: string[];
  relevance_score?: number;
  metadata?: Record<string, unknown>;
}

export interface RecallResult {
  success: boolean;
  results?: MemoryItem[];
  total?: number;
  query?: string;
  memory?: MemoryItem; // For single memory retrieval
  error?: string;
}

// Init Command Types
export interface InitOptions {
  force?: boolean;
  verbose?: boolean;
  quiet?: boolean;
}

export interface InitResult {
  success: boolean;
  projectRoot: string;
  projectName: string;
  projectId: string;
  isGitRepo: boolean;
  hooksInstalled: boolean;
}

// Doctor Command Types
export interface DoctorOptions {
  verbose?: boolean;
  json?: boolean;
  quiet?: boolean;
}

export interface HealthCheckItem {
  name: string;
  status: "pass" | "fail" | "warn";
  message: string;
  details?: unknown;
}

export interface DoctorResult {
  success: boolean;
  overall: "healthy" | "degraded" | "critical";
  passed: number;
  failed: number;
  warnings: number;
  checks: HealthCheckItem[];
}
