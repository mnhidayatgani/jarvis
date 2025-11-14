"""Snapshot Memory (L3) - File-based code diff storage.

Stores code snapshots and diffs for rollback and history tracking.
"""

import json
import time
import uuid
from pathlib import Path
from typing import Any, Dict, List, Optional


class SnapshotMemory:
    """File-based snapshot memory storage (L3 layer)."""

    def __init__(self, snapshots_dir: Path) -> None:
        """Initialize SnapshotMemory.

        Args:
            snapshots_dir: Directory for storing snapshot files.
        """
        self.snapshots_dir = snapshots_dir
        self.snapshots_dir.mkdir(parents=True, exist_ok=True)

        # Index file for quick lookup
        self.index_file = self.snapshots_dir / "index.json"
        self._ensure_index()

    def _ensure_index(self) -> None:
        """Ensure index file exists."""
        if not self.index_file.exists():
            self._write_index({})

    def _read_index(self) -> Dict[str, Any]:
        """Read snapshot index.

        Returns:
            Index dictionary.
        """
        try:
            with open(self.index_file, "r", encoding="utf-8") as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError):
            return {}

    def _write_index(self, index: Dict[str, Any]) -> None:
        """Write snapshot index.

        Args:
            index: Index dictionary to write.
        """
        try:
            with open(self.index_file, "w", encoding="utf-8") as f:
                json.dump(index, f, indent=2, ensure_ascii=False)
        except IOError as e:
            print(f"Warning: Failed to write snapshot index: {e}")

    def save_snapshot(
        self,
        diff_content: str,
        file_paths: List[str],
        commit_sha: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
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
        except IOError as e:
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

    def load_snapshot(self, snapshot_id: str) -> Optional[Dict[str, Any]]:
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
            with open(snapshot_file, "r", encoding="utf-8") as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError) as e:
            print(f"Warning: Failed to load snapshot {snapshot_id}: {e}")
            return None

    def list_snapshots(
        self,
        from_timestamp: Optional[float] = None,
        to_timestamp: Optional[float] = None,
        file_path: Optional[str] = None,
        commit_sha: Optional[str] = None,
        limit: int = 100,
    ) -> List[Dict[str, Any]]:
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
        except IOError as e:
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

    def get_stats(self) -> Dict[str, Any]:
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
        self, file_paths: List[str], since_timestamp: Optional[float] = None
    ) -> List[Dict[str, Any]]:
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
