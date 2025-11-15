# CLI Command Contracts

**Purpose**: Define TypeScript interfaces for all CLI commands  
**Date**: November 15, 2025

## Base Command Interface

```typescript
/**
 * Base interface for all CLI commands.
 * Implements Template Method pattern for consistent command execution.
 */
interface ICommand<TOptions, TResult> {
  /**
   * Parse command-line arguments into typed options.
   * @param args - Raw command-line arguments
   * @returns Parsed and typed options object
   * @throws {ValidationError} If arguments cannot be parsed
   */
  parse(args: string[]): TOptions;

  /**
   * Validate parsed options before execution.
   * @param options - Parsed options to validate
   * @throws {ValidationError} If options are invalid
   */
  validate(options: TOptions): void;

  /**
   * Execute the command with validated options.
   * @param options - Validated options
   * @returns Promise resolving to command result
   * @throws {JarvisError} If execution fails
   */
  execute(options: TOptions): Promise<TResult>;

  /**
   * Run the complete command flow: parse → validate → execute.
   * @param args - Raw command-line arguments
   * @returns Promise resolving to command result
   */
  run(args: string[]): Promise<TResult>;
}
```

## Common Types

```typescript
/**
 * Common command options shared across commands
 */
interface BaseCommandOptions {
  /** Output in JSON format instead of human-readable */
  json?: boolean;

  /** Verbose output with additional details */
  verbose?: boolean;

  /** Suppress non-essential output */
  quiet?: boolean;
}

/**
 * Result wrapper for command execution
 */
interface CommandResult<T = unknown> {
  /** Execution success status */
  success: boolean;

  /** Result data if successful */
  data?: T;

  /** Error information if failed */
  error?: {
    code: string;
    message: string;
    context?: Record<string, unknown>;
  };

  /** Human-readable message */
  message?: string;
}
```

## Init Command

```typescript
interface InitOptions extends BaseCommandOptions {
  /** Force re-initialization even if already initialized */
  force?: boolean;
}

interface InitResult {
  /** Absolute path to created .jarvis directory */
  jarvisDir: string;

  /** Whether this was a fresh init or re-initialization */
  isReinit: boolean;

  /** Whether git hooks were installed */
  gitHooksInstalled: boolean;

  /** Project name detected */
  projectName: string;
}

interface IInitCommand extends ICommand<InitOptions, InitResult> {
  /**
   * Initialize JARVIS in current project.
   * Creates .jarvis directory, config file, and installs git hooks.
   */
}
```

## Remember Command

```typescript
interface RememberOptions extends BaseCommandOptions {
  /** Content to remember (1-10,000 characters) */
  content: string;

  /** Memory type: decision, note, or context */
  type?: "decision" | "note" | "context";

  /** Tags for categorization (max 10) */
  tags?: string[];

  /** Associated file path */
  file?: string;
}

interface RememberResult {
  /** Generated memory entry ID */
  id: string;

  /** Type of memory stored */
  type: string;

  /** Timestamp of storage */
  timestamp: string;
}

interface IRememberCommand extends ICommand<RememberOptions, RememberResult> {
  /**
   * Store information to memory.
   */
}
```

## Recall Command

```typescript
interface RecallOptions extends BaseCommandOptions {
  /** Search query */
  query: string;

  /** Maximum results to return (1-100) */
  limit?: number;

  /** Filter by memory type */
  type?: "decision" | "note" | "context";

  /** Filter by file path */
  file?: string;

  /** Only show memories after this date (ISO 8601) */
  after?: string;
}

interface RecallResult {
  /** Matching memory entries */
  results: Array<{
    id: string;
    content: string;
    type: string;
    tags: string[];
    file_path?: string;
    created_at: string;
    relevance_score?: number;
  }>;

  /** Total number of matches */
  total: number;

  /** Search query used */
  query: string;
}

interface IRecallCommand extends ICommand<RecallOptions, RecallResult> {
  /**
   * Search and retrieve memories.
   */
}
```

## Scan Command

```typescript
interface ScanOptions extends BaseCommandOptions {
  /** Save scan results to memory */
  save?: boolean;
}

interface ScanResult {
  /** Detected technologies and versions */
  techStack: string[];

  /** Package dependencies by ecosystem */
  dependencies: Record<string, Record<string, string>>;

  /** File and directory statistics */
  structure: {
    totalFiles: number;
    totalDirectories: number;
    keyDirectories: string[];
  };

  /** Detected architecture pattern */
  architecture?: string;

  /** Detected coding conventions */
  conventions?: Record<string, unknown>;
}

interface IScanCommand extends ICommand<ScanOptions, ScanResult> {
  /**
   * Analyze project structure and tech stack.
   */
}
```

## Status Command

```typescript
interface StatusOptions extends BaseCommandOptions {
  // No additional options beyond base
}

interface StatusResult {
  /** Project information */
  project: {
    name: string;
    path: string;
    initialized: boolean;
  };

  /** Database health */
  databases: {
    sqlite: { healthy: boolean; size: number };
    chromadb: { healthy: boolean };
  };

  /** Memory statistics */
  memory: {
    totalEntries: number;
    byType: Record<string, number>;
  };

  /** System health status */
  health: "healthy" | "degraded" | "error";
}

interface IStatusCommand extends ICommand<StatusOptions, StatusResult> {
  /**
   * Display system status and statistics.
   */
}
```

