"""Factual Memory (L1) - SQLite-based structured memory storage.

Stores factual information with metadata for quick lookup and filtering.
"""

import json
import sqlite3
import time
import uuid
from pathlib import Path
from typing import Any


class FactualMemory:
    """SQLite-based factual memory storage (L1 layer)."""

    def __init__(self, db_path: Path) -> None:
        """Initialize FactualMemory.

        Args:
            db_path: Path to SQLite database file.
        """
        self.db_path = db_path
        self._ensure_database()

    def _ensure_database(self) -> None:
        """Ensure database exists and schema is initialized."""
        # Create directory if it doesn't exist
        self.db_path.parent.mkdir(parents=True, exist_ok=True)

        # Connect and initialize schema
        conn = self._get_connection()
        try:
            schema_path = Path(__file__).parent / "schema.sql"
            with open(schema_path, encoding="utf-8") as f:
                schema_sql = f.read()
            conn.executescript(schema_sql)
            conn.commit()
        finally:
            conn.close()

    def _get_connection(self) -> sqlite3.Connection:
        """Get database connection.

        Returns:
            SQLite connection with row factory configured.
        """
        conn = sqlite3.connect(str(self.db_path))
        conn.row_factory = sqlite3.Row
        return conn

    def create_entry(
        self,
        project_id: str,
        content: str,
        content_type: str,
        file_path: str | None = None,
        line_start: int | None = None,
        line_end: int | None = None,
        commit_sha: str | None = None,
        metadata: dict[str, Any] | None = None,
        tags: list[str] | None = None,
    ) -> str:
        """Create a new memory entry.

        Args:
            project_id: Project identifier.
            content: Memory content.
            content_type: Type of content (decision, bug, architecture, note, etc.).
            file_path: Optional file path associated with this memory.
            line_start: Optional starting line number.
            line_end: Optional ending line number.
            commit_sha: Optional git commit SHA.
            metadata: Optional metadata dictionary.
            tags: Optional list of tags.

        Returns:
            Created memory entry ID.
        """
        entry_id = str(uuid.uuid4())
        timestamp = time.time()

        # Serialize JSON fields
        metadata_json = json.dumps(metadata) if metadata else None
        tags_json = json.dumps(tags) if tags else None

        conn = self._get_connection()
        try:
            conn.execute(
                """
                INSERT INTO memory_entries
                (id, project_id, content, content_type, file_path, line_start, line_end,
                 commit_sha, timestamp, metadata, tags)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    entry_id,
                    project_id,
                    content,
                    content_type,
                    file_path,
                    line_start,
                    line_end,
                    commit_sha,
                    timestamp,
                    metadata_json,
                    tags_json,
                ),
            )
            conn.commit()
        finally:
            conn.close()

        return entry_id

    def get_entry(self, entry_id: str) -> dict[str, Any] | None:
        """Get a memory entry by ID.

        Args:
            entry_id: Memory entry ID.

        Returns:
            Memory entry as dictionary, or None if not found.
        """
        conn = self._get_connection()
        try:
            cursor = conn.execute(
                """
                SELECT * FROM memory_entries WHERE id = ?
                """,
                (entry_id,),
            )
            row = cursor.fetchone()

            if row:
                return self._row_to_dict(row)
            return None
        finally:
            conn.close()

    def query_entries(
        self,
        project_id: str | None = None,
        content_type: str | None = None,
        file_path: str | None = None,
        tags: list[str] | None = None,
        from_timestamp: float | None = None,
        to_timestamp: float | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> list[dict[str, Any]]:
        """Query memory entries with filters.

        Args:
            project_id: Filter by project ID.
            content_type: Filter by content type.
            file_path: Filter by file path.
            tags: Filter by tags (entries must have ALL specified tags).
            from_timestamp: Filter entries after this timestamp.
            to_timestamp: Filter entries before this timestamp.
            limit: Maximum number of results.
            offset: Number of results to skip.

        Returns:
            List of memory entries as dictionaries.
        """
        # Build query
        query = "SELECT * FROM memory_entries WHERE 1=1"
        params: list[Any] = []

        if project_id:
            query += " AND project_id = ?"
            params.append(project_id)

        if content_type:
            query += " AND content_type = ?"
            params.append(content_type)

        if file_path:
            query += " AND file_path = ?"
            params.append(file_path)

        if from_timestamp:
            query += " AND timestamp >= ?"
            params.append(from_timestamp)

        if to_timestamp:
            query += " AND timestamp <= ?"
            params.append(to_timestamp)

        # Tag filtering (simple approach - check if all tags are in the JSON array)
        if tags:
            for tag in tags:
                query += " AND tags LIKE ?"
                params.append(f'%"{tag}"%')

        # Order by timestamp descending
        query += " ORDER BY timestamp DESC LIMIT ? OFFSET ?"
        params.extend([limit, offset])

        conn = self._get_connection()
        try:
            cursor = conn.execute(query, params)
            rows = cursor.fetchall()
            return [self._row_to_dict(row) for row in rows]
        finally:
            conn.close()

    def update_entry(
        self, entry_id: str, updates: dict[str, Any]
    ) -> bool:
        """Update a memory entry.

        Args:
            entry_id: Memory entry ID.
            updates: Dictionary of fields to update.

        Returns:
            True if entry was updated, False if not found.
        """
        # Build update query
        allowed_fields = {
            "content",
            "content_type",
            "file_path",
            "line_start",
            "line_end",
            "commit_sha",
            "metadata",
            "tags",
        }

        # Filter to allowed fields
        updates_filtered = {k: v for k, v in updates.items() if k in allowed_fields}

        if not updates_filtered:
            return False

        # Serialize JSON fields
        if "metadata" in updates_filtered and updates_filtered["metadata"] is not None:
            updates_filtered["metadata"] = json.dumps(updates_filtered["metadata"])
        if "tags" in updates_filtered and updates_filtered["tags"] is not None:
            updates_filtered["tags"] = json.dumps(updates_filtered["tags"])

        # Build SET clause
        set_clause = ", ".join(f"{k} = ?" for k in updates_filtered.keys())
        params = list(updates_filtered.values())
        params.append(entry_id)

        conn = self._get_connection()
        try:
            cursor = conn.execute(
                f"UPDATE memory_entries SET {set_clause} WHERE id = ?", params
            )
            conn.commit()
            return cursor.rowcount > 0
        finally:
            conn.close()

    def delete_entry(self, entry_id: str) -> bool:
        """Delete a memory entry.

        Args:
            entry_id: Memory entry ID.

        Returns:
            True if entry was deleted, False if not found.
        """
        conn = self._get_connection()
        try:
            cursor = conn.execute(
                "DELETE FROM memory_entries WHERE id = ?", (entry_id,)
            )
            conn.commit()
            return cursor.rowcount > 0
        finally:
            conn.close()

    def _row_to_dict(self, row: sqlite3.Row) -> dict[str, Any]:
        """Convert SQLite row to dictionary.

        Args:
            row: SQLite row object.

        Returns:
            Dictionary representation.
        """
        result = dict(row)

        # Deserialize JSON fields
        if result.get("metadata"):
            try:
                result["metadata"] = json.loads(result["metadata"])
            except json.JSONDecodeError:
                result["metadata"] = None

        if result.get("tags"):
            try:
                result["tags"] = json.loads(result["tags"])
            except json.JSONDecodeError:
                result["tags"] = []

        return result

    def get_stats(self, project_id: str) -> dict[str, Any]:
        """Get memory statistics for a project.

        Args:
            project_id: Project identifier.

        Returns:
            Statistics dictionary.
        """
        conn = self._get_connection()
        try:
            # Total entries
            cursor = conn.execute(
                "SELECT COUNT(*) as total FROM memory_entries WHERE project_id = ?",
                (project_id,),
            )
            total = cursor.fetchone()["total"]

            # Entries by type
            cursor = conn.execute(
                """
                SELECT content_type, COUNT(*) as count
                FROM memory_entries
                WHERE project_id = ?
                GROUP BY content_type
                """,
                (project_id,),
            )
            by_type = {row["content_type"]: row["count"] for row in cursor.fetchall()}

            # Recent entries (last 7 days)
            week_ago = time.time() - (7 * 24 * 60 * 60)
            cursor = conn.execute(
                """
                SELECT COUNT(*) as recent
                FROM memory_entries
                WHERE project_id = ? AND timestamp >= ?
                """,
                (project_id, week_ago),
            )
            recent = cursor.fetchone()["recent"]

            return {
                "total_entries": total,
                "by_type": by_type,
                "recent_entries_7d": recent,
            }
        finally:
            conn.close()
