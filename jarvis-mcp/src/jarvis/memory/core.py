"""Core memory system initialization and database management.

Manages SQLite and ChromaDB connections for the 3-layer memory architecture.
Provides MemoryCore class to orchestrate all memory layers.
"""

import uuid
from datetime import datetime
from pathlib import Path
from typing import Any

import chromadb
from sqlalchemy import (
    Column,
    Integer,
    MetaData,
    String,
    Table,
    create_engine,
)
from sqlalchemy.engine import Engine

from jarvis.core.types import MemoryEntry, SearchResult
from jarvis.memory.base import BaseMemory


def get_project_memory_path(project_path: str) -> Path:
    """Get the .jarvis directory path for a project.

    Args:
        project_path: Path to project root

    Returns:
        Path to .jarvis directory
    """
    return Path(project_path) / ".jarvis"


def get_sqlite_engine(project_path: str) -> Engine:
    """Create and return SQLAlchemy engine for project memory database.

    Args:
        project_path: Path to project root

    Returns:
        SQLAlchemy engine for memory.db
    """
    memory_path = get_project_memory_path(project_path)
    db_path = memory_path / "db" / "memory.db"

    # Ensure db directory exists
    db_path.parent.mkdir(parents=True, exist_ok=True)

    # Create engine with SQLite
    engine = create_engine(f"sqlite:///{db_path}", echo=False)
    return engine


def get_chroma_client(project_path: str) -> chromadb.PersistentClient:  # type: ignore[valid-type]
    """Create and return ChromaDB persistent client for semantic memory.

    Args:
        project_path: Path to project root

    Returns:
        ChromaDB persistent client
    """
    memory_path = get_project_memory_path(project_path)
    chroma_path = memory_path / "db" / "chroma"

    # Ensure chroma directory exists
    chroma_path.mkdir(parents=True, exist_ok=True)

    # Create persistent client
    client = chromadb.PersistentClient(path=str(chroma_path))
    return client


# Define metadata and tables
metadata_obj = MetaData()

# Factual memory table (key-value facts)
factual_memory = Table(
    "facts",
    metadata_obj,
    Column("key", String, primary_key=True),
    Column("value", String),
)

# Semantic memory table (decisions with timestamps)
semantic_memory = Table(
    "decisions",
    metadata_obj,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("content", String, nullable=False),
    Column("timestamp", String, nullable=False),
)


def initialize_databases(project_path: str) -> None:
    """Initialize SQLite and ChromaDB databases for a project.

    Creates tables in SQLite and ensures ChromaDB collection exists.

    Args:
        project_path: Path to project root
    """
    # Initialize SQLite
    engine = get_sqlite_engine(project_path)
    metadata_obj.create_all(engine)

    # Initialize ChromaDB
    client = get_chroma_client(project_path)

    # Ensure decisions collection exists
    try:
        client.get_or_create_collection(  # type: ignore[attr-defined]
            name="decisions",
            metadata={"description": "Semantic memory for project decisions"},
        )
    except Exception:
        # Collection might already exist
        pass


