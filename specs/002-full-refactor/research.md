# Research: Full Codebase Refactor Best Practices

**Phase**: 0 (Research & Analysis)  
**Date**: November 15, 2025  
**Purpose**: Document best practices for TypeScript and Python refactoring

## TypeScript Best Practices

### 1. Strict Type System Configuration

**Decision**: Enable all strict mode options in tsconfig.json

**Rationale**:

- Catches type errors at compile time, not runtime
- Prevents null/undefined bugs (80% of production bugs in JavaScript)
- Enforces explicit typing, improving code documentation
- Makes refactoring safer with compiler verification

**Configuration**:

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

**Alternatives Considered**:

- Gradual strict mode adoption → Rejected: Half-strict is worse than none (false confidence)
- Using `any` escape hatches → Rejected: Defeats purpose of TypeScript

**Implementation Guidance**:

1. Enable all flags at once
2. Fix errors systematically by module
3. Use `unknown` instead of `any` for truly dynamic types
4. Use type guards for runtime validation at boundaries

---

### 2. Command Pattern for CLI

**Decision**: Implement abstract Command base class with Template Method pattern

**Rationale**:

- Consistent structure across all commands (parse → validate → execute)
- Easy to test (mock validation, test execution independently)
- Clear extension points for new commands
- Enforces error handling and logging

**Pattern Structure**:

```typescript
abstract class BaseCommand<TOptions, TResult> {
  abstract parse(args: string[]): TOptions;
  abstract validate(options: TOptions): void;
  abstract execute(options: TOptions): Promise<TResult>;

  async run(args: string[]): Promise<TResult> {
    try {
      const options = this.parse(args);
      this.validate(options);
      return await this.execute(options);
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }

  protected handleError(error: unknown): void {
    // Centralized error logging and formatting
  }
}
```

**Alternatives Considered**:

- Functional approach with higher-order functions → Rejected: Less discoverable for OOP-familiar devs
- Individual command files without pattern → Rejected: Inconsistency leads to maintenance burden

**Implementation Guidance**:

1. Create `src/commands/base/command.ts` with abstract class
2. Define generic types for options and results
3. Refactor existing commands to extend BaseCommand
4. Add command registration system for discoverability

---

### 3. Dependency Injection

**Decision**: Use constructor injection with interface-based dependencies

**Rationale**:

- Enables testing with mock implementations
- Makes dependencies explicit and visible
- Supports composition over inheritance
- No framework needed (keep it simple)

**Pattern**:

```typescript
interface IMCPClient {
  callTool(name: string, args: unknown): Promise<MCPResponse>;
}

class RememberCommand extends BaseCommand {
  constructor(
    private readonly mcpClient: IMCPClient,
    private readonly formatter: IOutputFormatter
  ) {
    super();
  }

  async execute(options: RememberOptions): Promise<void> {
    const result = await this.mcpClient.callTool("remember", options);
    this.formatter.success(result.message);
  }
}

// Factory for creating commands with dependencies
class CommandFactory {
  create(name: string): BaseCommand {
    const mcpClient = new MCPClient();
    const formatter = new OutputFormatter();

    switch (name) {
      case "remember":
        return new RememberCommand(mcpClient, formatter);
      // ...
    }
  }
}
```

**Alternatives Considered**:

- InversifyJS or TSyringe DI containers → Rejected: Overkill for CLI app, adds complexity
- Service locator pattern → Rejected: Hides dependencies, hard to test
- Global singletons → Rejected: Testability nightmare

**Implementation Guidance**:

1. Define interfaces for all injectable dependencies
2. Use constructor injection exclusively
3. Create factory for production dependency wiring
4. In tests, pass mocks directly to constructors

---

### 4. Error Hierarchy

**Decision**: Custom error classes extending base Error with error codes and context

**Rationale**:

- Type-safe error handling (catch specific error types)
- Machine-readable error codes for programmatic handling
- Human-readable messages for users
- Contextual information for debugging

**Hierarchy Design**:

