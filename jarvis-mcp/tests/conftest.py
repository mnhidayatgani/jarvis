"""Pytest fixtures for JARVIS tests."""

import tempfile
from pathlib import Path
from typing import Generator
from unittest.mock import Mock

import pytest

from jarvis.core.types import MemoryEntry
from jarvis.memory.interfaces import IStorageBackend


@pytest.fixture
def temp_project_dir() -> Generator[Path, None, None]:
    """Create temporary project directory."""
    with tempfile.TemporaryDirectory() as tmpdir:
        project_path = Path(tmpdir)
        # Create .jarvis directory
        (project_path / ".jarvis").mkdir()
        (project_path / ".jarvis" / "config.json").write_text("{}")
        yield project_path


@pytest.fixture
def mock_storage_backend() -> Mock:
    """Create mock storage backend."""
    mock = Mock(spec=IStorageBackend)
    mock.is_healthy.return_value = True
    mock.execute_query.return_value = []
    return mock


@pytest.fixture
def sample_memory_entry() -> MemoryEntry:
    """Create sample memory entry."""
    return MemoryEntry(
        id="mem-test-123",
        content="Using PostgreSQL for database",
        type="decision",
        tags=["database", "architecture"],
        file_path="docs/architecture.md",
    )


@pytest.fixture
def sample_memory_entries() -> list[MemoryEntry]:
    """Create list of sample memory entries."""
    return [
        MemoryEntry(
            id="mem-1",
            content="Using PostgreSQL for database",
            type="decision",
            tags=["database"],
        ),
        MemoryEntry(
            id="mem-2",
            content="API endpoint: POST /api/remember",
            type="note",
            tags=["api"],
        ),
        MemoryEntry(
            id="mem-3",
            content="Performance optimization: use indexing",
            type="context",
            tags=["performance"],
        ),
    ]
