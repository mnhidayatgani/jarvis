# Data Model: Refactored Architecture

**Phase**: 1 (Design & Contracts)  
**Date**: November 15, 2025  
**Purpose**: Define refactored architecture entities, interfaces, and relationships

## Architecture Overview

The refactored JARVIS codebase follows a **layered architecture** with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────┐
│                     CLI Layer (TypeScript)                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Commands   │  │  Formatters  │  │    Config    │     │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘     │
│         │                  │                  │             │
│         └──────────────────┼──────────────────┘             │
│                            │                                │
└────────────────────────────┼────────────────────────────────┘
                             │ MCP Protocol
┌────────────────────────────┼────────────────────────────────┐
│                            │                                │
│         ┌──────────────────┴──────────────┐                │
│         │        MCP Server Layer          │                │
│         │         (Python)                 │                │
│         └──────────────┬───────────────────┘                │
│                        │                                    │
│  ┌─────────────────────┼──────────────────────────────┐    │
│  │              Business Logic                         │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────┐    │    │
│  │  │  Memory  │  │ Capture  │  │   Spec Kit   │    │    │
│  │  │  Layers  │  │  Logic   │  │  Integration │    │    │
│  │  └────┬─────┘  └────┬─────┘  └──────┬───────┘    │    │
│  └───────┼─────────────┼────────────────┼────────────┘    │
│          │             │                │                  │
│  ┌───────┼─────────────┼────────────────┼────────────┐    │
│  │       │    Infrastructure Layer       │            │    │
│  │  ┌────┴──────┐  ┌──┴────────┐  ┌────┴──────┐    │    │
│  │  │  Storage  │  │    Git    │  │   Config  │    │    │
│  │  │  (SQLite, │  │   Hooks   │  │   Files   │    │    │
│  │  │  ChromaDB)│  │           │  │           │    │    │
│  │  └───────────┘  └───────────┘  └───────────┘    │    │
│  └──────────────────────────────────────────────────┘    │
│                     MCP Layer (Python)                    │
└───────────────────────────────────────────────────────────┘
```

## Core Entities

### 1. Command (TypeScript)

**Purpose**: Represents a CLI command following the Command pattern

**Interface**:

```typescript
interface ICommand<TOptions, TResult> {
  parse(args: string[]): TOptions;
  validate(options: TOptions): void;
  execute(options: TOptions): Promise<TResult>;
  run(args: string[]): Promise<TResult>;
}
```

**Implementations**:

- `InitCommand` - Initialize JARVIS in project
- `RememberCommand` - Store memory entry
- `RecallCommand` - Search and retrieve memories
- `ScanCommand` - Analyze project structure
- `StatusCommand` - Show system status
- `DoctorCommand` - Run diagnostics
- `CheckpointCommand` - Create safety checkpoint
- `RollbackCommand` - Restore checkpoint
- `ValidateCommand` - Run validation checks
- `CleanupCommand` - Clean old data

**Relationships**:

- Depends on `IMCPClient` for server communication
- Depends on `IOutputFormatter` for user feedback
- Uses `IConfigManager` for settings

**Validation Rules**:

- All options must pass validation before execution
- Arguments must be parsed according to command-specific rules
- Errors must be instances of `JarvisError` hierarchy

---

### 2. MCPClient (TypeScript)

**Purpose**: Client for communicating with MCP server

**Interface**:

```typescript
interface IMCPClient {
  callTool(name: string, args: unknown): Promise<MCPResponse>;
  healthCheck(): Promise<boolean>;
  getStats(): Promise<ServerStats>;
}