```typescript
// Base error with common properties
abstract class JarvisError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Category-specific errors
class ValidationError extends JarvisError {
  constructor(message: string, field: string, value: unknown) {
    super(message, "VALIDATION_ERROR", { field, value });
  }
}

class MCPConnectionError extends JarvisError {
  constructor(message: string, serverUrl: string) {
    super(message, "MCP_CONNECTION_ERROR", { serverUrl });
  }
}

class FileSystemError extends JarvisError {
  constructor(message: string, path: string, operation: string) {
    super(message, "FILESYSTEM_ERROR", { path, operation });
  }
}
```

**Alternatives Considered**:

- Plain Error objects → Rejected: No type safety, hard to handle different error types
- Error codes as strings → Rejected: Type errors not caught by compiler
- Result<T, E> pattern → Rejected: Overkill for JavaScript, throws more idiomatic

**Implementation Guidance**:

1. Create `src/core/errors/` directory
2. Define base JarvisError class
3. Create specific error classes for each domain (validation, network, filesystem, etc.)
4. Export all errors from `src/core/errors/index.ts`
5. Use type guards to handle errors: `if (error instanceof ValidationError)`

---

### 5. Testing Strategy with Vitest

**Decision**: Three-tier testing (unit → integration → e2e) with >85% coverage target

**Test Organization**:

```
tests/
├── unit/              # Isolated component tests
│   ├── commands/      # Command logic (mocked dependencies)
│   ├── core/          # Error handling, validation
│   └── utils/         # Pure functions
├── integration/       # Component interaction tests
│   └── cli-mcp.test.ts  # CLI → MCP client → mock server
├── e2e/               # Full workflow tests
│   └── workflows.test.ts  # init → remember → recall
├── fixtures/          # Shared test data
└── helpers/           # Test utilities
```

**Vitest Patterns**:

```typescript
// Unit test example with mocks
import { describe, it, expect, vi } from "vitest";
import { RememberCommand } from "@/commands/remember";

describe("RememberCommand", () => {
  it("calls MCP client with correct parameters", async () => {
    const mockClient = {
      callTool: vi.fn().mockResolvedValue({ success: true }),
    };
    const cmd = new RememberCommand(mockClient, mockFormatter);

    await cmd.execute({ content: "test", type: "decision" });

    expect(mockClient.callTool).toHaveBeenCalledWith("remember_context", {
      content: "test",
      type: "decision",
    });
  });
});

// Integration test with real client
describe("CLI-MCP Integration", () => {
  beforeEach(async () => {
    await startMockMCPServer();
  });

  it("completes full remember workflow", async () => {
    const result = await runCLI(["remember", "test decision"]);
    expect(result.exitCode).toBe(0);
    expect(result.output).toContain("Remembered, Sir");
  });
});
```

**Coverage Requirements**:

- Core business logic: 95%
- Command implementations: 85%
- Utilities: 80%
- Overall: 85%

**Alternatives Considered**:

- Jest → Rejected: Vitest faster, better ESM support, simpler config
- Only unit tests → Rejected: Misses integration issues
- 100% coverage → Rejected: Diminishing returns, tests trivial code

---

### 6. Performance Optimization

**Decision**: Lazy loading, caching, and performance monitoring

**Key Techniques**:

1. **Lazy Loading Heavy Dependencies**:

```typescript
// Don't load embeddings model until needed
class MCPClient {
  private _embeddingsModel?: EmbeddingsModel;

  private get embeddingsModel(): EmbeddingsModel {
    if (!this._embeddingsModel) {
      this._embeddingsModel = new EmbeddingsModel();
    }
    return this._embeddingsModel;
  }
}
```

2. **Caching Expensive Operations**:

```typescript
class ConfigManager {
  private cache = new Map<string, Config>();

  async getConfig(projectPath: string): Promise<Config> {
    if (this.cache.has(projectPath)) {
      return this.cache.get(projectPath)!;
    }
    const config = await this.loadConfig(projectPath);
    this.cache.set(projectPath, config);
    return config;
  }
}
```

3. **Performance Monitoring**:

