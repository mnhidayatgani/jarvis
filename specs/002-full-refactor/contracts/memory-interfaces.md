# Memory Layer Interfaces

**Purpose**: Define Python Protocol interfaces for memory layers  
**Date**: November 15, 2025

## Core Interfaces

### Base Memory Layer

```python
from typing import Protocol, Sequence
from pathlib import Path
from datetime import datetime

class IMemoryLayer(Protocol):
    """Base protocol for all memory storage layers."""

    def initialize(self, project_path: Path) -> None:
        """
        Initialize memory storage for project.

        Args:
            project_path: Absolute path to project root

        Raises:
            DatabaseError: If initialization fails
        """
        ...

    def store(self, entry: MemoryEntry) -> str:
        """
        Store memory entry and return generated ID.

        Args:
            entry: Memory entry to store

        Returns:
            Unique entry ID

        Raises:
            ValidationError: If entry is invalid
            DatabaseError: If storage fails
        """
        ...

    def search(
        self,
        query: str,
        limit: int = 10,
        filters: dict[str, Any] | None = None
    ) -> Sequence[MemoryEntry]:
        """
        Search for matching entries.

        Args:
            query: Search query
            limit: Maximum results to return
            filters: Optional filters (type, file, date range)

        Returns:
            Matching entries ordered by relevance
        """
        ...

    def get_by_id(self, entry_id: str) -> MemoryEntry | None:
        """
        Retrieve entry by ID.

        Args:
            entry_id: Unique entry identifier

        Returns:
            Memory entry if found, None otherwise
        """
        ...

    def delete(self, entry_id: str) -> bool:
        """
        Delete entry by ID.

        Args:
            entry_id: Entry to delete

        Returns:
            True if deleted, False if not found

        Raises:
            DatabaseError: If deletion fails
        """
        ...

    def count(self, filters: dict[str, Any] | None = None) -> int:
        """
        Count entries matching filters.

        Args:
            filters: Optional filters

        Returns:
            Number of matching entries
        """
        ...
```

### Storage Backend

```python
class IStorageBackend(Protocol):
    """Generic storage backend interface."""

    def connect(self, connection_string: str) -> None:
        """Establish connection to storage."""
        ...

    def disconnect(self) -> None:
        """Close connection to storage."""
        ...

    def execute_query(
        self,
        query: str,
        parameters: tuple[Any, ...] | None = None
    ) -> Sequence[dict[str, Any]]:
        """
        Execute query and return results.

        Args:
            query: Query to execute (SQL, vector search, etc.)
            parameters: Query parameters

        Returns:
            Query results
        """
        ...

    def is_healthy(self) -> bool:
        """Check if storage backend is healthy."""
        ...
```

### Embeddings Provider

```python
class IEmbeddingsProvider(Protocol):
    """Interface for text embedding generation."""

    def encode(self, text: str) -> list[float]:
        """
        Generate embedding vector for text.

        Args:
            text: Input text (1-10,000 characters)

        Returns:
            Embedding vector (typically 768 or 1024 dimensions)
        """
        ...

    def encode_batch(self, texts: Sequence[str]) -> list[list[float]]:
        """
        Generate embeddings for multiple texts.

        Args:
            texts: Input texts

        Returns:
            List of embedding vectors
        """
        ...

    def get_dimension(self) -> int:
        """Get embedding dimension size."""
        ...
```

## Data Models

### Memory Entry

```python
from pydantic import BaseModel, Field, field_validator

class MemoryEntry(BaseModel):
    """Memory entry data model with validation."""

    id: str = Field(description="Unique entry ID")
    content: str = Field(min_length=1, max_length=10000, description="Entry content")
    type: Literal["decision", "note", "context"] = Field(description="Entry type")
    tags: list[str] = Field(default_factory=list, max_length=10, description="Tags")
    file_path: str | None = Field(default=None, description="Associated file")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    metadata: dict[str, Any] = Field(default_factory=dict, description="Additional metadata")

    @field_validator('tags')
    @classmethod
    def normalize_tags(cls, v: list[str]) -> list[str]:
        """Normalize tags to lowercase and remove duplicates."""
        return list(set(tag.lower().strip() for tag in v if tag.strip()))

    @field_validator('content')
    @classmethod
    def validate_content(cls, v: str) -> str:
        """Validate content is not empty after stripping."""
        content = v.strip()
        if not content:
            raise ValueError("Content cannot be empty")
        return content
```

### Search Result

```python
class SearchResult(BaseModel):
    """Search result with relevance score."""

    entry: MemoryEntry
    score: float = Field(ge=0.0, le=1.0, description="Relevance score 0-1")
    highlights: list[str] = Field(default_factory=list, description="Highlighted matches")

    class Config:
        frozen = True  # Immutable
```

## Implementation Contracts

### Factual Memory

```python
class IFactualMemory(IMemoryLayer, Protocol):
    """SQL-based factual memory storage."""

    def search_by_keyword(
        self,
        keywords: list[str],
        limit: int = 10
    ) -> Sequence[MemoryEntry]:
        """
        Search using keyword matching (SQL LIKE/FTS).

        Args:
            keywords: Keywords to search for
            limit: Maximum results

        Returns:
            Matching entries
        """
        ...

    def get_by_type(
        self,
        memory_type: Literal["decision", "note", "context"],
        limit: int = 10
    ) -> Sequence[MemoryEntry]:
        """Get entries by type."""
        ...

    def get_by_file(
        self,
        file_path: str,
        limit: int = 10
    ) -> Sequence[MemoryEntry]:
        """Get entries associated with file."""
        ...

    def get_recent(
        self,
        days: int = 7,
        limit: int = 10
    ) -> Sequence[MemoryEntry]:
        """Get recent entries."""
        ...
```

