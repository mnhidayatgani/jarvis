# Python Best Practices for JARVIS

This document outlines Python best practices applied in the JARVIS MCP server, with specific focus on error handling patterns, type safety, and maintainability.

## Error Handling

### Custom Exception Classes

Always use specific exception classes instead of generic `Exception`:

```python
# ❌ Bad
raise Exception("Validation failed")

# ✅ Good
raise ValidationError("Content is required", field="content", value="")
```

### Exception Hierarchy

Extend `JarvisError` for all custom exceptions:

```python
class MyCustomError(JarvisError):
    """Custom error for specific use case."""

    def __init__(self, message: str, context: dict[str, Any] | None = None):
        super().__init__(message, "MY_CUSTOM_ERROR", context)
```

### Centralized Error Handling

Use `ErrorHandler` for consistent error handling:

```python
# Decorator pattern
from jarvis.mcp.error_handler import error_handler

@error_handler.wrap(context={"tool": "remember"})
def remember_context(content: str) -> dict[str, Any]:
    # Tool logic
    return {"success": True}

# Explicit handling
try:
    result = risky_operation()
except Exception as e:
    return error_handler.handle(e, context={"operation": "risky"})
```

### Error Context

Always include relevant context in exceptions:

```python
raise DatabaseError(
    "Failed to insert record",
    operation="insert",
    query="INSERT INTO memories...",
    context={"table": "memories", "id": entry_id}
)
```

### Async Error Handling

Use try/except for async operations:

```python
async def fetch_data() -> Data:
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(url) as response:
                if response.status != 200:
                    raise MCPToolError(
                        f"HTTP {response.status}",
                        tool_name="fetch",
                        arguments={"url": url}
                    )
                return await response.json()
    except aiohttp.ClientError as e:
        raise InternalError(
            "Network request failed",
            context={"url": url, "error": str(e)}
        )
```

### Recovery Patterns

Implement recovery mechanisms for graceful degradation:

```python
try:
    return primary_operation()
except DatabaseError as e:
    logger.warning(f"Primary operation failed: {e}")
    return error_handler.handle_with_recovery(
        e,
        recovery=lambda: fallback_operation()
    )
```

## Type Safety

### Type Hints

Always use type hints for function signatures:

```python
# ❌ Bad
def process_data(data):
    return data["value"]

# ✅ Good
def process_data(data: dict[str, Any]) -> int:
    if "value" not in data:
        raise ValidationError("Missing value field", field="value", value=None)
    return int(data["value"])
```

### Pydantic Models

Use Pydantic for data validation:

```python
from pydantic import BaseModel, Field, field_validator

class MemoryEntryCreate(BaseModel):
    """Schema for creating memory entry."""

    content: str = Field(min_length=1, max_length=10000)
    type: Literal["decision", "note", "context"] = "decision"
    tags: list[str] = Field(default_factory=list, max_length=10)

    @field_validator("tags")
    @classmethod
    def validate_tags(cls, v: list[str]) -> list[str]:
        return [tag.lower().strip() for tag in v]

# Usage
try:
    entry = MemoryEntryCreate(
        content="Test",
        type="decision",
        tags=["Python", "Testing"]
    )
except ValidationError as e:
    logger.error(f"Validation failed: {e}")
```

### Protocol Types

Use Protocol for structural typing:

```python
from typing import Protocol

class Searchable(Protocol):
    """Protocol for searchable memory layers."""

    def search(self, query: str, limit: int = 10) -> list[MemoryEntry]:
        """Search for entries matching query."""
        ...

# Any class implementing search() satisfies Searchable
def find_memories(storage: Searchable, query: str) -> list[MemoryEntry]:
    return storage.search(query, limit=5)
```

### Abstract Base Classes

Use ABC for enforced contracts:

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

# Must implement all abstract methods
class FactualMemory(BaseMemory):
    def initialize(self, project_path: Path) -> None:
        self.db = SQLiteDB(project_path / ".jarvis" / "memory.db")

    def store(self, entry: MemoryEntry) -> str:
        return self.db.insert(entry)
```

## Logging

### Structured Logging

Use structured logging with context:

```python
import logging

logger = logging.getLogger(__name__)

logger.info(
    "Memory entry stored",
    extra={
        "entry_id": entry.id,
        "type": entry.type,
        "content_length": len(entry.content)
    }
)

logger.error(
    "Database operation failed",
    exc_info=True,
    extra={
        "operation": "insert",
        "table": "memories",
        "error": str(e)
    }
)
```

### Log Levels

Use appropriate log levels:

```python
logger.debug("Detailed information for debugging")
logger.info("General information about operation")
logger.warning("Warning - something unexpected but handled")
logger.error("Error - operation failed", exc_info=True)
logger.critical("Critical failure - system unstable")
```

### Custom Logger

Use custom logger setup:

```python
from jarvis.utils.logger import setup_logger, get_logger