```typescript
class PerformanceMonitor {
  measure<T>(name: string, fn: () => T): T {
    const start = performance.now();
    try {
      return fn();
    } finally {
      const duration = performance.now() - start;
      if (duration > 100) {
        logger.warn(`Slow operation: ${name} took ${duration}ms`);
      }
    }
  }
}
```

**Target Metrics**:

- CLI startup: <100ms
- Command execution: <200ms (excluding network)
- Search operations: <500ms
- Memory usage: <50MB idle, <100MB active

---

### 7. TSDoc Documentation

**Decision**: Comprehensive TSDoc comments for all public APIs

**Documentation Standard**:

````typescript
/**
 * Stores information to JARVIS memory system.
 *
 * This command captures decisions, notes, and contextual information
 * that can be recalled later using semantic search.
 *
 * @param content - The information to remember (1-10,000 characters)
 * @param options - Configuration options
 * @param options.type - Memory type: 'decision', 'note', or 'context'
 * @param options.tags - Optional tags for categorization
 * @param options.file - Optional file path association
 *
 * @returns Promise resolving to memory entry ID
 *
 * @throws {ValidationError} If content is empty or exceeds limits
 * @throws {MCPConnectionError} If unable to reach MCP server
 *
 * @example
 * ```typescript
 * await remember('Using PostgreSQL for better ACID guarantees', {
 *   type: 'decision',
 *   tags: ['database', 'architecture']
 * })
 * ```
 *
 * @see {@link recall} for retrieving stored memories
 */
async function remember(
  content: string,
  options?: RememberOptions
): Promise<string>;
````

**Required Elements**:

- Summary (first line, <80 chars)
- Detailed description
- All parameters with types and descriptions
- Return value description
- All thrown errors
- At least one realistic example
- Links to related functions

---

## Python Best Practices

### 8. Type Hints & Strict Mypy

**Decision**: Complete type annotations with strict mypy configuration

**mypy Configuration**:

```toml
[tool.mypy]
python_version = "3.10"
strict = true
warn_return_any = true
warn_unused_configs = true
disallow_untyped_defs = true
disallow_incomplete_defs = true
check_untyped_defs = true
disallow_untyped_decorators = true
no_implicit_optional = true
warn_redundant_casts = true
warn_unused_ignores = true
warn_no_return = true
strict_equality = true
```

**Type Annotation Patterns**:

```python
from typing import Protocol, TypedDict, Generic, TypeVar, Optional
from collections.abc import Sequence

# TypedDict for structured data
class MemoryEntry(TypedDict):
    id: str
    content: str
    type: str
    created_at: str
    tags: list[str]

# Protocol for interfaces
class MemoryStorage(Protocol):
    def save(self, entry: MemoryEntry) -> str: ...
    def search(self, query: str, limit: int = 10) -> Sequence[MemoryEntry]: ...

# Generic types
T = TypeVar('T')

class Repository(Generic[T]):
    def find_by_id(self, id: str) -> Optional[T]:
        ...
```

**Rationale**:

- Catches type errors before runtime (similar to TypeScript benefits)
- IDE autocomplete and refactoring support
- Self-documenting code
- Enables static analysis tools

---

### 9. Protocol & ABC for Interfaces

**Decision**: Use Protocol for structural typing, ABC for enforced contracts

**When to Use Each**:

**Protocol** (Duck Typing):

```python
from typing import Protocol

class Searchable(Protocol):
    """Interface for searchable memory layers."""

    def search(self, query: str, limit: int) -> list[MemoryEntry]:
        """Search for entries matching query."""
        ...

# Any class with search() method implements Searchable
class SemanticMemory:
    def search(self, query: str, limit: int = 10) -> list[MemoryEntry]:
        # implementation
        pass

# Type checker accepts this:
def find_relevant(storage: Searchable, query: str) -> list[MemoryEntry]:
    return storage.search(query, limit=5)
```

**ABC** (Nominal Typing):