### Semantic Memory

```python
class ISemanticMemory(IMemoryLayer, Protocol):
    """Vector-based semantic search memory."""

    def search_similar(
        self,
        query: str,
        limit: int = 10,
        threshold: float = 0.7
    ) -> Sequence[SearchResult]:
        """
        Search using vector similarity.

        Args:
            query: Search query
            limit: Maximum results
            threshold: Minimum similarity score (0-1)

        Returns:
            Results with similarity scores
        """
        ...

    def get_embeddings(self, entry_id: str) -> list[float] | None:
        """Get embedding vector for entry."""
        ...

    def reindex(self) -> None:
        """Rebuild vector index."""
        ...
```

### Snapshot Memory

```python
class ISnapshotMemory(IMemoryLayer, Protocol):
    """Filesystem-based code snapshot storage."""

    def store_snapshot(
        self,
        commit_sha: str,
        diff: str,
        metadata: dict[str, Any]
    ) -> str:
        """
        Store code change snapshot.

        Args:
            commit_sha: Git commit SHA
            diff: Git diff content
            metadata: Commit metadata (author, message, etc.)

        Returns:
            Snapshot ID
        """
        ...

    def get_snapshot(self, commit_sha: str) -> dict[str, Any] | None:
        """Get snapshot by commit SHA."""
        ...

    def get_snapshots_for_file(
        self,
        file_path: str,
        limit: int = 10
    ) -> Sequence[dict[str, Any]]:
        """Get snapshots affecting specific file."""
        ...
```

## Memory Core Orchestrator

```python
class IMemoryCore(Protocol):
    """Orchestrates all memory layers."""

    def __init__(
        self,
        factual: IFactualMemory,
        semantic: ISemanticMemory,
        snapshot: ISnapshotMemory
    ) -> None:
        ...

    def remember(
        self,
        content: str,
        memory_type: str = "decision",
        tags: list[str] | None = None,
        file_path: str | None = None
    ) -> str:
        """
        Store to both factual and semantic layers.

        Args:
            content: Content to remember
            memory_type: Type of memory
            tags: Optional tags
            file_path: Optional file association

        Returns:
            Entry ID
        """
        ...

    def recall(
        self,
        query: str,
        limit: int = 10,
        memory_type: str | None = None
    ) -> list[SearchResult]:
        """
        Search across all layers and merge results.

        Args:
            query: Search query
            limit: Maximum results
            memory_type: Optional type filter

        Returns:
            Merged and ranked results
        """
        ...

    def get_statistics(self) -> dict[str, Any]:
        """Get memory statistics across all layers."""
        ...
```

## Dependency Injection Pattern

```python
class MemoryFactory:
    """Factory for creating memory instances with dependencies."""

    @staticmethod
    def create_factual_memory(
        project_path: Path,
        storage_backend: IStorageBackend
    ) -> IFactualMemory:
        """Create factual memory instance."""
        ...

    @staticmethod
    def create_semantic_memory(
        project_path: Path,
        storage_backend: IStorageBackend,
        embeddings: IEmbeddingsProvider
    ) -> ISemanticMemory:
        """Create semantic memory instance."""
        ...

    @staticmethod
    def create_memory_core(project_path: Path) -> IMemoryCore:
        """Create fully-wired memory core with all layers."""
        factual = MemoryFactory.create_factual_memory(
            project_path,
            SQLiteBackend()
        )
        semantic = MemoryFactory.create_semantic_memory(
            project_path,
            ChromaDBBackend(),
            BGEEmbeddings()
        )
        snapshot = SnapshotMemory(project_path)

        return MemoryCore(factual, semantic, snapshot)
```

## Testing Interfaces

```python
class MockMemoryLayer:
    """Mock implementation for testing."""

    def __init__(self) -> None:
        self.entries: dict[str, MemoryEntry] = {}
        self.call_count: dict[str, int] = {}

    def initialize(self, project_path: Path) -> None:
        self.call_count['initialize'] = self.call_count.get('initialize', 0) + 1

    def store(self, entry: MemoryEntry) -> str:
        entry_id = f"mock-{len(self.entries)}"
        self.entries[entry_id] = entry
        return entry_id

    def search(
        self,
        query: str,
        limit: int = 10,
        filters: dict[str, Any] | None = None
    ) -> Sequence[MemoryEntry]:
        # Simple mock search
        return [
            entry for entry in self.entries.values()
            if query.lower() in entry.content.lower()
        ][:limit]
```

## Usage Example

```python
# Production usage
factory = MemoryFactory()
memory = factory.create_memory_core(Path('/project'))

# Store memory
entry_id = memory.remember(
    "Using PostgreSQL for ACID guarantees",
    memory_type="decision",
    tags=["database", "architecture"]
)

# Search memory
results = memory.recall("database choice", limit=5)
for result in results:
    print(f"{result.score:.2f}: {result.entry.content}")

# Testing usage
mock_factual = MockMemoryLayer()
mock_semantic = MockMemoryLayer()
mock_snapshot = MockMemoryLayer()

test_memory = MemoryCore(mock_factual, mock_semantic, mock_snapshot)
test_memory.remember("test", "decision")

assert mock_factual.call_count['store'] == 1
assert mock_semantic.call_count['store'] == 1
```
