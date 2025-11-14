"""MCP Tools for JARVIS Memory System.

Implements the MCP tool interface for memory operations.
"""

import hashlib
import json
from datetime import datetime
from pathlib import Path
from typing import Any

from jarvis.memory.factual import FactualMemory
from jarvis.memory.semantic import SemanticMemory
from jarvis.utils.config import Configuration
from jarvis.utils.embeddings import EmbeddingsWrapper
from jarvis.utils.persona import JarvisPersona


class MCPTools:
    """MCP Tools implementation for JARVIS memory operations."""

    def __init__(self, project_root: Path) -> None:
        """Initialize MCP tools with project context.

        Args:
            project_root: Path to project root directory.
        """
        self.project_root = project_root
        self.config = Configuration(project_root)
        self.persona = JarvisPersona()
        self.embeddings = EmbeddingsWrapper()

        # Get project ID
        self.project_id = self.config.generate_project_id()

        # Initialize memory systems
        jarvis_dir = project_root / ".jarvis"
        self.factual = FactualMemory(jarvis_dir / "db" / "memory.db")
        self.semantic = SemanticMemory(jarvis_dir / "db" / "chroma", self.project_id)

    def remember_context(
        self,
        content: str,
        type: str = "decision",
        tags: list[str] | None = None,
        file_path: str | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """Store information to JARVIS memory.

        Args:
            content: Content to remember.
            type: Memory type (decision, note, architecture, etc.).
            tags: Optional tags for categorization.
            file_path: Optional file path related to this memory.
            metadata: Optional additional metadata.

        Returns:
            Response with memory_id, timestamp, and confirmation message.
        """
        try:
            # Generate memory ID
            memory_id = self._generate_memory_id(content)

            # Get current timestamp
            timestamp = datetime.utcnow().isoformat()

            # Handle long content chunking
            chunks = self._chunk_content(content)

            # Store in FactualMemory
            self.factual.create_entry(
                project_id=self.project_id,
                content=content,
                content_type=type,
                file_path=file_path,
                metadata={
                    "tags": tags or [],
                    **(metadata or {}),
                },
            )

            # Generate embedding and store in SemanticMemory
            for i, chunk in enumerate(chunks):
                chunk_id = f"{memory_id}_chunk_{i}" if len(chunks) > 1 else memory_id
                chunk_metadata = {
                    "type": type,
                    "file_path": file_path or "",
                    "tags": json.dumps(tags or []),
                    "timestamp": timestamp,
                    "chunk_index": str(i),
                    "total_chunks": str(len(chunks)),
                }
                if metadata:
                    chunk_metadata.update(
                        {k: str(v) for k, v in metadata.items()}
                    )

                self.semantic.add_semantic_entry(
                    entry_id=chunk_id, content=chunk, metadata=chunk_metadata
                )

            # Return success response with JARVIS persona
            return {
                "success": True,
                "memory_id": memory_id,
                "type": type,
                "timestamp": timestamp,
                "chunks": len(chunks),
                "message": self.persona.format_success(
                    f"Memory stored, Sir. {len(chunks)} {'chunk' if len(chunks) == 1 else 'chunks'} indexed."
                ),
            }

        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "message": self.persona.format_error(
                    f"Failed to store memory: {str(e)}"
                ),
            }

    def recall_context(
        self,
        query: str,
        type_filter: str | None = None,
        file_filter: str | None = None,
        since: str | None = None,
        limit: int = 10,
    ) -> dict[str, Any]:
        """Search JARVIS memory semantically.

        Args:
            query: Search query.
            type_filter: Optional filter by memory type.
            file_filter: Optional filter by file path.
            since: Optional filter by timestamp (ISO format).
            limit: Maximum number of results.

        Returns:
            Response with ranked results and relevance scores.
        """
        try:
            # Search semantic memory
            search_results = self.semantic.search_semantic(
                query=query, n_results=limit * 2  # Get more for filtering
            )

            # Apply filters
            filtered_results = []
            for result in search_results:
                metadata = result.get("metadata", {})

                # Type filter
                if type_filter and metadata.get("type") != type_filter:
                    continue

                # File filter
                if file_filter and metadata.get("file_path") != file_filter:
                    continue

                # Time filter
                if since:
                    result_time = metadata.get("timestamp", "")
                    if result_time < since:
                        continue

                filtered_results.append(result)

                if len(filtered_results) >= limit:
                    break

            # Format results
            formatted_results = []
            for result in filtered_results:
                metadata = result.get("metadata", {})
                # Parse tags if they're JSON
                tags = metadata.get("tags", [])
                if isinstance(tags, str):
                    try:
                        tags = json.loads(tags)
                    except json.JSONDecodeError:
                        tags = []

                formatted_results.append(
                    {
                        "content": result.get("content", ""),
                        "type": metadata.get("type"),
                        "file_path": metadata.get("file_path"),
                        "timestamp": metadata.get("timestamp"),
                        "relevance_score": result.get("distance", 1.0),
                        "tags": tags,
                    }
                )

            # Return results with JARVIS persona
            count = len(formatted_results)
            if count > 0:
                message = self.persona.format_success(
                    f"Found {count} {'memory' if count == 1 else 'memories'}, Sir."
                )
            else:
                message = "No memories found matching your query, Sir."

            return {
                "success": True,
                "query": query,
                "count": count,
                "results": formatted_results,
                "message": message,
            }

        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "message": self.persona.format_error(
                    f"Failed to recall memory: {str(e)}"
                ),
            }

    def _generate_memory_id(self, content: str) -> str:
        """Generate unique memory ID from content and timestamp.

        Args:
            content: Memory content.

        Returns:
            SHA256 hash as memory ID.
        """
        timestamp = datetime.utcnow().isoformat()
        data = f"{content}_{timestamp}"
        return hashlib.sha256(data.encode("utf-8")).hexdigest()

    def _chunk_content(self, content: str, max_words: int = 1000) -> list[str]:
        """Chunk long content for efficient embedding.

        Args:
            content: Content to chunk.
            max_words: Maximum words per chunk.

        Returns:
            List of content chunks.
        """
        words = content.split()

        if len(words) <= max_words:
            return [content]

        chunks = []
        for i in range(0, len(words), max_words):
            chunk_words = words[i : i + max_words]
            chunks.append(" ".join(chunk_words))

        return chunks


def get_mcp_tools(project_root: Path) -> MCPTools:
    """Get MCP tools instance for a project.

    Args:
        project_root: Path to project root.

    Returns:
        MCPTools instance.
    """
    return MCPTools(project_root)