```python
from abc import ABC, abstractmethod

class BaseMemory(ABC):
    """Abstract base for all memory layers."""

    @abstractmethod
    def initialize(self, project_path: Path) -> None:
        """Initialize memory storage."""
        pass

    @abstractmethod
    def store(self, entry: MemoryEntry) -> str:
        """Store entry and return ID."""
        pass

# Must explicitly extend and implement all abstract methods
class FactualMemory(BaseMemory):
    def initialize(self, project_path: Path) -> None:
        self.db = SQLiteDB(project_path / '.jarvis' / 'memory.db')

    def store(self, entry: MemoryEntry) -> str:
        return self.db.insert(entry)
```

**Decision Matrix**:

- Use **Protocol** for: Shared interfaces across unrelated classes, third-party compatibility
- Use **ABC** for: Class hierarchies with shared implementation, enforced contracts

---

### 10. Dependency Injection in Python

**Decision**: Constructor injection with type annotations (no framework)

**Pattern**:

```python
from typing import Protocol

class IMemoryStorage(Protocol):
    def save(self, entry: MemoryEntry) -> str: ...

class IEmbeddings(Protocol):
    def encode(self, text: str) -> list[float]: ...

class SemanticMemory:
    """Semantic memory layer with injected dependencies."""

    def __init__(
        self,
        storage: IMemoryStorage,
        embeddings: IEmbeddings,
        logger: logging.Logger
    ) -> None:
        self._storage = storage
        self._embeddings = embeddings
        self._logger = logger

    def remember(self, content: str) -> str:
        embedding = self._embeddings.encode(content)
        entry = MemoryEntry(content=content, embedding=embedding)
        return self._storage.save(entry)

# Factory for dependency wiring
class MemoryFactory:
    @staticmethod
    def create_semantic_memory(project_path: Path) -> SemanticMemory:
        storage = ChromaDBStorage(project_path)
        embeddings = BGEEmbeddings()
        logger = logging.getLogger(__name__)
        return SemanticMemory(storage, embeddings, logger)

# Testing with mocks
def test_semantic_memory():
    mock_storage = Mock(spec=IMemoryStorage)
    mock_embeddings = Mock(spec=IEmbeddings)
    mock_embeddings.encode.return_value = [0.1, 0.2, 0.3]

    memory = SemanticMemory(mock_storage, mock_embeddings, logger)
    memory.remember("test")

    mock_embeddings.encode.assert_called_once_with("test")
```

**Rationale**:

- Explicit dependencies (no hidden globals)
- Easy to test with mocks
- Type-safe with proper annotations
- No framework magic (KISS principle)

---

### 11. Exception Hierarchy

**Decision**: Custom exception hierarchy with contextual information

**Design**:

```python
from typing import Any

class JarvisError(Exception):
    """Base exception for all JARVIS errors."""

    def __init__(
        self,
        message: str,
        code: str,
        context: dict[str, Any] | None = None
    ) -> None:
        super().__init__(message)
        self.code = code
        self.context = context or {}

    def to_dict(self) -> dict[str, Any]:
        """Serialize error for JSON responses."""
        return {
            "error": self.__class__.__name__,
            "message": str(self),
            "code": self.code,
            "context": self.context
        }

class ValidationError(JarvisError):
    """Raised when input validation fails."""

    def __init__(self, message: str, field: str, value: Any) -> None:
        super().__init__(
            message,
            "VALIDATION_ERROR",
            {"field": field, "value": value}
        )

class DatabaseError(JarvisError):
    """Raised when database operations fail."""

    def __init__(self, message: str, operation: str, query: str | None = None) -> None:
        super().__init__(
            message,
            "DATABASE_ERROR",
            {"operation": operation, "query": query}
        )

class MCPToolError(JarvisError):
    """Raised when MCP tool execution fails."""

    def __init__(self, message: str, tool_name: str, arguments: dict[str, Any]) -> None:
        super().__init__(
            message,
            "MCP_TOOL_ERROR",
            {"tool_name": tool_name, "arguments": arguments}
        )
```

**Error Handling Pattern**:

```python
def handle_tool_call(tool_name: str, arguments: dict[str, Any]) -> dict[str, Any]:
    try:
        result = execute_tool(tool_name, arguments)
        return {"success": True, "data": result}
    except ValidationError as e:
        logger.warning(f"Validation failed: {e}", extra=e.context)
        return {"success": False, "error": e.to_dict()}
    except DatabaseError as e:
        logger.error(f"Database error: {e}", exc_info=True, extra=e.context)
        return {"success": False, "error": e.to_dict()}
    except Exception as e:
        logger.critical(f"Unexpected error: {e}", exc_info=True)
        return {
            "success": False,
            "error": {
                "error": "InternalError",
                "message": "An unexpected error occurred",
                "code": "INTERNAL_ERROR"
            }
        }
```

---

### 12. Testing with pytest

**Decision**: Comprehensive pytest strategy with fixtures, parametrize, and async support

**Test Organization**:

```python
# conftest.py - shared fixtures
import pytest
from pathlib import Path
from tempfile import TemporaryDirectory

@pytest.fixture
def temp_project():
    """Create temporary project directory."""
    with TemporaryDirectory() as tmpdir:
        project_path = Path(tmpdir)
        (project_path / '.jarvis').mkdir()
        yield project_path

@pytest.fixture
def mock_memory_storage():
    """Mock memory storage for testing."""
    storage = Mock(spec=IMemoryStorage)
    storage.save.return_value = "test-id-123"
    return storage

@pytest.fixture
async def initialized_memory(temp_project, mock_memory_storage):
    """Fully initialized memory instance."""
    memory = SemanticMemory(mock_memory_storage, mock_embeddings, logger)
    await memory.initialize(temp_project)
    return memory
```

**Parametrized Tests**:

```python
@pytest.mark.parametrize("content,expected_type", [
    ("Using PostgreSQL", "decision"),
    ("TODO: refactor this", "note"),
    ("Project uses FastAPI", "context"),
])
def test_detect_memory_type(content: str, expected_type: str):
    result = detect_memory_type(content)
    assert result == expected_type

@pytest.mark.parametrize("invalid_input", [
    "",  # empty
    "a" * 10001,  # too long
    None,  # None type
])
def test_validation_rejects_invalid_content(invalid_input):
    with pytest.raises(ValidationError):
        validate_content(invalid_input)
```

**Async Testing**:

```python
@pytest.mark.asyncio
async def test_async_memory_operation():
    memory = AsyncSemanticMemory()
    result = await memory.remember("test content")
    assert result.startswith("mem-")
```

**Mocking with pytest-mock**:

```python
def test_calls_external_service(mocker):
    mock_client = mocker.patch('jarvis.mcp.client.MCPClient')
    mock_client.call_tool.return_value = {"success": True}

    service = MyService(mock_client)
    result = service.do_something()

    mock_client.call_tool.assert_called_once()
    assert result is True
```

---

### 13. Async/Await Patterns

**Decision**: Use async/await for all I/O operations (file, network, database)

**Patterns**:

**Async Context Managers**:

```python
from contextlib import asynccontextmanager
import aiofiles

@asynccontextmanager
async def async_db_connection(db_path: Path):
    """Async context manager for database connections."""
    conn = await aiosqlite.connect(db_path)
    try:
        yield conn
    finally:
        await conn.close()

async def save_memory(entry: MemoryEntry) -> str:
    async with async_db_connection(DB_PATH) as conn:
        cursor = await conn.execute(
            "INSERT INTO memories (content) VALUES (?)",
            (entry.content,)
        )
        await conn.commit()
        return str(cursor.lastrowid)
```

**Concurrent Operations**:

```python
import asyncio

async def search_all_layers(query: str) -> dict[str, list[MemoryEntry]]:
    """Search all memory layers concurrently."""
    factual_task = asyncio.create_task(factual_memory.search(query))
    semantic_task = asyncio.create_task(semantic_memory.search(query))
    snapshot_task = asyncio.create_task(snapshot_memory.search(query))

    results = await asyncio.gather(
        factual_task,
        semantic_task,
        snapshot_task,
        return_exceptions=True
    )

    return {
        "factual": results[0] if not isinstance(results[0], Exception) else [],
        "semantic": results[1] if not isinstance(results[1], Exception) else [],
        "snapshot": results[2] if not isinstance(results[2], Exception) else []
    }
```

