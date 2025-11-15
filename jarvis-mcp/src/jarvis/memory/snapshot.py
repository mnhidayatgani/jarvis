"""Snapshot Memory (L3) - File-based code diff storage.

Stores code snapshots and diffs for rollback and history tracking.
"""

import json
import time
import uuid
from pathlib import Path
from typing import Any

from jarvis.memory.base import BaseMemory


class SnapshotMemory(BaseMemory):
    """File-based snapshot memory storage (L3 layer)."""

    def __init__(self, snapshots_dir: Path) -> None:
        """Initialize SnapshotMemory.

        Args:
            snapshots_dir: Directory for storing snapshot files.
        """
        super().__init__(snapshots_dir)
        self.snapshots_dir = snapshots_dir
        
        # Index file for quick lookup
        self.index_file = self.snapshots_dir / "index.json"
        
        self._ensure_storage()

    def _ensure_storage(self) -> None:
        """Ensure snapshot directory and index exist."""
        self.snapshots_dir.mkdir(parents=True, exist_ok=True)
        self._ensure_index()

    def _ensure_index(self) -> None:
        """Ensure index file exists."""
        if not self.index_file.exists():
            self._write_index({})

    def _read_index(self) -> dict[str, Any]:
        """Read snapshot index.

        Returns:
            Index dictionary.
        """
        try:
            with open(self.index_file, encoding="utf-8") as f:
                return json.load(f)
        except (OSError, json.JSONDecodeError):
            return {}

    def _write_index(self, index: dict[str, Any]) -> None:
        """Write snapshot index.

        Args:
            index: Index dictionary to write.
        """
        try:
            with open(self.index_file, "w", encoding="utf-8") as f:
                json.dump(index, f, indent=2, ensure_ascii=False)
        except OSError as e:
            print(f"Warning: Failed to write snapshot index: {e}")

    def save_snapshot(
        self,
        diff_content: str,
        file_paths: list[str],
        commit_sha: str | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> str:
        """Save a code snapshot.

        Args:
            diff_content: Git diff or code snapshot content.
            file_paths: List of files affected.
            commit_sha: Optional git commit SHA.
            metadata: Optional metadata.

        Returns:
            Snapshot ID.
        """
        snapshot_id = str(uuid.uuid4())
        timestamp = time.time()

        # Prepare snapshot data
        snapshot_data = {
            "id": snapshot_id,
            "timestamp": timestamp,
            "diff_content": diff_content,
            "file_paths": file_paths,
            "commit_sha": commit_sha,
            "metadata": metadata or {},
        }

        # Save snapshot file
        snapshot_file = self.snapshots_dir / f"{snapshot_id}.json"
        try:
            with open(snapshot_file, "w", encoding="utf-8") as f:
                json.dump(snapshot_data, f, indent=2, ensure_ascii=False)
        except OSError as e:
            print(f"Warning: Failed to save snapshot {snapshot_id}: {e}")
            return snapshot_id

        # Update index
        index = self._read_index()
        index[snapshot_id] = {
            "timestamp": timestamp,
            "file_paths": file_paths,
            "commit_sha": commit_sha,
            "file": f"{snapshot_id}.json",
        }
        self._write_index(index)

        return snapshot_id

    def load_snapshot(self, snapshot_id: str) -> dict[str, Any] | None:
        """Load a code snapshot.

        Args:
            snapshot_id: Snapshot identifier.

        Returns:
            Snapshot data or None if not found.
        """
        snapshot_file = self.snapshots_dir / f"{snapshot_id}.json"

        if not snapshot_file.exists():
            return None

        try:
            with open(snapshot_file, encoding="utf-8") as f:
                return json.load(f)
        except (OSError, json.JSONDecodeError) as e:
            print(f"Warning: Failed to load snapshot {snapshot_id}: {e}")
            return None

    def list_snapshots(
        self,
        from_timestamp: float | None = None,
        to_timestamp: float | None = None,
        file_path: str | None = None,
        commit_sha: str | None = None,
        limit: int = 100,
    ) -> list[dict[str, Any]]:
        """List snapshots with optional filters.

        Args:
            from_timestamp: Filter snapshots after this timestamp.
            to_timestamp: Filter snapshots before this timestamp.
            file_path: Filter snapshots affecting this file.
            commit_sha: Filter snapshots with this commit SHA.
            limit: Maximum number of results.

        Returns:
            List of snapshot metadata.
        """
        index = self._read_index()
        results = []

        for snapshot_id, meta in index.items():
            # Apply filters
            if from_timestamp and meta["timestamp"] < from_timestamp:
                continue
            if to_timestamp and meta["timestamp"] > to_timestamp:
                continue
            if file_path and file_path not in meta.get("file_paths", []):
                continue
            if commit_sha and meta.get("commit_sha") != commit_sha:
                continue

            results.append({"id": snapshot_id, **meta})

            if len(results) >= limit:
                break

        # Sort by timestamp descending
        results.sort(key=lambda x: x["timestamp"], reverse=True)

        return results

    def delete_snapshot(self, snapshot_id: str) -> bool:
        """Delete a snapshot.

        Args:
            snapshot_id: Snapshot identifier.

        Returns:
            True if deleted, False if not found.
        """
        snapshot_file = self.snapshots_dir / f"{snapshot_id}.json"

        if not snapshot_file.exists():
            return False

        try:
            # Delete file
            snapshot_file.unlink()

            # Update index
            index = self._read_index()
            if snapshot_id in index:
                del index[snapshot_id]
                self._write_index(index)

            return True
        except OSError as e:
            print(f"Warning: Failed to delete snapshot {snapshot_id}: {e}")
            return False

    def cleanup_old_snapshots(self, days: int = 30) -> int:
        """Delete snapshots older than specified days.

        Args:
            days: Number of days to keep snapshots.

        Returns:
            Number of snapshots deleted.
        """
        cutoff_time = time.time() - (days * 24 * 60 * 60)
        index = self._read_index()
        deleted_count = 0

        for snapshot_id, meta in list(index.items()):
            if meta["timestamp"] < cutoff_time:
                if self.delete_snapshot(snapshot_id):
                    deleted_count += 1

        return deleted_count

    def get_stats(self) -> dict[str, Any]:
        """Get snapshot memory statistics.

        Returns:
            Statistics dictionary.
        """
        index = self._read_index()

        if not index:
            return {
                "total_snapshots": 0,
                "oldest_snapshot": None,
                "newest_snapshot": None,
                "total_size_bytes": 0,
            }

        timestamps = [meta["timestamp"] for meta in index.values()]

        # Calculate total size
        total_size = 0
        for snapshot_id in index.keys():
            snapshot_file = self.snapshots_dir / f"{snapshot_id}.json"
            if snapshot_file.exists():
                total_size += snapshot_file.stat().st_size

        return {
            "total_snapshots": len(index),
            "oldest_snapshot": min(timestamps) if timestamps else None,
            "newest_snapshot": max(timestamps) if timestamps else None,
            "total_size_bytes": total_size,
        }

    def get_diff_for_files(
        self, file_paths: list[str], since_timestamp: float | None = None
    ) -> list[dict[str, Any]]:
        """Get all diffs affecting specified files.

        Args:
            file_paths: List of file paths to check.
            since_timestamp: Optional timestamp to filter from.

        Returns:
            List of snapshots affecting these files.
        """
        index = self._read_index()
        results = []

        for snapshot_id, meta in index.items():
            # Check if any of the file paths match
            affected_files = meta.get("file_paths", [])
            if any(fp in affected_files for fp in file_paths):
                # Apply timestamp filter
                if since_timestamp and meta["timestamp"] < since_timestamp:
                    continue

                results.append({"id": snapshot_id, **meta})

        # Sort by timestamp descending
        results.sort(key=lambda x: x["timestamp"], reverse=True)

        return results

    # BaseMemory abstract method implementations
    
    def _store_entry(
        self,
        entry_id: str,
        content: str,
        metadata: dict[str, Any],
    ) -> None:
        """Store entry as snapshot file.
        
        Args:
            entry_id: Unique identifier for the entry.
            content: Snapshot content (e.g., diff).
            metadata: Associated metadata including file_paths, commit_sha.
        """
        timestamp = time.time()
        
        # Extract file-specific metadata
        file_paths = metadata.get("file_paths", [])
        commit_sha = metadata.get("commit_sha")
        
        # Prepare snapshot data
        snapshot_data = {
            "id": entry_id,
            "timestamp": timestamp,
            "diff_content": content,
            "file_paths": file_paths,
            "commit_sha": commit_sha,
            "metadata": metadata,
        }

        # Save snapshot file
        snapshot_file = self.snapshots_dir / f"{entry_id}.json"
        with open(snapshot_file, "w", encoding="utf-8") as f:
            json.dump(snapshot_data, f, indent=2, ensure_ascii=False)

        # Update index
        index = self._read_index()
        index[entry_id] = {
            "timestamp": timestamp,
            "file_paths": file_paths,
            "commit_sha": commit_sha,
            "file": f"{entry_id}.json",
        }
        self._write_index(index)

    def _retrieve_entry(self, entry_id: str) -> dict[str, Any] | None:
        """Retrieve entry from snapshot file.
        
        Args:
            entry_id: Unique identifier.
            
        Returns:
            Entry data if found, None otherwise.
        """
        return self.load_snapshot(entry_id)

    def _search_entries(
        self,
        query: str,
        limit: int,
        filters: dict[str, Any] | None,
    ) -> list[dict[str, Any]]:
        """Search snapshot entries.
        
        Args:
            query: Search query (searches diff content).
            limit: Maximum results to return.
            filters: Optional filters (file_path, commit_sha, timestamps).
            
        Returns:
            List of matching snapshots.
        """
        # Extract filter parameters
        from_timestamp = filters.get("from_timestamp") if filters else None
        to_timestamp = filters.get("to_timestamp") if filters else None
        file_path = filters.get("file_path") if filters else None
        commit_sha = filters.get("commit_sha") if filters else None
        
        # List snapshots with filters
        snapshots = self.list_snapshots(
            from_timestamp=from_timestamp,
            to_timestamp=to_timestamp,
            file_path=file_path,
            commit_sha=commit_sha,
            limit=limit,
        )
        
        # If query provided, filter by content
        if query:
            filtered = []
            for snapshot_meta in snapshots:
                snapshot_data = self.load_snapshot(snapshot_meta["id"])
                if snapshot_data and query.lower() in snapshot_data.get("diff_content", "").lower():
                    filtered.append(snapshot_data)
            return filtered[:limit]
        
        # Load full snapshot data
        results = []
        for snapshot_meta in snapshots:
            snapshot_data = self.load_snapshot(snapshot_meta["id"])
            if snapshot_data:
                results.append(snapshot_data)
        
        return results[:limit]

    def _delete_entry(self, entry_id: str) -> bool:
        """Delete snapshot entry.
        
        Args:
            entry_id: Unique identifier.
            
        Returns:
            True if deleted, False if not found.
        """
        return self.delete_snapshot(entry_id)

    def _count_entries(self, filters: dict[str, Any] | None) -> int:
        """Count snapshot entries matching filters.
        
        Args:
            filters: Optional filters to apply.
            
        Returns:
            Number of matching entries.
        """
        if not filters:
            # Return total count
            index = self._read_index()
            return len(index)
        
        # Apply filters and count
        from_timestamp = filters.get("from_timestamp")
        to_timestamp = filters.get("to_timestamp")
        file_path = filters.get("file_path")
        commit_sha = filters.get("commit_sha")
        
        snapshots = self.list_snapshots(
            from_timestamp=from_timestamp,
            to_timestamp=to_timestamp,
            file_path=file_path,
            commit_sha=commit_sha,
            limit=10000,  # High limit for counting
        )
        
        return len(snapshots)
