"""Core memory system initialization and database management.

Manages SQLite and ChromaDB connections for the 3-layer memory architecture.
"""

from pathlib import Path

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