interface MCPResponse {
  success: boolean;
  data?: unknown;
  error?: ErrorResponse;
  message?: string;
}
```

**Responsibilities**:

- Serialize requests to MCP server
- Deserialize responses from MCP server
- Handle network errors and retries
- Validate response schemas

**Relationships**:

- Used by all command implementations
- Communicates with `MCPServer` via HTTP/stdio

---

### 3. OutputFormatter (TypeScript)

**Purpose**: Format and display messages to user

**Interface**:

```typescript
interface IOutputFormatter {
  success(message: string): void;
  error(message: string, error?: Error): void;
  warning(message: string): void;
  info(message: string, loud?: boolean): void;
  progress(message: string): void;
  table(data: unknown[][]): void;
  json(data: unknown): void;
}
```

**Features**:

- JARVIS persona formatting ("Sir")
- Colored output for terminal
- JSON output mode for scripts
- Quiet/verbose modes

---

### 4. MemoryLayer (Python)

**Purpose**: Abstract interface for memory storage layers

**Protocol**:

```python
class IMemoryLayer(Protocol):
    def initialize(self, project_path: Path) -> None: ...
    def store(self, entry: MemoryEntry) -> str: ...
    def search(self, query: str, limit: int) -> list[MemoryEntry]: ...
    def get_by_id(self, entry_id: str) -> MemoryEntry | None: ...
    def delete(self, entry_id: str) -> bool: ...
```

**Implementations**:

- `FactualMemory` - SQLite-based factual storage
- `SemanticMemory` - ChromaDB-based semantic search
- `SnapshotMemory` - Filesystem-based snapshot storage

**Relationships**:

- All implement `IMemoryLayer` protocol
- Composed by `MemoryCore` for orchestration
- Use `IStorageBackend` for persistence

---

### 5. MCPTools (Python)

**Purpose**: MCP tool implementations (adapters)

**Responsibilities**:

- Adapt MCP tool calls to business logic
- Validate input parameters
- Format responses according to MCP protocol
- Handle errors and return structured responses

**Tools Provided**:

- `remember_context` - Store memory
- `recall_context` - Search memories
- `analyze_codebase` - Scan project
- `create_checkpoint` - Create checkpoint
- `rollback` - Restore checkpoint
- `validate_changes` - Pre-change validation
- `get_architecture` - Retrieve structure
- `install_git_hooks` - Set up auto-capture

**Relationships**:

- Uses `MemoryCore` for memory operations
- Uses `Scanner` for codebase analysis
- Used by `MCPServer` to handle requests

---

### 6. ErrorType (TypeScript & Python)

**Purpose**: Structured error with code and context

**TypeScript Interface**:

```typescript
abstract class JarvisError extends Error {
  readonly code: string;
  readonly context: Record<string, unknown>;

  toJSON(): ErrorResponse;
}

class ValidationError extends JarvisError {}
class MCPConnectionError extends JarvisError {}
class FileSystemError extends JarvisError {}
class DatabaseError extends JarvisError {}
```

**Python Interface**:

```python
class JarvisError(Exception):
    code: str
    context: dict[str, Any]

    def to_dict(self) -> dict[str, Any]: ...

class ValidationError(JarvisError): ...
class DatabaseError(JarvisError): ...
class MCPToolError(JarvisError): ...
```

**Error Codes**:

- `VALIDATION_ERROR` - Input validation failure
- `MCP_CONNECTION_ERROR` - Cannot reach MCP server
- `FILESYSTEM_ERROR` - File operation failure
- `DATABASE_ERROR` - Database operation failure
- `MCP_TOOL_ERROR` - Tool execution failure
- `INTERNAL_ERROR` - Unexpected error

---

### 7. Configuration (TypeScript & Python)

**Purpose**: System and project configuration

**TypeScript Schema**:

```typescript
interface GlobalConfig {
  language: "en";
  responseStyle: "concise" | "verbose";
  persona: "jarvis";
}

interface ProjectConfig extends GlobalConfig {
  autoCapture: boolean;
  checkpointBeforeRisky: boolean;
  initialized_at: string;
}
```

**Python Schema**:

```python
class ProjectConfig(BaseModel):
    language: Literal["en"] = "en"
    response_style: Literal["concise", "verbose"] = "concise"
    persona: Literal["jarvis"] = "jarvis"
    auto_capture: bool = True
    checkpoint_before_risky: bool = True
