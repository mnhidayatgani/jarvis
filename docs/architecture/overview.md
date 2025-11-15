# JARVIS Architecture Overview

**Version**: 0.2.0-refactor  
**Last Updated**: November 15, 2025  
**Status**: Post-Refactor Architecture

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture Principles](#architecture-principles)
3. [Component Architecture](#component-architecture)
4. [Design Patterns](#design-patterns)
5. [Data Flow](#data-flow)
6. [Technology Stack](#technology-stack)
7. [Directory Structure](#directory-structure)

---

## System Overview

JARVIS is a dual-component AI memory assistant:

```
┌─────────────────────────────────────────────────────────────┐
│                         User/Developer                       │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                    JARVIS CLI (TypeScript)                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Commands (11): init, remember, recall, status...    │   │
│  │  ↓ Command Pattern (BaseCommand)                     │   │
│  │  ↓ Parse → Validate → Execute                        │   │
│  └──────────────────────────────────────────────────────┘   │
│                     │                                         │
│                     ▼                                         │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  MCP Client (HTTP/JSON-RPC)                          │   │
│  └──────────────────────────────────────────────────────┘   │
└────────────────────┬────────────────────────────────────────┘
                     │ MCP Protocol
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                  JARVIS MCP Server (Python)                  │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  MCP Tools (10): remember_context, recall_context... │   │
│  └──────────────────────────────────────────────────────┘   │
│                     │                                         │
│                     ▼                                         │
│  ┌──────────────────────────────────────────────────────┐   │
│  │           Memory Core (3-Layer Architecture)          │   │
│  │  ┌────────────────────────────────────────────────┐  │   │
│  │  │ L1: Factual Memory (SQLite)                    │  │   │
│  │  │ - Structured facts, metadata                   │  │   │
│  │  │ - SQL queries, exact matching                  │  │   │
│  │  └────────────────────────────────────────────────┘  │   │
│  │  ┌────────────────────────────────────────────────┐  │   │
│  │  │ L2: Semantic Memory (ChromaDB)                 │  │   │
│  │  │ - Vector embeddings, similarity search         │  │   │
│  │  │ - Natural language queries                     │  │   │
│  │  └────────────────────────────────────────────────┘  │   │
│  │  ┌────────────────────────────────────────────────┐  │   │
│  │  │ L3: Snapshot Memory (Filesystem)               │  │   │
│  │  │ - Code diffs, git snapshots                    │  │   │
│  │  │ - Rollback, history tracking                   │  │   │
│  │  └────────────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Key Characteristics

- **Dual Architecture**: CLI (TypeScript) + MCP Server (Python)
- **3-Layer Memory**: Factual (SQL), Semantic (Vector), Snapshot (Files)
- **Pattern-Driven**: Command Pattern (CLI), Template Method (Memory), MCP Protocol
- **Type-Safe**: TypeScript strict mode + Python type hints with mypy
- **Persona-Driven**: JARVIS personality in all user-facing output

---

## Architecture Principles

### 1. Separation of Concerns

**CLI Layer** (Presentation):

- User interaction and output formatting
- Argument parsing and validation
- Error presentation with JARVIS persona

**MCP Server** (Business Logic):

- Memory operations and storage
- Semantic search and embeddings
- Project analysis and scanning

**Benefits**:

- CLI can be replaced without changing memory logic
- MCP server can be used by other clients
- Clear boundaries for testing

### 2. Dependency Injection

**CLI Commands**:

```typescript
class RememberCommand extends BaseCommand {
  constructor(private client: IMCPClient, private formatter: IOutputFormatter) {
    super();
  }
}
```

**Benefits**:

- Easy to mock for testing
- Flexible configuration
- Clear dependencies

### 3. Interface-Driven Design

**TypeScript**:

- `ICommand<TOptions, TResult>`
- `IMCPClient`
- `IOutputFormatter`

**Python**:

- `IMemoryLayer` (Protocol)
- `IStorageBackend` (Protocol)
- `IEmbeddingsProvider` (Protocol)

**Benefits**:

- Contract-based programming
- Easy to swap implementations
- Type-safe across layers

### 4. Fail Fast

**Validation Before Execution**:

```typescript
async run(args: string[]): Promise<TResult> {
  const options = this.parse(args);    // Convert strings
  this.validate(options);              // Throw if invalid
  return await this.execute(options);  // Only if valid
}
```

**Benefits**:

- Early error detection
- Clear error messages
- No partial state changes

### 5. Backward Compatibility

**Constitution 1.1 Compliance**:

- 100% compatible with existing `.jarvis` data structures
- No breaking changes to user-facing APIs
- Preserves JARVIS persona standards

---

## Component Architecture

### CLI Components (TypeScript)

```
jarvis-cli/
├── src/
│   ├── commands/          # Command implementations
│   │   ├── base/          # BaseCommand, interfaces
│   │   ├── init.ts        # Project initialization
│   │   ├── remember.ts    # Store memories
│   │   ├── recall.ts      # Search memories
│   │   └── ...
│   ├── api/               # MCP client
│   │   ├── mcp-client.ts  # HTTP/JSON-RPC client
│   │   └── types.ts       # IMCPClient, MCPResponse
│   ├── core/              # Core utilities
│   │   ├── errors/        # Error hierarchy
│   │   ├── types/         # Shared types
│   │   └── validators/    # Input validation
│   ├── config/            # Configuration
│   │   ├── config.ts      # User config (persona, language)
│   │   └── settings.ts    # Runtime settings
│   └── utils/             # Utilities
│       └── output.ts      # OutputFormatter, IOutputFormatter
```

### MCP Server Components (Python)

```
jarvis-mcp/
├── src/jarvis/
│   ├── mcp/               # MCP protocol layer
│   │   ├── server.py      # MCP server implementation
│   │   └── tools.py       # MCP tool definitions
│   ├── memory/            # 3-layer memory system
│   │   ├── base.py        # BaseMemory (abstract)
│   │   ├── factual.py     # FactualMemory (SQLite)
│   │   ├── semantic.py    # SemanticMemory (ChromaDB)
│   │   ├── snapshot.py    # SnapshotMemory (Filesystem)
│   │   ├── core.py        # MemoryCore (orchestrator)
│   │   └── interfaces.py  # IMemoryLayer, protocols
│   ├── capture/           # Auto-capture system
│   │   ├── scanner.py     # Project analysis
│   │   ├── file_watcher.py# File change detection
│   │   └── git_hooks.py   # Git integration
│   ├── core/              # Core types and validation
│   │   ├── types.py       # MemoryEntry, SearchResult
│   │   └── validators.py  # Pydantic models
│   └── utils/             # Utilities
│       └── embeddings.py  # Embedding generation
```

---

## Design Patterns

### 1. Command Pattern (CLI)

**Purpose**: Encapsulate CLI commands as objects

**Implementation**: See [ADR-001: Command Pattern](./adr-001-command-pattern.md)

**Key Classes**:

- `ICommand<TOptions, TResult>` - Interface
- `BaseCommand` - Abstract base with template method
- `InitCommand`, `RememberCommand`, etc. - Concrete commands

**Benefits**:

- Consistent structure across commands
- Easy to test parse/validate/execute separately
- Clear lifecycle: args → options → result

### 2. Template Method (Memory Layers)

**Purpose**: Define skeleton of algorithm, let subclasses fill in steps

**Implementation**: See [ADR-002: Memory Interfaces](./adr-002-memory-interfaces.md)

**Key Classes**:

- `BaseMemory` - Abstract base with template methods
- `FactualMemory`, `SemanticMemory`, `SnapshotMemory` - Concrete implementations

**Benefits**:

- Shared validation and initialization
- Consistent interface across storage backends
- 85% code reuse for common operations

### 3. Dependency Injection

**Purpose**: Decouple components, improve testability

**CLI Example**:

```typescript
const client = new MCPClient();
const formatter = new OutputFormatter(options);
const command = new RememberCommand(client, formatter);
```

**Benefits**:

- Easy to mock for testing
- Runtime configuration
- Clear component boundaries

### 4. Factory Pattern

**Purpose**: Centralize object creation

**Usage**:

```typescript
class CommandFactory {
  create(name: string): ICommand {
    switch (name) {
      case "remember":
        return new RememberCommand(this.client, this.formatter);
      case "recall":
        return new RecallCommand(this.client, this.formatter);
      // ...
    }
  }
}
```

**Benefits**:

- Single place to wire up dependencies
- Easy to add new commands
- Consistent initialization

### 5. Protocol/Interface Pattern

**TypeScript**: Interfaces for structural typing
**Python**: Protocols for structural typing, ABC for implementation

**Benefits**:

- Contract-based programming
- Duck typing with type safety
- Flexible implementations

---

## Data Flow

### Remember Flow (Store Memory)

```
User: jarvis remember "Using PostgreSQL"
  │
  ├─> CLI: RememberCommand
  │     ├─> parse() → { content: "Using PostgreSQL", type: "decision" }
  │     ├─> validate() → ✓ content not empty
  │     └─> execute()
  │           └─> MCPClient.callTool("remember_context", {...})
  │
  ├─> MCP Server: remember_context tool
  │     └─> MemoryCore.remember(content, type)
  │           ├─> FactualMemory.store(entry)
  │           │     └─> SQLite: INSERT INTO memory_entries
  │           └─> SemanticMemory.store(entry)
  │                 └─> ChromaDB: embeddings + vector storage
  │
  └─> Response: { success: true, id: "uuid-..." }
        └─> CLI: OutputFormatter.success("Stored, Sir.")
```

### Recall Flow (Search Memory)

```
User: jarvis recall "database choice"
  │
  ├─> CLI: RecallCommand
  │     ├─> parse() → { query: "database choice", limit: 10 }
  │     ├─> validate() → ✓ query not empty
  │     └─> execute()
  │           └─> MCPClient.callTool("recall_context", {...})
  │
  ├─> MCP Server: recall_context tool
  │     └─> MemoryCore.recall(query)
  │           ├─> FactualMemory.search(query) → SQL LIKE search
  │           ├─> SemanticMemory.search(query) → Vector similarity
  │           └─> Merge + rank results
  │
  └─> Response: { success: true, results: [...] }
        └─> CLI: OutputFormatter.list([...])
```

---

## Technology Stack

### CLI (TypeScript)

| Component     | Technology        | Purpose                |
| ------------- | ----------------- | ---------------------- |
| Runtime       | Node.js 18+       | JavaScript execution   |
| Language      | TypeScript 5.2+   | Type-safe development  |
| Bundler       | esbuild           | Fast bundling          |
| Testing       | Vitest            | Unit/integration tests |
| Linting       | ESLint + Prettier | Code quality           |
| Type Checking | tsc --noEmit      | Strict type validation |

### MCP Server (Python)

| Component       | Technology              | Purpose                    |
| --------------- | ----------------------- | -------------------------- |
| Runtime         | Python 3.10+            | Async execution            |
| Package Manager | uv                      | Fast dependency management |
| DB (Factual)    | SQLite                  | Structured storage         |
| DB (Semantic)   | ChromaDB                | Vector storage             |
| Embeddings      | sentence-transformers   | Text→vector conversion     |
| Testing         | pytest + pytest-asyncio | Unit/integration/e2e tests |
| Linting         | ruff + black            | Code quality + formatting  |
| Type Checking   | mypy                    | Static type validation     |

### Storage

| Layer       | Technology | Data Type  | Use Case                        |
| ----------- | ---------- | ---------- | ------------------------------- |
| L1 Factual  | SQLite     | Structured | Exact matches, metadata queries |
| L2 Semantic | ChromaDB   | Vectors    | Natural language search         |
| L3 Snapshot | JSON files | Diffs      | Code history, rollback          |

---

## Directory Structure

### Top-Level

```
jarvis/
├── jarvis-cli/              # TypeScript CLI application
│   ├── src/                 # Source code
│   ├── tests/               # Test files
│   ├── dist/                # Built output
│   ├── package.json         # NPM dependencies
│   ├── tsconfig.json        # TypeScript config
│   └── vitest.config.ts     # Test config
│
├── jarvis-mcp/              # Python MCP server
│   ├── src/jarvis/          # Source code
│   ├── tests/               # Test files
│   ├── pyproject.toml       # Python dependencies
│   └── .python-version      # Python version (3.10+)
│
├── specs/                   # Feature specifications
│   └── 002-full-refactor/   # Current refactor spec
│       ├── spec.md          # Requirements
│       ├── plan.md          # Implementation plan
│       ├── tasks.md         # Task breakdown
│       ├── contracts/       # API contracts
│       └── checklists/      # Quality checklists
│
├── docs/                    # Documentation
│   ├── architecture/        # Architecture docs (this file)
│   └── best-practices/      # Coding guidelines
│
└── README.md                # Project overview
```

### CLI Source Structure

```
jarvis-cli/src/
├── commands/                # Command implementations
│   ├── base/
│   │   ├── command.ts       # BaseCommand + ICommand
│   │   └── types.ts         # Option/Result types
│   ├── init.ts              # 11 command files...
│   └── ...
├── api/                     # MCP communication
│   ├── mcp-client.ts        # HTTP client
│   └── types.ts             # Interfaces
├── core/                    # Core functionality
│   ├── errors/              # Error hierarchy
│   │   ├── base.ts          # JarvisError
│   │   ├── cli.ts           # CLI-specific errors
│   │   └── mcp.ts           # MCP-specific errors
│   ├── types/               # Shared types
│   └── validators/          # Input validation
├── config/                  # Configuration
│   ├── config.ts            # UserConfig (persona, language)
│   └── settings.ts          # Runtime settings
├── utils/                   # Utilities
│   └── output.ts            # OutputFormatter
└── index.ts                 # CLI entry point
```

### MCP Source Structure

```
jarvis-mcp/src/jarvis/
├── mcp/                     # MCP protocol
│   ├── server.py            # MCP server
│   └── tools.py             # Tool definitions
├── memory/                  # Memory system
│   ├── base.py              # BaseMemory (ABC)
│   ├── factual.py           # SQLite layer
│   ├── semantic.py          # ChromaDB layer
│   ├── snapshot.py          # Filesystem layer
│   ├── core.py              # MemoryCore orchestrator
│   ├── interfaces.py        # Protocols
│   └── schema.sql           # SQLite schema
├── capture/                 # Auto-capture
│   ├── scanner.py           # Project analysis
│   ├── file_watcher.py      # File monitoring
│   └── git_hooks.py         # Git integration
├── core/                    # Core types
│   ├── types.py             # MemoryEntry, SearchResult
│   └── validators.py        # Pydantic models
└── utils/                   # Utilities
    └── embeddings.py        # Embedding generation
```

---

## Quality Standards

### TypeScript

- ✅ **Strict Mode**: `tsconfig.json` with `strict: true`
- ✅ **Zero Errors**: `npm run typecheck` passes
- ✅ **Test Coverage**: >85% for commands
- ✅ **ESLint**: No warnings
- ✅ **Prettier**: Consistent formatting

### Python

- ✅ **Type Hints**: All public APIs typed
- ✅ **mypy**: Zero errors with `--strict`
- ✅ **Test Coverage**: >85% for memory layers
- ✅ **ruff**: No warnings
- ✅ **black**: Consistent formatting

### Performance

- ✅ CLI init: <100ms
- ✅ Remember operation: <200ms for 1KB
- ✅ Recall search: <500ms for 10K entries
- ✅ Test suite: <30s total

---

## Next Steps

**Phase 3 Complete** ✅:

- Command Pattern implementation
- Memory layer refactoring
- Architecture documentation

**Phase 4** (In Progress):

- Enhanced type safety
- Remove all `any` types
- 100% type coverage

**Phase 5-9** (Planned):

- Performance optimization
- Enhanced testing
- API documentation generation
- Developer guides

---

## References

- [ADR-001: Command Pattern](./adr-001-command-pattern.md)
- [ADR-002: Memory Interfaces](./adr-002-memory-interfaces.md)
- [Refactoring Guide](./refactoring-guide.md) ← Next: Learn how to contribute
- [Full Refactor Spec](../../specs/002-full-refactor/spec.md)
- [Task Breakdown](../../specs/002-full-refactor/tasks.md)

---

**Maintained by**: JARVIS Development Team  
**Last Review**: November 15, 2025  
**Next Review**: December 2025 (post-Phase 4)