## Doctor Command

```typescript
interface DoctorOptions extends BaseCommandOptions {
  // No additional options beyond base
}

interface DoctorResult {
  /** Individual check results */
  checks: Array<{
    name: string;
    status: "pass" | "warn" | "fail";
    message: string;
    details?: string;
  }>;

  /** Overall health status */
  overall: "healthy" | "warnings" | "errors";

  /** Summary counts */
  summary: {
    passed: number;
    warnings: number;
    failed: number;
  };
}

interface IDoctorCommand extends ICommand<DoctorOptions, DoctorResult> {
  /**
   * Run comprehensive system diagnostics.
   */
}
```

## Checkpoint Command

```typescript
interface CheckpointOptions extends BaseCommandOptions {
  /** Reason for creating checkpoint */
  reason?: string;

  /** List existing checkpoints instead */
  list?: boolean;

  /** Preview specific checkpoint by ID */
  preview?: string;

  /** Run validation after creating checkpoint */
  validate?: boolean;
}

interface CheckpointResult {
  /** Checkpoint ID (git stash reference) */
  id: string;

  /** Reason provided */
  reason: string;

  /** Files included in checkpoint */
  filesAffected: string[];

  /** Timestamp of creation */
  timestamp: string;
}

interface CheckpointListResult {
  /** Available checkpoints */
  checkpoints: Array<{
    id: string;
    reason: string;
    timestamp: string;
  }>;
}

interface ICheckpointCommand
  extends ICommand<CheckpointOptions, CheckpointResult | CheckpointListResult> {
  /**
   * Create safety checkpoint before risky changes.
   */
}
```

## Rollback Command

```typescript
interface RollbackOptions extends BaseCommandOptions {
  /** Specific checkpoint ID to restore (defaults to latest) */
  checkpointId?: string;

  /** Keep checkpoint after restoring */
  keep?: boolean;
}

interface RollbackResult {
  /** Restored checkpoint ID */
  checkpointId: string;

  /** Files restored */
  filesRestored: string[];

  /** Whether checkpoint was kept or removed */
  checkpointKept: boolean;
}

interface IRollbackCommand extends ICommand<RollbackOptions, RollbackResult> {
  /**
   * Restore previous checkpoint.
   */
}
```

## Validate Command

```typescript
interface ValidateOptions extends BaseCommandOptions {
  // No additional options beyond base
}

interface ValidateResult {
  /** Individual validation results */
  checks: Array<{
    tool: string;
    status: "pass" | "fail";
    duration: number;
    output?: string;
  }>;

  /** Overall validation status */
  passed: boolean;

  /** Summary statistics */
  summary: {
    total: number;
    passed: number;
    failed: number;
    duration: number;
  };
}

interface IValidateCommand extends ICommand<ValidateOptions, ValidateResult> {
  /**
   * Run code quality checks and tests.
   */
}
```

## Cleanup Command

```typescript
interface CleanupOptions extends BaseCommandOptions {
  /** What to clean: memory, checkpoints, or all */
  target: "memory" | "checkpoints" | "all";

  /** Show what would be cleaned without actually doing it */
  dryRun?: boolean;

  /** Age threshold in days */
  olderThan?: number;

  /** Actually perform cleanup (safety flag) */
  force?: boolean;
}

interface CleanupResult {
  /** Items that would be/were cleaned */
  items: Array<{
    type: string;
    id: string;
    age: number;
    size?: number;
  }>;

  /** Whether this was a dry run */
  dryRun: boolean;

  /** Total items cleaned */
  totalCleaned: number;

  /** Space freed in bytes */
  spaceFreed: number;
}

interface ICleanupCommand extends ICommand<CleanupOptions, CleanupResult> {
  /**
   * Clean up old data and checkpoints.
   */
}
```

## Config Command

```typescript
interface ConfigOptions extends BaseCommandOptions {
  /** Subcommand: list, get, set, or reset */
  action: "list" | "get" | "set" | "reset";

  /** Config key (for get/set actions) */
  key?: string;

  /** Config value (for set action) */
  value?: string;
}

interface ConfigResult {
  /** Current configuration */
  config?: Record<string, unknown>;

  /** Single config value (for get action) */
  value?: unknown;

  /** Action performed */
  action: string;
}

interface IConfigCommand extends ICommand<ConfigOptions, ConfigResult> {
  /**
   * Manage JARVIS configuration.
   */
}
```

## Factory Pattern

```typescript
/**
 * Factory for creating command instances with dependencies
 */
interface ICommandFactory {
  /**
   * Create command instance by name
   * @param name - Command name
   * @returns Command instance with injected dependencies
   */
  create(name: string): ICommand<unknown, unknown>;

  /**
   * Get list of available commands
   */
  listCommands(): string[];
}
```

## Usage Example

```typescript
// Create factory with dependencies
const factory = new CommandFactory(mcpClient, formatter, config);

// Create and run command
const remember = factory.create("remember");
const result = await remember.run(["Using PostgreSQL"]);

// Type-safe result handling
if (result.success) {
  console.log(`Stored with ID: ${result.data.id}`);
} else {
  console.error(`Error: ${result.error?.message}`);
}
```