# Set up logger with file output
logger = setup_logger(
    "jarvis.memory",
    level="INFO",
    log_file=Path("/tmp/jarvis.log"),
    use_json=True
)

# Get logger with context
logger = get_logger("jarvis.mcp", context={"tool": "remember"})
```

## Dependency Injection

### Constructor Injection

Inject dependencies via constructor:

```python
class SemanticMemory:
    """Semantic memory with injected dependencies."""

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
```

### Factory Pattern

Use factories for dependency wiring:

```python
class MemoryFactory:
    """Factory for creating memory instances."""

    @staticmethod
    def create_semantic_memory(project_path: Path) -> SemanticMemory:
        storage = ChromaDBStorage(project_path)
        embeddings = BGEEmbeddings()
        logger = logging.getLogger(__name__)
        return SemanticMemory(storage, embeddings, logger)

# Usage
memory = MemoryFactory.create_semantic_memory(Path("/project"))
```

## Async/Await

### Always Use Async/Await

Use async/await for I/O operations:

```python
# ❌ Bad - Blocking I/O
def read_file(path: Path) -> str:
    with open(path) as f:
        return f.read()

# ✅ Good - Non-blocking
async def read_file(path: Path) -> str:
    async with aiofiles.open(path) as f:
        return await f.read()
```

### Concurrent Operations

Use `asyncio.gather()` for concurrent operations:

```python
# ❌ Bad - Sequential
factual_results = await factual.search(query)
semantic_results = await semantic.search(query)
snapshot_results = await snapshot.search(query)

# ✅ Good - Concurrent
results = await asyncio.gather(
    factual.search(query),
    semantic.search(query),
    snapshot.search(query),
    return_exceptions=True  # Handle failures gracefully
)
factual_results, semantic_results, snapshot_results = results
```

### Error Handling in Async

Handle errors in concurrent operations:

```python
results = await asyncio.gather(
    operation1(),
    operation2(),
    operation3(),
    return_exceptions=True
)

for i, result in enumerate(results):
    if isinstance(result, Exception):
        logger.error(f"Operation {i} failed: {result}")
    else:
        process_result(result)
```

## Testing

### Pytest Fixtures

Use fixtures for test setup:

```python
import pytest
from pathlib import Path

@pytest.fixture
def temp_project(tmp_path):
    """Create temporary project directory."""
    jarvis_dir = tmp_path / ".jarvis"
    jarvis_dir.mkdir()
    (jarvis_dir / "db").mkdir()
    return tmp_path

@pytest.fixture
def mock_memory_storage():
    """Mock memory storage."""
    storage = Mock(spec=IMemoryStorage)
    storage.save.return_value = "test-id-123"
    return storage
```

### Parametrized Tests

Use parametrize for multiple test cases:

```python
@pytest.mark.parametrize("content,expected_type", [
    ("Using PostgreSQL", "decision"),
    ("TODO: refactor this", "note"),
    ("Project uses FastAPI", "context"),
])
def test_detect_memory_type(content: str, expected_type: str):
    result = detect_memory_type(content)
    assert result == expected_type
```

### Testing Errors

Test error scenarios:

```python
def test_validation_error_on_empty_content():
    with pytest.raises(ValidationError) as exc_info:
        validate_content("")

    assert exc_info.value.code == "VALIDATION_ERROR"
    assert "content" in exc_info.value.context["field"]

def test_database_error_handling():
    mock_db = Mock()
    mock_db.insert.side_effect = DatabaseError(
        "Connection failed",
        operation="insert"
    )

    with pytest.raises(DatabaseError):
        memory.store(entry)
```

### Async Testing

Test async functions with pytest-asyncio:

```python
import pytest

@pytest.mark.asyncio
async def test_async_remember():
    memory = AsyncSemanticMemory()
    entry_id = await memory.remember("test content")
    assert entry_id.startswith("mem-")

@pytest.mark.asyncio
async def test_concurrent_search():
    results = await asyncio.gather(
        memory1.search("query"),
        memory2.search("query")
    )
    assert len(results) == 2
```

## Code Organization

### Single Responsibility

One class, one responsibility:

```python
# ❌ Bad - Multiple responsibilities
class MemoryHandler:
    def validate_input(self): ...
    def store_entry(self): ...
    def search_entries(self): ...
    def format_output(self): ...

# ✅ Good - Separated concerns
class InputValidator:
    def validate(self, entry: MemoryEntry) -> None: ...

class MemoryStorage:
    def store(self, entry: MemoryEntry) -> str: ...
    def search(self, query: str) -> list[MemoryEntry]: ...

