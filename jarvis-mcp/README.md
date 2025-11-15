# JARVIS MCP Server

MCP (Model Context Protocol) server for JARVIS AI Coding Agent Memory System.

## Overview

This is the backend memory system that provides:

- 3-layer memory architecture (L1/L2/L3)
- Semantic search with ChromaDB
- Factual storage with SQLite
- Code snapshot management
- MCP protocol tools for AI agent integration

## Requirements

- Python 3.10+
- uv (recommended) or pip

## Installation

```bash
# Using uv (recommended)
uv sync

# Or using pip
pip install -e .
```

## Development

```bash
# Install dev dependencies
uv sync --dev

# Run tests
pytest

# Run with coverage
pytest --cov=jarvis --cov-report=html

# Format code
black src tests

# Lint code
ruff check src tests

# Type check
mypy src
```

## Project Structure

```
jarvis-mcp/
├── src/jarvis/
│   ├── memory/       # Memory management (SQLite, ChromaDB, snapshots)
│   ├── mcp/          # MCP server and tools
│   ├── capture/      # Auto-capture (git hooks, file watcher)
│   ├── speckit/      # Spec Kit integration
│   └── utils/        # Utilities (config, persona, embeddings)
└── tests/
    ├── unit/         # Unit tests
    ├── integration/  # Integration tests
    └── e2e/          # End-to-end tests
```

## MCP Tools

The server exposes the following MCP tools:

- `remember_context` - Store information to memory
- `recall_context` - Semantic search and retrieval
- `analyze_codebase` - Scan and analyze projects
- `validate_changes` - Pre-change validation
- `get_architecture` - Retrieve project structure
- `create_checkpoint` - Manual safety checkpoints
- `rollback` - Undo changes

## Configuration

Global config: `~/.jarvis/config.json`  
Project config: `.jarvis/config.json`

## License

MIT
