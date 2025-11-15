"""Test data for memory operations."""

from datetime import datetime

# Sample memory entries as dictionaries
SAMPLE_DECISIONS = [
    {
        "id": "mem-dec-001",
        "content": "Using TypeScript for CLI and Python for MCP server",
        "type": "decision",
        "tags": ["architecture", "language"],
        "created_at": datetime(2025, 11, 15, 10, 0, 0),
    },
    {
        "id": "mem-dec-002",
        "content": "Using SQLite for factual memory storage",
        "type": "decision",
        "tags": ["database", "storage"],
        "created_at": datetime(2025, 11, 15, 11, 0, 0),
    },
]

SAMPLE_NOTES = [
    {
        "id": "mem-note-001",
        "content": "Remember to update documentation after refactor",
        "type": "note",
        "tags": ["todo", "documentation"],
        "created_at": datetime(2025, 11, 15, 12, 0, 0),
    },
]

SAMPLE_CONTEXT = [
    {
        "id": "mem-ctx-001",
        "content": "Project follows speckit workflow for feature development",
        "type": "context",
        "tags": ["workflow", "process"],
        "created_at": datetime(2025, 11, 15, 13, 0, 0),
    },
]

# Search queries and expected results
SEARCH_QUERIES = {
    "database": ["mem-dec-002"],
    "architecture": ["mem-dec-001"],
    "documentation": ["mem-note-001"],
}