class OutputFormatter:
    def format(self, results: list[MemoryEntry]) -> str: ...
```

### Immutability

Use immutable data structures:

```python
# ❌ Bad - Mutable default argument
def add_tags(entry, tags=[]):
    tags.append(entry.tag)
    return tags

# ✅ Good - Immutable default
def add_tags(entry, tags: list[str] | None = None) -> list[str]:
    return [*(tags or []), entry.tag]
```

## Documentation

### Google-Style Docstrings

Document all public functions:

```python
def remember(
    self,
    content: str,
    memory_type: str = "decision",
    tags: list[str] | None = None
) -> str:
    """Store information to memory.

    Args:
        content: Information to remember (1-10,000 chars)
        memory_type: Type of memory (decision/note/context)
        tags: Optional tags for categorization

    Returns:
        Generated memory entry ID

    Raises:
        ValidationError: If content invalid
        DatabaseError: If storage fails

    Example:
        >>> memory.remember("Using PostgreSQL", "decision")
        'mem-abc123'
    """
```

### Type Annotations in Docstrings

Include type information:

```python
def search(
    self,
    query: str,
    limit: int = 10
) -> list[MemoryEntry]:
    """Search for memory entries.

    Args:
        query (str): Search query string
        limit (int): Maximum results (default: 10)

    Returns:
        list[MemoryEntry]: Matching entries sorted by relevance
    """
```

## Performance

### Lazy Loading

Lazy load heavy dependencies:

```python
class EmbeddingsWrapper:
    def __init__(self):
        self._model: EmbeddingsModel | None = None

    @property
    def model(self) -> EmbeddingsModel:
        if self._model is None:
            self._model = EmbeddingsModel()  # Load on first access
        return self._model
```

### Caching

Cache expensive operations:

```python
from functools import lru_cache

@lru_cache(maxsize=128)
def compute_embedding(text: str) -> list[float]:
    """Compute embedding with caching."""
    return model.encode(text)
```

### Database Connection Pooling

Use connection pooling:

```python
from sqlalchemy import create_engine
from sqlalchemy.pool import QueuePool

engine = create_engine(
    "sqlite:///memory.db",
    poolclass=QueuePool,
    pool_size=5,
    max_overflow=10
)
```

## Anti-Patterns to Avoid

### Don't Use Bare Except

```python
# ❌ Bad
try:
    operation()
except:
    pass

# ✅ Good
try:
    operation()
except SpecificError as e:
    logger.error(f"Operation failed: {e}")
    raise
```

### Don't Return None for Errors

```python
# ❌ Bad
def find_user(user_id: str) -> User | None:
    try:
        return db.find(user_id)
    except:
        return None  # Loses error information

# ✅ Good
def find_user(user_id: str) -> User:
    try:
        return db.find(user_id)
    except NotFoundError:
        raise ValidationError(
            "User not found",
            field="user_id",
            value=user_id
        )
```

### Don't Modify Mutable Default Arguments

```python
# ❌ Bad
def add_item(item, items=[]):
    items.append(item)
    return items

# ✅ Good
def add_item(item, items: list | None = None) -> list:
    if items is None:
        items = []
    return [*items, item]
```

### Don't Ignore Type Hints

```python
# ❌ Bad
def process(data: dict) -> str:
    return data  # type: ignore

# ✅ Good
def process(data: dict) -> str:
    return str(data["value"])
```

## Graceful Degradation Pattern

Implement graceful degradation for resilience:

```python
def multi_layer_search(query: str) -> list[SearchResult]:
    """Search with graceful degradation."""
    results = []
    failed_layers = []

    # Try factual layer
    try:
        results.extend(factual.search(query))
    except Exception as e:
        failed_layers.append("factual")
        logger.warning(f"Factual search failed: {e}")

    # Try semantic layer
    try:
        results.extend(semantic.search(query))
    except Exception as e:
        failed_layers.append("semantic")
        logger.warning(f"Semantic search failed: {e}")

    # Fail if all layers failed
    if not results and failed_layers:
        raise RuntimeError(
            f"All search layers failed: {', '.join(failed_layers)}"
        )

    # Log partial failure
    if failed_layers:
        logger.warning(
            f"Partial search success. Failed: {', '.join(failed_layers)}"
        )

    return results
```

## Summary

1. **Use specific exception classes** with context
2. **Add type hints** to all functions
3. **Use Pydantic** for data validation
4. **Inject dependencies** via constructor
5. **Use async/await** for I/O operations
6. **Test error paths** with pytest
7. **Document with docstrings** (Google style)
8. **Implement graceful degradation** for resilience
9. **Cache and lazy load** for performance
10. **Avoid bare except, None returns, and type ignores**

Following these practices ensures maintainable, type-safe, and robust Python code in the JARVIS MCP server.
