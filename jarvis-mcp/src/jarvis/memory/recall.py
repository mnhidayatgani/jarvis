"""Memory recall and query functions.

Handles searching and retrieving memories from the storage systems.
"""

from typing import Any

from sqlalchemy import func, select

from jarvis.memory.core import (
    get_chroma_client,
    get_sqlite_engine,
    semantic_memory,
)


def get_memory_status(project_path: str) -> dict[str, Any]:
    """Get memory system statistics.

    Args:
        project_path: Path to project root

    Returns:
        Dictionary with memory statistics including entry counts,
        disk usage, and last activity
    """
    stats: dict[str, Any] = {
        "total_entries": 0,
        "decisions": 0,
        "notes": 0,
        "last_activity": None,
        "disk_usage_mb": 0.0,
        "collections": {},
    }

    try:
        # Get SQLite stats
        engine = get_sqlite_engine(project_path)
        with engine.connect() as conn:
            # Count total entries
            result = conn.execute(select(func.count()).select_from(semantic_memory))
            stats["total_entries"] = result.scalar() or 0

            # Count by type if column exists
            try:
                # Count decisions
                result = conn.execute(
                    select(func.count())
                    .select_from(semantic_memory)
                    .where(semantic_memory.c.type == "decision")
                )
                stats["decisions"] = result.scalar() or 0

                # Count notes
                result = conn.execute(
                    select(func.count())
                    .select_from(semantic_memory)
                    .where(semantic_memory.c.type == "note")
                )
                stats["notes"] = result.scalar() or 0
            except Exception:
                # Type column might not exist in older schemas
                pass

            # Get last activity
            try:
                result = conn.execute(
                    select(func.max(semantic_memory.c.timestamp)).select_from(
                        semantic_memory
                    )
                )
                last_ts = result.scalar()
                if last_ts:
                    stats["last_activity"] = last_ts
            except Exception:
                pass

        # Get disk usage
        from jarvis.memory.core import get_project_memory_path

        memory_path = get_project_memory_path(project_path)
        db_path = memory_path / "db"
        if db_path.exists():
            total_size = sum(
                f.stat().st_size for f in db_path.rglob("*") if f.is_file()
            )
            stats["disk_usage_mb"] = round(total_size / (1024 * 1024), 2)

        # Get ChromaDB stats
        try:
            client = get_chroma_client(project_path)
            collections = client.list_collections()  # type: ignore[attr-defined]
            for collection in collections:
                col_data = client.get_collection(collection.name)  # type: ignore[attr-defined]
                count = col_data.count()
                stats["collections"][collection.name] = count
        except Exception:
            # ChromaDB might not be initialized
            pass

    except Exception as e:
        # Return partial stats if there's an error
        stats["error"] = str(e)

    return stats


def search_decisions(
    project_path: str,
    query: str,
    type_filter: str | None = None,
    file_filter: str | None = None,
    since: str | None = None,
    limit: int = 10,
) -> dict[str, Any]:
    """Search memories using semantic search.

    Args:
        project_path: Path to project root
        query: Search query string
        type_filter: Optional filter by memory type
        file_filter: Optional filter by file path
        since: Optional filter by date (ISO format)
        limit: Maximum number of results

    Returns:
        Dictionary with search results
    """
    results = []

    try:
        # Get ChromaDB client
        client = get_chroma_client(project_path)
        collection = client.get_or_create_collection("decisions")  # type: ignore[attr-defined]

        # Build filters
        where = {}
        if type_filter:
            where["type"] = type_filter
        if file_filter:
            where["file_path"] = file_filter
        if since:
            # ChromaDB doesn't support date comparison directly
            # We'll filter results after retrieval
            pass

        # Perform semantic search
        search_results = collection.query(
            query_texts=[query], n_results=limit, where=where if where else None
        )

        # Format results
        if search_results and search_results["documents"]:
            for i, doc in enumerate(search_results["documents"][0]):
                metadata = (
                    search_results["metadatas"][0][i]
                    if search_results["metadatas"]
                    else {}
                )
                distance = (
                    search_results["distances"][0][i]
                    if search_results["distances"]
                    else 0.0
                )

                # Convert distance to relevance score (0-1, higher is better)
                relevance = 1.0 - min(distance, 1.0)

                result = {
                    "id": search_results["ids"][0][i],
                    "content": doc,
                    "relevance_score": round(relevance, 3),
                    "type": metadata.get("type"),
                    "timestamp": metadata.get("timestamp"),
                    "file_path": metadata.get("file_path"),
                }

                # Apply date filter if specified
                if since and result["timestamp"]:
                    if result["timestamp"] < since:
                        continue

                results.append(result)

    except Exception as e:
        # Return results with error info
        return {"status": "error", "error": str(e), "results": []}

    return {"status": "success", "results": results[:limit], "total": len(results)}
