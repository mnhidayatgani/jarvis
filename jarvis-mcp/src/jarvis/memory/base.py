"""Base memory layer with common functionality.

Provides abstract base class for all memory storage layers.
"""

from abc import ABC, abstractmethod
from collections.abc import Sequence
from pathlib import Path
from typing import Any

from jarvis.core.types import MemoryEntry


class BaseMemory(ABC):
    """Abstract base class for memory storage layers.

    Implements Template Method pattern with common initialization
    and logging while delegating storage-specific logic to subclasses.
    """

    def __init__(self, storage_path: Path) -> None:
        """Initialize base memory layer.

        Args:
            storage_path: Path to storage location (file, directory, or database).
        """
        self.storage_path = storage_path
        self._initialized = False

    @abstractmethod
    def _ensure_storage(self) -> None:
        """Ensure storage is initialized and ready.

        Subclasses must implement this to create necessary
        databases, directories, or connections.
        """
        ...

    @abstractmethod
    def _store_entry(
        self,
        entry_id: str,
        content: str,
        metadata: dict[str, Any],
    ) -> None:
        """Store entry in underlying storage.

        Args:
            entry_id: Unique identifier for the entry.
            content: Content to store.
            metadata: Associated metadata.
        """
        ...

    @abstractmethod
    def _retrieve_entry(self, entry_id: str) -> dict[str, Any] | None:
        """Retrieve entry from underlying storage.

        Args:
            entry_id: Unique identifier.

        Returns:
            Entry data if found, None otherwise.
        """
        ...

    @abstractmethod
    def _search_entries(
        self,
        query: str,
        limit: int,
        filters: dict[str, Any] | None,
    ) -> list[dict[str, Any]]:
        """Search entries in underlying storage.

        Args:
            query: Search query.
            limit: Maximum results to return.
            filters: Optional filters to apply.

        Returns:
            List of matching entries.
        """
        ...

    @abstractmethod
    def _delete_entry(self, entry_id: str) -> bool:
        """Delete entry from underlying storage.

        Args:
            entry_id: Unique identifier.

        Returns:
            True if deleted, False if not found.
        """
        ...

    @abstractmethod
    def _count_entries(self, filters: dict[str, Any] | None) -> int:
        """Count entries matching filters.

        Args:
            filters: Optional filters to apply.

        Returns:
            Number of matching entries.
        """
        ...

    def initialize(self, project_path: Path) -> None:
        """Initialize memory storage for project.

        Template method that ensures storage is ready and marks
        the layer as initialized.

        Args:
            project_path: Absolute path to project root.
        """
        if not self._initialized:
            self._ensure_storage()
            self._initialized = True

    def is_initialized(self) -> bool:
        """Check if memory layer has been initialized.

        Returns:
            True if initialized, False otherwise.
        """
        return self._initialized

    def get_storage_path(self) -> Path:
        """Get the storage path for this memory layer.

        Returns:
            Path to storage location.
        """
        return self.storage_path

    def validate_entry_data(
        self,
        content: str,
        metadata: dict[str, Any] | None = None,
    ) -> None:
        """Validate entry data before storage.

        Args:
            content: Content to validate.
            metadata: Metadata to validate.

        Raises:
            ValueError: If validation fails.
        """
        if not content or not content.strip():
            raise ValueError("Content cannot be empty")

        if len(content) > 10000:
            raise ValueError("Content exceeds maximum length of 10,000 characters")

        if metadata:
            # Validate metadata doesn't contain overly large values
            for key, value in metadata.items():
                if isinstance(value, str) and len(value) > 1000:
                    raise ValueError(f"Metadata value for '{key}' is too large")

    def store(self, entry: MemoryEntry) -> str:
        """Store memory entry and return generated ID.

        Template method that validates entry, stores it, and returns ID.

        Args:
            entry: Memory entry to store.

        Returns:
            Unique entry ID.

        Raises:
            ValueError: If entry validation fails.
            RuntimeError: If storage fails.
        """
        if not self._initialized:
            raise RuntimeError("Memory layer not initialized. Call initialize() first.")

        # Validate entry
        self.validate_entry_data(entry.content, entry.metadata)

        # Prepare metadata
        metadata = {
            "type": entry.type,
            "tags": entry.tags,
            "file_path": entry.file_path,
            "created_at": entry.created_at.isoformat(),
            "updated_at": entry.updated_at.isoformat(),
            **entry.metadata,
        }

        # Store in subclass-specific storage
        self._store_entry(entry.id, entry.content, metadata)

        return entry.id

    def get_by_id(self, entry_id: str) -> MemoryEntry | None:
        """Retrieve entry by ID.

        Args:
            entry_id: Unique entry identifier.

        Returns:
            Memory entry if found, None otherwise.
        """
        if not self._initialized:
            raise RuntimeError("Memory layer not initialized. Call initialize() first.")

        data = self._retrieve_entry(entry_id)
        if data:
            # Convert dict to MemoryEntry
            # Subclasses may override this conversion
            return self._dict_to_entry(data)
        return None

    def search(
        self,
        query: str,
        limit: int = 10,
        filters: dict[str, Any] | None = None,
    ) -> Sequence[MemoryEntry]:
        """Search for matching entries.

        Args:
            query: Search query.
            limit: Maximum results to return (1-100).
            filters: Optional filters (type, file, date range).

        Returns:
            Matching entries ordered by relevance.
        """
        if not self._initialized:
            raise RuntimeError("Memory layer not initialized. Call initialize() first.")

        # Validate limit
        limit = max(1, min(100, limit))

        # Search in subclass-specific storage
        results = self._search_entries(query, limit, filters)

        # Convert to MemoryEntry objects
        return [self._dict_to_entry(data) for data in results]

    def delete(self, entry_id: str) -> bool:
        """Delete entry by ID.

        Args:
            entry_id: Entry to delete.

        Returns:
            True if deleted, False if not found.
        """
        if not self._initialized:
            raise RuntimeError("Memory layer not initialized. Call initialize() first.")

        return self._delete_entry(entry_id)

    def count(self, filters: dict[str, Any] | None = None) -> int:
        """Count entries matching filters.

        Args:
            filters: Optional filters.

        Returns:
            Number of matching entries.
        """
        if not self._initialized:
            return 0

        return self._count_entries(filters)

    def _dict_to_entry(self, data: dict[str, Any]) -> MemoryEntry:
        """Convert dictionary to MemoryEntry.

        Subclasses can override this for custom conversion logic.

        Args:
            data: Dictionary with entry data.

        Returns:
            MemoryEntry instance.
        """
        from datetime import datetime

        # Extract MemoryEntry fields
        entry_data = {
            "id": data.get("id", ""),
            "content": data.get("content", ""),
            "type": data.get("type", "note"),
            "tags": data.get("tags", []),
            "file_path": data.get("file_path"),
            "created_at": data.get("created_at", datetime.utcnow()),
            "updated_at": data.get("updated_at", datetime.utcnow()),
            "metadata": {
                k: v for k, v in data.items()
                if k not in {"id", "content", "type", "tags", "file_path", "created_at", "updated_at"}
            },
        }

        # Handle datetime conversion if needed
        if isinstance(entry_data["created_at"], str):
            entry_data["created_at"] = datetime.fromisoformat(entry_data["created_at"])
        if isinstance(entry_data["updated_at"], str):
            entry_data["updated_at"] = datetime.fromisoformat(entry_data["updated_at"])

        return MemoryEntry(**entry_data)
