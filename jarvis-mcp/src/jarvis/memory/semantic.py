"""Semantic Memory (L2) - ChromaDB-based vector storage.

Stores content embeddings for semantic search and similarity matching.

Google-style docstrings and complete type hints are provided to
support strict type checking and improve developer ergonomics.
"""

import time
from pathlib import Path
from typing import Any

import chromadb
from chromadb.config import Settings

from jarvis.memory.base import BaseMemory
from jarvis.utils.embeddings import get_embeddings


class SemanticMemory(BaseMemory):
    """ChromaDB-based semantic memory storage (L2 layer)."""

    def __init__(self, persist_directory: Path, project_id: str) -> None:
        """Initialize SemanticMemory.

        Args:
            persist_directory: Directory for ChromaDB persistence.
            project_id: Project identifier for collection naming.
        """
        super().__init__(persist_directory)
        self.persist_directory = persist_directory
        self.project_id = project_id
        self.collection_name = f"jarvis_{project_id[:16]}"  # Limit length
        # These are initialized in _ensure_storage()
        # Use Any for third-party client to avoid stub issues in mypy
        self.client: Any = None
        # chromadb collections are dynamically typed, leave as Any for 3rd-party
        self.collection: Any = None
        self.embeddings: Any = None

        self._ensure_storage()

    def _ensure_storage(self) -> None:
        """Ensure ChromaDB is initialized and ready."""
        # Ensure directory exists
        self.persist_directory.mkdir(parents=True, exist_ok=True)

        # Initialize ChromaDB client
        self.client = chromadb.Client(
            Settings(
                persist_directory=str(self.persist_directory),
                anonymized_telemetry=False,
            )
        )

        # Get or create collection
        self.collection = self.client.get_or_create_collection(
            name=self.collection_name,
            metadata={"project_id": self.project_id},
        )

        # Initialize embeddings
        self.embeddings = get_embeddings()

    def add_semantic_entry(
        self,
        entry_id: str,
        content: str,
        metadata: dict[str, Any] | None = None,
    ) -> None:
        """Add entry to semantic memory.

        Args:
            entry_id (str): Unique identifier for this entry (should match factual layer).
            content (str): Text content to embed and store.
            metadata (dict[str, Any] | None): Optional metadata to store with the entry.
        """
        # Generate embedding
        embedding = self.embeddings.generate_embedding(content)

        # Prepare metadata
        meta = metadata or {}
        meta["timestamp"] = time.time()
        meta["project_id"] = self.project_id

        # Convert all metadata values to strings (ChromaDB requirement)
        meta_str = {k: str(v) for k, v in meta.items()}

        # Add to collection
        self.collection.add(
            ids=[entry_id],
            embeddings=[embedding],
            documents=[content],
            metadatas=[meta_str],
        )

    def search_semantic(
        self,
        query: str,
        n_results: int = 10,
        filters: dict[str, Any] | None = None,
    ) -> list[dict[str, Any]]:
        """Search semantic memory with natural language query.

        Args:
            query (str): Natural language search query.
            n_results (int): Maximum number of results to return.
            filters (dict[str, Any] | None): Optional metadata filters.

        Returns:
            list[dict[str, Any]]: Search results with content, metadata, and similarity scores.
        """
        # Generate query embedding
        query_embedding = self.embeddings.generate_embedding(query)

        # Build where clause from filters
        where_clause = self._build_where_clause(filters) if filters else None

        # Query collection
        results = self.collection.query(
            query_embeddings=[query_embedding],
            n_results=n_results,
            where=where_clause,
            include=["documents", "metadatas", "distances"],
        )

        # Format results
        formatted_results = []
        if results["ids"] and results["ids"][0]:
            for i, entry_id in enumerate(results["ids"][0]):
                formatted_results.append(
                    {
                        "id": entry_id,
                        "content": results["documents"][0][i],
                        "metadata": results["metadatas"][0][i],
                        "distance": results["distances"][0][i],
                        "similarity": 1 - results["distances"][0][i],  # Convert distance to similarity
                    }
                )

        return formatted_results

    def _build_where_clause(self, filters: dict[str, Any]) -> dict[str, Any]:
        """Build ChromaDB where clause from filters.

        Args:
            filters: Filter dictionary.

        Returns:
            ChromaDB where clause.
        """
        where = {}

        # Time-based filtering
        if "from_timestamp" in filters or "to_timestamp" in filters:
            timestamp_filter = {}
            if "from_timestamp" in filters:
                timestamp_filter["$gte"] = str(filters["from_timestamp"])
            if "to_timestamp" in filters:
                timestamp_filter["$lte"] = str(filters["to_timestamp"])
            where["timestamp"] = timestamp_filter

        # File-based filtering
        if "file_path" in filters:
            where["file_path"] = filters["file_path"]

        # Type-based filtering
        if "content_type" in filters:
            where["content_type"] = filters["content_type"]

        # Support other metadata filters - convert all to strings for consistency
        for key, _value in filters.items():
            if key not in ["from_timestamp", "to_timestamp", "file_path", "content_type"]:
                # Type conversion for metadata values
                pass

        return where if where else {}

    def update_entry(
        self,
        entry_id: str,
        content: str | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> bool:
        """Update entry in semantic memory.

        Args:
            entry_id (str): Entry ID to update.
            content (str | None): New content (regenerates embedding if provided).
            metadata (dict[str, Any] | None): New metadata to merge with existing.

        Returns:
            bool: True if entry was updated, False if not found.
        """
        try:
            # Get existing entry
            existing = self.collection.get(ids=[entry_id])

            if not existing["ids"]:
                return False

            # Prepare update
            update_params: dict[str, Any] = {"ids": [entry_id]}

            # Update content and embedding if content provided
            if content is not None:
                embedding = self.embeddings.generate_embedding(content)
                update_params["embeddings"] = [embedding]
                update_params["documents"] = [content]

            # Update metadata if provided
            if metadata is not None:
                # Merge with existing metadata
                existing_meta = existing["metadatas"][0] if existing["metadatas"] else {}
                merged_meta = {**existing_meta, **metadata}
                # Convert to strings
                meta_str = {k: str(v) for k, v in merged_meta.items()}
                update_params["metadatas"] = [meta_str]

            # Update collection
            self.collection.update(**update_params)
            return True

        except Exception:
            return False

    def delete_entry(self, entry_id: str) -> bool:
        """Delete entry from semantic memory.

        Args:
            entry_id: Entry ID to delete.

        Returns:
            True if entry was deleted, False if not found.
        """
        try:
            self.collection.delete(ids=[entry_id])
            return True
        except Exception:
            return False

    def get_entry(self, entry_id: str) -> dict[str, Any] | None:
        """Get entry from semantic memory.

        Args:
            entry_id: Entry ID to retrieve.

        Returns:
            Entry data or None if not found.
        """
        results = self.collection.get(ids=[entry_id], include=["documents", "metadatas"])

        if results["ids"]:
            return {
                "id": results["ids"][0],
                "content": results["documents"][0] if results["documents"] else None,
                "metadata": results["metadatas"][0] if results["metadatas"] else None,
            }

        return None

    def get_stats(self) -> dict[str, Any]:
        """Get semantic memory statistics.

        Returns:
            Statistics dictionary.
        """
        count = self.collection.count()

        return {
            "total_entries": count,
            "collection_name": self.collection_name,
            "project_id": self.project_id,
        }

    def clear(self) -> None:
        """Clear all entries from semantic memory (use with caution!)."""
        # Delete and recreate collection
        if self.client is None:
            return
        self.client.delete_collection(self.collection_name)
        self.collection = self.client.create_collection(
            name=self.collection_name,
            metadata={"project_id": self.project_id},
        )

    # BaseMemory abstract method implementations

    def _store_entry(
        self,
        entry_id: str,
        content: str,
        metadata: dict[str, Any],
    ) -> None:
        """Store entry in ChromaDB with embeddings.

        Args:
            entry_id: Unique identifier for the entry.
            content: Content to store and embed.
            metadata: Associated metadata.
        """
        self.add_semantic_entry(entry_id, content, metadata)

    def _retrieve_entry(self, entry_id: str) -> dict[str, Any] | None:
        """Retrieve entry from ChromaDB.

        Args:
            entry_id: Unique identifier.

        Returns:
            Entry data if found, None otherwise.
        """
        return self.get_entry(entry_id)

    def _search_entries(
        self,
        query: str,
        limit: int,
        filters: dict[str, Any] | None,
    ) -> list[dict[str, Any]]:
        """Search entries using semantic similarity.

        Args:
            query: Search query for semantic matching.
            limit: Maximum results to return.
            filters: Optional filters to apply.

        Returns:
            List of matching entries with similarity scores.
        """
        results = self.search_semantic(query, n_results=limit, filters=filters)

        # Convert to standard format
        return [
            {
                "id": r["id"],
                "content": r["content"],
                "metadata": r.get("metadata", {}),
                "similarity_score": r.get("similarity", 0.0),
            }
            for r in results
        ]

    def _delete_entry(self, entry_id: str) -> bool:
        """Delete entry from ChromaDB.

        Args:
            entry_id: Unique identifier.

        Returns:
            True if deleted, False if not found.
        """
        return self.delete_entry(entry_id)

    def _count_entries(self, filters: dict[str, Any] | None) -> int:
        """Count entries matching filters.

        Args:
            filters: Optional filters to apply.

        Returns:
            Number of matching entries.
        """
        # ChromaDB doesn't support filtered counting easily
        # For now, return total count
        from typing import cast
        if filters:
            # Would need to query and count, expensive; approximate with total
            return cast(int, self.collection.count())
        return cast(int, self.collection.count())