```

**Configuration Layers**:

1. Defaults (hardcoded in code)
2. Global (`~/.jarvis/config.json`)
3. Project (`.jarvis/config.json`)

---

## Entity Relationships

```
┌──────────────────┐
│    Commands      │
│  (TypeScript)    │
└────────┬─────────┘
         │ depends on
         ├────────────────┐
         │                │
    ┌────▼──────┐    ┌────▼──────────┐
    │ MCPClient │    │ Output        │
    │           │    │ Formatter     │
    └────┬──────┘    └────▲──────────┘
         │ calls          │ uses
         │                │
┌────────▼────────────────┴─────────┐
│         MCP Protocol              │
└────────┬──────────────────────────┘
         │
    ┌────▼──────┐
    │ MCPServer │
    │ (Python)  │
    └────┬──────┘
         │ uses
         ├──────────────────┬──────────────┐
         │                  │              │
    ┌────▼──────┐    ┌──────▼─────┐  ┌────▼────┐
    │  MCP      │    │   Memory   │  │ Capture │
    │  Tools    │    │   Core     │  │ Logic   │
    └────┬──────┘    └────┬───────┘  └────┬────┘
         │                │               │
         │ uses           │ orchestrates  │ uses
         │                │               │
         │         ┌──────▼──────┐        │
         │         │   Memory    │        │
         │         │   Layers    │        │
         │         └──────┬──────┘        │
         │                │               │
         │         ┌──────▼──────────┐    │
         │         │ Storage         │    │
         └─────────►  Backends       │◄───┘
                   │ (SQLite,        │
                   │  ChromaDB,      │
                   │  Filesystem)    │
                   └─────────────────┘
```

## Data Flow Examples

### Example 1: Remember Command

```
1. User: `jarvis remember "Using PostgreSQL"`
   ↓
2. CLI: RememberCommand.run(["Using PostgreSQL"])
   ↓
3. CLI: parse() → { content: "Using PostgreSQL", type: "decision" }
   ↓
4. CLI: validate() → ✓ content not empty
   ↓
5. CLI: execute() → mcpClient.callTool("remember_context", {...})
   ↓
6. MCP: MCPServer.handle_tool_call("remember_context", {...})
   ↓
7. MCP: MCPTools.remember_context({...})
   ↓
8. MCP: memoryCore.store(MemoryEntry(...))
   ↓
9. MCP: factualMemory.store() + semanticMemory.store()
   ↓
10. MCP: Return { success: true, data: { id: "mem-123" } }
    ↓
11. CLI: formatter.success("Remembered, Sir.")
```

### Example 2: Recall Command

```
1. User: `jarvis recall "database"`
   ↓
2. CLI: RecallCommand.run(["database"])
   ↓
3. CLI: mcpClient.callTool("recall_context", { query: "database" })
   ↓
4. MCP: MCPTools.recall_context({ query: "database" })
   ↓
5. MCP: memoryCore.search("database")
   ↓
6. MCP: semanticMemory.search() (vector similarity)
   ↓
7. MCP: factualMemory.search() (keyword match)
   ↓
8. MCP: Merge and rank results
   ↓
9. MCP: Return { success: true, data: { results: [...] } }
   ↓
10. CLI: formatter.table(results)
```

## Interface Contracts

See `contracts/` directory for detailed interface definitions:

- `cli-commands.md` - CLI command interfaces
- `mcp-tools.md` - MCP tool interfaces (unchanged from spec 001)
- `memory-interfaces.md` - Memory layer interfaces
- `error-types.md` - Error hierarchy definitions

## Validation Summary

**TypeScript Validation**:

- All `any` types replaced with explicit types or `unknown`
- Runtime validation at CLI boundaries (user input)
- Type guards for narrowing `unknown` to specific types
- Pydantic schemas for MCP response validation

**Python Validation**:

- All functions have complete type hints
- Pydantic models for configuration and data schemas
- Custom validators for business logic
- Protocol types for interface contracts

**Testing Validation**:

- Unit tests for all entities in isolation
- Integration tests for entity interactions
- Contract tests for MCP protocol compliance
- E2E tests for full workflows