**Rationale**:

- Non-blocking I/O improves responsiveness
- Can search multiple memory layers in parallel
- Better resource utilization
- Modern Python best practice

---

### 14. Pydantic for Runtime Validation

**Decision**: Use Pydantic v2 for data validation and serialization

**Configuration Models**:

```python
from pydantic import BaseModel, Field, field_validator, ConfigDict
from typing import Literal

class ProjectConfig(BaseModel):
    """Project-specific JARVIS configuration."""

    model_config = ConfigDict(frozen=False, extra='forbid')

    language: Literal["en"] = "en"
    response_style: Literal["concise", "verbose"] = "concise"
    persona: Literal["jarvis"] = "jarvis"
    auto_capture: bool = True
    checkpoint_before_risky: bool = True

    @field_validator('language')
    @classmethod
    def validate_language(cls, v: str) -> str:
        if v != "en":
            raise ValueError("Only English ('en') is supported")
        return v

class MemoryEntryCreate(BaseModel):
    """Schema for creating new memory entry."""

    content: str = Field(min_length=1, max_length=10000)
    type: Literal["decision", "note", "context"] = "decision"
    tags: list[str] = Field(default_factory=list, max_length=10)
    file_path: str | None = None

    @field_validator('tags')
    @classmethod
    def validate_tags(cls, v: list[str]) -> list[str]:
        if len(v) > 10:
            raise ValueError("Maximum 10 tags allowed")
        return [tag.lower().strip() for tag in v]

# Usage
try:
    config = ProjectConfig(
        language="en",
        response_style="verbose"
    )
except ValidationError as e:
    print(e.json())  # Detailed error messages
```

**Benefits**:

- Automatic validation of incoming data
- Type coercion (string "true" → bool True)
- Clear error messages with field paths
- Serialization to JSON/dict
- Integration with FastAPI (future MCP server upgrade)

---

## Refactoring Strategies

### 15. Incremental Refactoring

**Decision**: Strangler Fig pattern with feature flagging

**Approach**:

1. **Parallel Implementation**: Build new version alongside old
2. **Gradual Migration**: Switch one module at a time
3. **Testing at Each Step**: Ensure no regressions
4. **Rollback Capability**: Can revert if issues found

**Implementation Plan**:

```python
# Phase 1: Add new interfaces
class IMemoryStorage(Protocol):
    def save(self, entry: MemoryEntry) -> str: ...

# Phase 2: Adapter for old implementation
class LegacyMemoryAdapter(IMemoryStorage):
    def __init__(self, legacy_memory: OldMemory):
        self._legacy = legacy_memory

    def save(self, entry: MemoryEntry) -> str:
        return self._legacy.store_memory(entry.content, entry.type)

# Phase 3: New implementation
class NewMemoryStorage(IMemoryStorage):
    def save(self, entry: MemoryEntry) -> str:
        # New improved implementation
        pass

# Phase 4: Feature flag
def get_memory_storage(use_new: bool = False) -> IMemoryStorage:
    if use_new or os.getenv('JARVIS_USE_NEW_MEMORY') == 'true':
        return NewMemoryStorage()
    return LegacyMemoryAdapter(OldMemory())

# Phase 5: After validation, remove old code and feature flag
```

---

### 16. Maintaining Backward Compatibility

**Decision**: Version interfaces and provide migration helpers

**Compatibility Strategies**:

1. **Interface Versioning**:

```python
from typing import overload

class ConfigManager:
    @overload
    def load_config(self, path: Path) -> ProjectConfig: ...

    @overload
    def load_config(self, path: Path, version: Literal[1]) -> dict[str, Any]: ...

    def load_config(
        self,
        path: Path,
        version: int | None = None
    ) -> ProjectConfig | dict[str, Any]:
        if version == 1:
            # Return old format for backward compatibility
            return self._load_legacy_config(path)
        # Return new format
        return ProjectConfig.from_file(path)
```

2. **Data Migration Helpers**:

```python
class DataMigrator:
    """Migrate data from old to new formats transparently."""

    @staticmethod
    def migrate_config(old_config: dict[str, Any]) -> ProjectConfig:
        """Migrate v1 config to v2."""
        return ProjectConfig(
            language=old_config.get('lang', 'en'),
            response_style=old_config.get('verbosity', 'concise'),
            # Map old fields to new schema
        )

    @staticmethod
    def detect_version(config_path: Path) -> int:
        """Detect config file version."""
        with open(config_path) as f:
            data = json.load(f)
        if 'schema_version' in data:
            return data['schema_version']
        # Old format detection heuristics
        return 1 if 'lang' in data else 2
```

3. **Deprecation Warnings**:

```python
import warnings

def old_remember_api(content: str, memory_type: str) -> str:
    warnings.warn(
        "old_remember_api is deprecated, use remember() instead",
        DeprecationWarning,
        stacklevel=2
    )
    return remember(content, type=memory_type)
```

---

### 17. Test-Driven Refactoring

**Decision**: Write tests before refactoring, maintain green tests throughout

**Process**:

1. **Characterization Tests**: Write tests for current behavior
2. **Refactor**: Change implementation while keeping tests green
3. **Improve Tests**: Add edge cases and improve coverage
4. **Remove Duplication**: Clean up test code

**Example Workflow**:

```python
# Step 1: Characterization test (documents current behavior)
def test_remember_current_behavior():
    """Document how remember() currently works."""
    # Arrange
    memory = create_memory_instance()

    # Act
    result = memory.remember("test content", "decision")

    # Assert - test actual current behavior, even if not ideal
    assert isinstance(result, str)
    assert len(result) > 0
    # This test may capture bugs too, that's OK

# Step 2: Refactor internal implementation
class FactualMemory:
    def remember(self, content: str, memory_type: str) -> str:
        # New implementation
        entry = MemoryEntry(content=content, type=memory_type)
        return self._storage.save(entry)

# Step 3: Test still passes! Refactor successful

# Step 4: Add edge case tests
def test_remember_validates_content():
    with pytest.raises(ValidationError):
        memory.remember("", "decision")

def test_remember_handles_unicode():
    result = memory.remember("Hello 世界 🎉", "note")
    assert result is not None
```

---

### 18. Code Complexity Reduction

**Decision**: Target cyclomatic complexity <10, function length <50 lines

**Metrics to Track**:

- **Cyclomatic Complexity**: Number of independent paths through code
- **Cognitive Complexity**: Mental effort to understand code
- **Function Length**: Lines of code per function
- **Class Size**: Number of methods per class

**Refactoring Techniques**:

**Extract Method**:

```python
# Before: High complexity
def process_memory_entry(content: str, options: dict) -> str:
    if not content:
        raise ValidationError("Content required")
    if len(content) > 10000:
        raise ValidationError("Content too long")

    memory_type = options.get('type', 'decision')
    if memory_type not in ['decision', 'note', 'context']:
        raise ValidationError("Invalid type")

    tags = options.get('tags', [])
    if len(tags) > 10:
        raise ValidationError("Too many tags")

    # 30 more lines...

# After: Reduced complexity
def process_memory_entry(content: str, options: dict) -> str:
    validate_content(content)
    memory_type = validate_type(options.get('type', 'decision'))
    tags = validate_tags(options.get('tags', []))

    entry = create_entry(content, memory_type, tags)
    return save_entry(entry)

def validate_content(content: str) -> None:
    if not content:
        raise ValidationError("Content required")
    if len(content) > 10000:
        raise ValidationError("Content too long")

def validate_type(memory_type: str) -> str:
    if memory_type not in ['decision', 'note', 'context']:
        raise ValidationError("Invalid type")
    return memory_type
```

**Replace Conditional with Polymorphism**:

```python
# Before: Complex conditionals
class MemoryHandler:
    def handle(self, entry: MemoryEntry) -> str:
        if entry.type == 'decision':
            # decision-specific logic
            pass
        elif entry.type == 'note':
            # note-specific logic
            pass
        elif entry.type == 'context':
            # context-specific logic
            pass

# After: Polymorphism
class DecisionHandler(BaseHandler):
    def handle(self, entry: MemoryEntry) -> str:
        # decision-specific logic
        pass

class NoteHandler(BaseHandler):
    def handle(self, entry: MemoryEntry) -> str:
        # note-specific logic
        pass

HANDLERS = {
    'decision': DecisionHandler(),
    'note': NoteHandler(),
    'context': ContextHandler(),
}

def handle_entry(entry: MemoryEntry) -> str:
    handler = HANDLERS[entry.type]
    return handler.handle(entry)
```

---

### 19. Architectural Decision Records (ADRs)

**Decision**: Document all significant architecture decisions in ADR format

**ADR Template**:

```markdown
# ADR-001: Use Command Pattern for CLI Commands

## Status

Accepted

## Context

Currently, CLI commands have inconsistent structure. Some parse arguments inline,
others use external libraries. Error handling is scattered. Testing is difficult
because command logic is tightly coupled to CLI framework.

We need a consistent pattern that:

- Enforces separation of concerns (parse/validate/execute)
- Makes testing easier
- Provides extension points for new commands
- Centralizes error handling

## Decision

Implement abstract Command base class with Template Method pattern.

All commands will:

1. Extend BaseCommand<TOptions, TResult>
2. Implement parse(), validate(), execute()
3. Inherit standard error handling and logging
4. Be testable in isolation

## Consequences

### Positive

- Consistent structure across all commands
- Easy to add new commands (just extend BaseCommand)
- Testable (can mock dependencies in constructor)
- Clear flow: parse → validate → execute

### Negative

- Requires refactoring all existing commands
- Learning curve for developers unfamiliar with pattern
- Slightly more boilerplate than free functions

### Neutral

- Need to train team on pattern usage
- Documentation update required

## Alternatives Considered

### 1. Functional Approach

Higher-order functions wrapping command logic.
**Rejected**: Less discoverable, harder for OOP-familiar devs

### 2. No Pattern

Keep current ad-hoc structure.
**Rejected**: Maintenance burden, inconsistency

## Implementation Notes

- Create BaseCommand in src/commands/base/command.ts
- Refactor init.ts first as proof of concept
- Add command factory for dependency injection
- Update tests to use new pattern

## Related

- ADR-002: Error Hierarchy
- ADR-003: Dependency Injection
```

**ADR Storage**: `docs/architecture/adr-XXX-title.md`

---

## Summary

### Key Decisions

**TypeScript**:

1. Strict mode with full type coverage
2. Command pattern for CLI consistency
3. Constructor-based dependency injection
4. Custom error hierarchy with context
5. Vitest with 85%+ coverage target
6. Lazy loading and caching for performance
7. TSDoc for all public APIs

**Python**:

1. Strict mypy with complete type hints
2. Protocol for interfaces, ABC for contracts
3. Constructor-based dependency injection
4. Custom exception hierarchy with serialization
5. pytest with fixtures and async support
6. Async/await for all I/O operations
7. Pydantic for runtime validation

**Refactoring**:

1. Strangler Fig pattern for incremental changes
2. Backward compatibility through adapters
3. Test-driven refactoring process
4. Complexity reduction (<10 cyclomatic complexity)
5. ADRs for architectural decisions

### Implementation Priority

**Phase 1 - Foundation** (Week 1-2):

- Set up strict TypeScript/mypy configs
- Create error hierarchies
- Define interfaces/protocols
- Write ADRs for key decisions

**Phase 2 - Core Refactor** (Week 3-4):

- Implement command pattern
- Refactor memory layers with DI
- Add comprehensive tests
- Performance optimization

**Phase 3 - Polish** (Week 5-6):

- Documentation (TSDoc, docstrings)
- Complexity reduction
- Additional test coverage
- Migration helpers

### Success Metrics

- ✅ Zero `any` types in TypeScript
- ✅ 100% mypy strict compliance
- ✅ 85%+ test coverage
- ✅ Cyclomatic complexity <10
- ✅ All tests pass in <30s
- ✅ Zero regressions in functionality
- ✅ ADRs for all major decisions