class MemoryCore:
    """Orchestrates all memory layers (Factual, Semantic, Snapshot).

    Coordinates storage and retrieval across the three-layer memory architecture
    using BaseMemory instances for consistent interface.
    """

    def __init__(
        self,
        factual: BaseMemory,
        semantic: BaseMemory,
        snapshot: BaseMemory,
    ) -> None:
        """Initialize MemoryCore with memory layer instances.

        Args:
            factual: FactualMemory instance (L1 - SQLite)
            semantic: SemanticMemory instance (L2 - ChromaDB)
            snapshot: SnapshotMemory instance (L3 - Filesystem)
        """
        self.factual = factual
        self.semantic = semantic
        self.snapshot = snapshot
        self._initialized = False

    def initialize(self, project_path: Path) -> None:
        """Initialize all memory layers for a project.

        Args:
            project_path: Absolute path to project root.
        """
        if not self._initialized:
            # Initialize all layers using BaseMemory interface
            self.factual.initialize(project_path)
            self.semantic.initialize(project_path)
            self.snapshot.initialize(project_path)
            self._initialized = True

    def is_initialized(self) -> bool:
        """Check if all memory layers are initialized.

        Returns:
            True if all layers are initialized, False otherwise.
        """
        return (
            self._initialized
            and self.factual.is_initialized()
            and self.semantic.is_initialized()
            and self.snapshot.is_initialized()
        )

    def remember(
        self,
        content: str,
        memory_type: str = "decision",
        tags: list[str] | None = None,
        file_path: str | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> str:
        """Store memory entry across factual and semantic layers.

        Stores the entry in both factual (L1) and semantic (L2) layers
        for comprehensive retrieval. Snapshot layer is used separately
        for code diffs.

        Args:
            content: Content to remember.
            memory_type: Type of memory (decision, note, context).
            tags: Optional tags for categorization.
            file_path: Optional file path association.
            metadata: Optional additional metadata.

        Returns:
            Entry ID (same across both layers).

        Raises:
            RuntimeError: If memory layers are not initialized.
            ValueError: If content validation fails.
        """
        if not self.is_initialized():
            raise RuntimeError(
                "MemoryCore not initialized. Call initialize() first."
            )

        # Generate consistent entry ID
        entry_id = str(uuid.uuid4())
        now = datetime.utcnow()

        # Create MemoryEntry
        entry = MemoryEntry(
            id=entry_id,
            content=content,
            type=memory_type,  # type: ignore[arg-type]
            tags=tags or [],
            file_path=file_path,
            created_at=now,
            updated_at=now,
            metadata=metadata or {},
        )

        # Store in both factual and semantic layers using BaseMemory interface
        self.factual.store(entry)
        self.semantic.store(entry)

        return entry_id

    def recall(
        self,
        query: str,
        limit: int = 10,
        memory_type: str | None = None,
        filters: dict[str, Any] | None = None,
    ) -> list[SearchResult]:
        """Search across all memory layers and merge results.

        Searches both factual (keyword) and semantic (vector similarity)
        layers, then merges and ranks results by relevance.

        Args:
            query: Search query.
            limit: Maximum results to return.
            memory_type: Optional type filter.
            filters: Optional additional filters.

        Returns:
            List of SearchResult objects sorted by relevance score.

        Raises:
            RuntimeError: If memory layers are not initialized.
        """
        if not self.is_initialized():
            raise RuntimeError(
                "MemoryCore not initialized. Call initialize() first."
            )

        # Build filters
        search_filters = filters or {}
        if memory_type:
            search_filters["type"] = memory_type

        # Search both layers using BaseMemory interface
        factual_results = list(self.factual.search(query, limit=limit, filters=search_filters))
        semantic_results = list(self.semantic.search(query, limit=limit, filters=search_filters))

        # Merge results and create SearchResult objects
        # Use a dict to deduplicate by entry ID
        merged: dict[str, SearchResult] = {}

        # Add factual results with keyword match score
        for entry in factual_results:
            # Simple keyword matching score
            score = 0.5 if query.lower() in entry.content.lower() else 0.3
            merged[entry.id] = SearchResult(entry=entry, score=score)

        # Add semantic results with similarity scores
        # SemanticMemory returns entries with similarity in metadata
        for entry in semantic_results:
            # Extract similarity from metadata if available
            similarity = entry.metadata.get("similarity_score", 0.7)
            if entry.id in merged:
                # Use higher score if entry appears in both
                existing = merged[entry.id]
                merged[entry.id] = SearchResult(
                    entry=entry,
                    score=max(existing.score, similarity),
                )
            else:
                merged[entry.id] = SearchResult(entry=entry, score=similarity)

        # Sort by score descending and limit
        results = sorted(merged.values(), key=lambda r: r.score, reverse=True)
        return results[:limit]

    def get_statistics(self) -> dict[str, Any]:
        """Get memory statistics across all layers.

        Returns:
            Dictionary with statistics for each layer.

        Raises:
            RuntimeError: If memory layers are not initialized.
        """
        if not self.is_initialized():
            raise RuntimeError(
                "MemoryCore not initialized. Call initialize() first."
            )

        # Get counts from each layer using BaseMemory interface
        factual_count = self.factual.count()
        semantic_count = self.semantic.count()
        snapshot_count = self.snapshot.count()

        return {
            "factual": {
                "total_entries": factual_count,
                "layer": "L1",
                "storage": "SQLite",
            },
            "semantic": {
                "total_entries": semantic_count,
                "layer": "L2",
                "storage": "ChromaDB",
            },
            "snapshot": {
                "total_entries": snapshot_count,
                "layer": "L3",
                "storage": "Filesystem",
            },
            "total": factual_count + semantic_count + snapshot_count,
        }

    def get_by_id(self, entry_id: str) -> MemoryEntry | None:
        """Retrieve entry by ID from factual layer.

        Args:
            entry_id: Entry identifier.

        Returns:
            MemoryEntry if found, None otherwise.
        """
        if not self.is_initialized():
            raise RuntimeError(
                "MemoryCore not initialized. Call initialize() first."
            )

        # Try factual first (primary storage)
        entry = self.factual.get_by_id(entry_id)
        if entry:
            return entry

        # Fallback to semantic
        return self.semantic.get_by_id(entry_id)

    def delete(self, entry_id: str) -> bool:
        """Delete entry from all layers.

        Args:
            entry_id: Entry identifier.

        Returns:
            True if deleted from at least one layer, False otherwise.
        """
        if not self.is_initialized():
            raise RuntimeError(
                "MemoryCore not initialized. Call initialize() first."
            )

        # Delete from all layers using BaseMemory interface
        factual_deleted = self.factual.delete(entry_id)
        semantic_deleted = self.semantic.delete(entry_id)
        snapshot_deleted = self.snapshot.delete(entry_id)

        return factual_deleted or semantic_deleted or snapshot_deleted
