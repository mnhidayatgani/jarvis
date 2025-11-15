"""Memory layer interfaces using Protocol for structural typing."""

from collections.abc import Sequence
from pathlib import Path
from typing import Any, Protocol


class IMemoryLayer(Protocol):
    """Base protocol for all memory storage layers."""

    def initialize(self, project_path: Path) -> None:
        """Initialize memory storage for project."""
        ...

    def store(self, entry: "MemoryEntry") -> str:
        """Store memory entry and return generated ID."""
        ...

    def search(
        self,
        query: str,
        limit: int = 10,
        filters: dict[str, Any] | None = None,
    ) -> Sequence["MemoryEntry"]:
        """Search for matching entries."""
        ...

    def get_by_id(self, entry_id: str) -> "MemoryEntry | None":
        """Retrieve entry by ID."""
        ...

    def delete(self, entry_id: str) -> bool:
        """Delete entry by ID."""
        ...

    def count(self, filters: dict[str, Any] | None = None) -> int:
        """Count entries matching filters."""
        ...


class IStorageBackend(Protocol):
    """Generic storage backend interface."""

    def connect(self, connection_string: str) -> None:
        """Establish connection to storage."""
        ...

    def disconnect(self) -> None:
        """Close connection to storage."""
        ...

    def execute_query(
        self, query: str, parameters: tuple[Any, ...] | None = None
    ) -> Sequence[dict[str, Any]]:
        """Execute query and return results."""
        ...

    def is_healthy(self) -> bool:
        """Check if storage backend is healthy."""
        ...


class IEmbeddingsProvider(Protocol):
    """Interface for text embedding generation."""

    def encode(self, text: str) -> list[float]:
        """Generate embedding vector for text."""
        ...

    def encode_batch(self, texts: Sequence[str]) -> list[list[float]]:
        """Generate embeddings for multiple texts."""
        ...

    def get_dimension(self) -> int:
        """Get embedding dimension size."""
        ...


# Forward reference for type checking
from jarvis.core.types import MemoryEntry  # noqa: E402

__all__ = ["IMemoryLayer", "IStorageBackend", "IEmbeddingsProvider"]
