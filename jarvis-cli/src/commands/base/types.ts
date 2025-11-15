/**
 * Type definitions for CLI commands
 * 
 * All command option types should extend BaseCommandOptions for consistency.
 */

/**
 * Base command options shared across all commands
 */
export interface BaseCommandOptions {
  /** Output in JSON format instead of human-readable */
  json?: boolean;

  /** Verbose output with additional details */
  verbose?: boolean;

  /** Suppress non-essential output */
  quiet?: boolean;
}

// Status Command Types
export interface StatusOptions extends BaseCommandOptions {
  // No additional options beyond base
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
export interface ConfigOptions extends BaseCommandOptions {
  /** Config key (for get/set actions) */
  key?: string;

  /** Config value (for set action) */
  value?: string;

  /** List all configuration values */
  list?: boolean;

  /** Unset/reset configuration */
  unset?: boolean;
}

export interface ConfigResult {
  success: boolean;
  key?: string;
  value?: unknown;
  all?: Record<string, unknown>;
}

// Scan Command Types
export interface ScanOptions extends BaseCommandOptions {
  /** Interactive mode for guided analysis */
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
export interface RememberOptions extends BaseCommandOptions {
  /** Content to remember (1-10,000 characters) */
  content?: string;

  /** Memory type: decision, note, or context */
  type?: "decision" | "note" | "context";

  /** Tags for categorization (max 10) */
  tags?: string[];

  /** Associated file path */
  file?: string;
}

export interface RememberResult {
  success: boolean;
  memory_id: string;
  type: string;
  timestamp?: string;
  error?: string;
}

// Recall Command Types
export interface RecallOptions extends BaseCommandOptions {
  /** Search query */
  query?: string;

  /** Filter by memory type */
  type?: "decision" | "note" | "context";

  /** Filter by file path */
  file?: string;

  /** Only show memories after this date (ISO 8601) */
  since?: string;

  /** Maximum results to return (1-100) */
  limit?: number;

  /** For drill-down by specific memory ID */
  id?: string;
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
export interface InitOptions extends BaseCommandOptions {
  /** Force re-initialization even if already initialized */
  force?: boolean;
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
export interface DoctorOptions extends BaseCommandOptions {
  // No additional options beyond base
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

// Checkpoint Command Types
export interface CheckpointOptions extends BaseCommandOptions {
  /** Reason for creating checkpoint */
  reason?: string;

  /** List existing checkpoints instead */
  list?: boolean;

  /** Preview specific checkpoint by ID */
  preview?: string;

  /** Run validation after creating checkpoint */
  validate?: boolean;
}

export interface CheckpointInfo {
  id: string;
  reason: string;
  timestamp: string;
  filesAffected: string[];
}

export interface CheckpointResult {
  success: boolean;
  checkpoint?: CheckpointInfo;
  checkpoints?: CheckpointInfo[];
  error?: string;
}

// Rollback Command Types
export interface RollbackOptions extends BaseCommandOptions {
  /** Specific checkpoint ID to restore (defaults to latest) */
  checkpointId?: string;

  /** Keep checkpoint after restoring */
  keep?: boolean;
}

export interface RollbackResult {
  success: boolean;
  checkpointId: string;
  filesRestored: string[];
  checkpointKept: boolean;
  error?: string;
}

// Validate Command Types
export interface ValidateOptions extends BaseCommandOptions {
  // No additional options beyond base
}

export interface ValidationCheck {
  tool: string;
  status: "pass" | "fail";
  duration: number;
  output?: string;
  error?: string;
}

export interface ValidateResult {
  success: boolean;
  overall_passed: boolean;
  checks: ValidationCheck[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    duration: number;
  };
  error?: string;
}

// Cleanup Command Types
export interface CleanupOptions extends BaseCommandOptions {
  /** What to clean: memory, checkpoints, or all */
  target?: "memory" | "checkpoints" | "all";

  /** Show what would be cleaned without actually doing it */
  dryRun?: boolean;

  /** Age threshold in days */
  olderThan?: number;

  /** Actually perform cleanup (safety flag) */
  force?: boolean;
}

export interface CleanupItem {
  type: string;
  id: string;
  age: number;
  size?: number;
}

export interface CleanupResult {
  success: boolean;
  items: CleanupItem[];
  dryRun: boolean;
  totalCleaned: number;
  spaceFreed: number;
  error?: string;
}
