# JARVIS CLI

Command-line interface for JARVIS AI Coding Agent Memory System.

## Overview

JARVIS is an intelligent AI coding agent that remembers your decisions, automatically captures code changes, and helps you maintain context across your entire development journey. It features:

- **Intelligent Memory System**: Dual-storage (factual + semantic) for decisions, notes, and code changes
- **Auto-Capture**: Automatic git hook integration for seamless change tracking
- **Safety System**: Checkpoint and rollback capabilities for risk-free experimentation
- **Validation**: Built-in code quality and test validation
- **MCP Integration**: Model Context Protocol server for AI agent access

## Features

### Core Memory

- **Project Initialization** (`jarvis init`) - Set up JARVIS in your project
- **Manual Memory Capture** (`jarvis remember`) - Store important decisions and notes
- **Context Retrieval** (`jarvis recall`) - Search and retrieve past decisions
- **Project Scanning** (`jarvis scan`) - Analyze codebase and tech stack

### Monitoring

- **Status Command** (`jarvis status`) - View memory statistics and system health
- **Doctor Command** (`jarvis doctor`) - Comprehensive system diagnostics

### Auto-Capture

- **Git Hook Integration** - Automatic capture of commits and code changes
- **Silent Operation** - Non-blocking background process

### Safety System

- **Checkpoints** (`jarvis checkpoint`) - Create safe restore points
- **Rollback** (`jarvis rollback`) - Restore previous states
- **Auto-Save** - Prevents data loss before dangerous operations

### Validation

- **Code Quality** (`jarvis validate`) - Run linters, type checkers, and tests
- **Multi-Language** - Supports Python, TypeScript, and JavaScript

### Management

- **Configuration** (`jarvis config`) - Customize JARVIS behavior
- **Cleanup** (`jarvis cleanup`) - Manage memory and remove old data

## Requirements

- Node.js 18+
- npm or pnpm
- Python 3.9+ (for MCP server)
- Git (for auto-capture and checkpoints)

## Installation

```bash
# Install dependencies
npm install

# Build
npm run build

# Link for global use (optional)
npm link

# Install Python dependencies (for MCP server)
cd ../jarvis-mcp
uv sync
```

## Quick Start

```bash
# 1. Initialize JARVIS in your project
jarvis init

# 2. Remember important decisions
jarvis remember "Using PostgreSQL instead of MongoDB for better ACID guarantees"

# 3. Create a checkpoint before risky changes
jarvis checkpoint "before refactoring auth system"

# 4. Make your changes...

# 5. Validate your changes
jarvis validate

# 6. If something goes wrong, rollback
jarvis rollback

# 7. Search your memory
jarvis recall "database choice"

# 8. Check system status
jarvis status
```

## Commands

### `jarvis init`

Initialize JARVIS memory system in the current project.

```bash
jarvis init [options]

Options:
  --force, -f     Reinitialize even if already initialized
  --json          Output in JSON format
```

**Example:**

```bash
$ jarvis init
✅ JARVIS initialized, Sir.
   Databases created at .jarvis/
   Git hooks installed
```

---

### `jarvis remember <content>`

Store important information, decisions, or notes.

```bash
jarvis remember <content> [options]

Options:
  --type TYPE     Type: decision, note, or context (default: decision)
  --tags TAG      Comma-separated tags
  --file PATH     Associated file path
  --json          Output in JSON format
```

**Examples:**

```bash
# Store a decision
jarvis remember "Chose React over Vue for better TypeScript support"

# Store with tags
jarvis remember "API rate limit is 100 req/min" --tags api,limits

# Store with file association
jarvis remember "Use factory pattern here" --file src/auth/factory.ts
```

---

### `jarvis recall <query>`

Search and retrieve stored memories.

```bash
jarvis recall <query> [options]

Options:
  --limit N       Max results to return (default: 5)
  --type TYPE     Filter by type: decision, note, context
  --after DATE    Only show memories after date (YYYY-MM-DD)
  --json          Output in JSON format
```

**Examples:**

```bash
# Search memories
jarvis recall "database"

# Limit results
jarvis recall "api" --limit 10

# Filter by type
jarvis recall "architecture" --type decision

# Date filter
jarvis recall "changes" --after 2025-11-01
```

---

### `jarvis scan`

Analyze project structure and tech stack.

```bash
jarvis scan [options]

Options:
  --save          Save scan results to memory
  --json          Output in JSON format
```

**Example:**

```bash
$ jarvis scan --save
🔍 Scanning project, Sir...

Tech Stack Detected:
  - TypeScript (Node.js)
  - Python 3.11
  - Git repository

✅ Scan complete: 125 files analyzed
```

---

### `jarvis checkpoint <reason>`

Create a safety checkpoint using git stash.

```bash
jarvis checkpoint <reason> [options]
jarvis checkpoint --list
jarvis checkpoint --preview=<id>

Options:
  --list, -l           List all checkpoints
  --preview=ID         Preview checkpoint changes
  --validate, -v       Run validation after checkpoint
  --json               Output in JSON format
```

**Examples:**

```bash
# Create checkpoint
jarvis checkpoint "before refactoring auth"

# Create checkpoint with validation
jarvis checkpoint "before deploy" --validate

# List checkpoints
jarvis checkpoint --list

# Preview checkpoint
jarvis checkpoint --preview=stash@{0}
```

---

### `jarvis rollback [checkpoint_id]`

Restore a previous checkpoint.

```bash
jarvis rollback [checkpoint_id] [options]

Options:
  --keep, -k      Keep checkpoint after restoring
  --json          Output in JSON format
```

**Examples:**

```bash
# Rollback to latest checkpoint
jarvis rollback

# Rollback to specific checkpoint
jarvis rollback stash@{1}

# Rollback but keep checkpoint
jarvis rollback --keep
```

---

### `jarvis validate`

Run code quality checks and tests.

```bash
jarvis validate [options]

Options:
  --verbose, -v   Show detailed output
  --json          Output in JSON format
```

**Validates:**

- **Python**: ruff, mypy, pytest
- **TypeScript**: eslint, tsc, vitest/jest

**Example:**

```bash
$ jarvis validate
🔍 Running validation checks, Sir...

✅ All validation checks passed, Sir. 3/3 checks successful in 2.5s.

Check Results:
  ✅ ruff (0.50s)
  ✅ pytest (1.50s)
  ✅ mypy (0.50s)

Total: 3/3 passed in 2.5s
```

---

### `jarvis status`

View memory statistics and system status.

```bash
jarvis status [options]

Options:
  --verbose, -v   Show detailed statistics
  --json          Output in JSON format
```

**Example:**

```bash
$ jarvis status

📊 JARVIS Status

Project: jarvis
Location: /home/user/jarvis

💾 Databases:
  SQLite: ✓ 2.45 MB
  ChromaDB: ✓

📝 Memory:
  Total entries: 42
  Decisions: 35
  Notes: 7

✓ System operational
```

---

### `jarvis doctor`

Run comprehensive system diagnostics.

```bash
jarvis doctor [options]

Options:
  --verbose, -v   Show detailed diagnostics
  --quiet, -q     Only show overall status
  --json          Output in JSON format
```

**Checks:**

- Python version (3.9+)
- Required dependencies
- Database accessibility
- Disk space
- File permissions
- Git repository status

**Example:**

```bash
$ jarvis doctor

🏥 JARVIS System Diagnostics

✅ Status: All systems operational
   6 passed, 0 failed, 0 warnings

✅ Python Version
   Python 3.11.0

✅ Dependencies
   All 3 dependencies installed

✅ Databases
   All databases accessible

✅ Disk Space
   15.2GB free of 50.0GB

✓ System healthy
```

---

### `jarvis config`

Manage JARVIS configuration.

```bash
jarvis config [subcommand] [args]

Subcommands:
  list            Show all configuration
  get <key>       Get configuration value
  set <key> <value>  Set configuration value
  reset           Reset to default configuration
```

**Configuration Keys:**

- `language` - Interface language (default: "en")
- `responseStyle` - Response verbosity: "concise" or "verbose"
- `persona` - Agent persona (default: "jarvis")

**Examples:**

```bash
# List all configuration
jarvis config list

# Get specific value
jarvis config get language

# Set value
jarvis config set responseStyle verbose

# Reset to defaults
jarvis config reset
```

---

### `jarvis cleanup <target>`

Clean up memory and databases.

```bash
jarvis cleanup <target> [options]

Targets:
  memory          Clean up old memory entries
  checkpoints     Remove old checkpoints
  all             Full cleanup

Options:
  --dry-run       Show what would be cleaned
  --older-than=N  Days threshold (default: 7)
  --force, -f     Actually perform cleanup
  --json          Output in JSON format
```

**Examples:**

```bash
# Dry run - see what would be cleaned
jarvis cleanup checkpoints --dry-run

# Remove checkpoints older than 30 days
jarvis cleanup checkpoints --older-than=30 --force

# Full cleanup
jarvis cleanup all --force
```

---

## Configuration

Global config file: `~/.jarvis/config.json`

Project config file: `.jarvis/config.json`

Default configuration:

```json
{
  "language": "en",
  "responseStyle": "concise",
  "persona": "jarvis"
}
```

## Directory Structure

```
.jarvis/
├── db/
│   ├── memory.db          # SQLite factual memory
│   └── chroma/            # ChromaDB semantic memory
├── snapshots/             # Git diff snapshots
│   └── {commit_sha}.diff
├── config.json            # Project configuration
└── .gitkeep
```

## MCP Server Integration

JARVIS includes a Model Context Protocol (MCP) server for AI agent integration:

```bash
# Start MCP server
cd jarvis-mcp
uv run python -m jarvis.mcp.server
```

**Available MCP Tools:**

- `remember_context` - Store information
- `recall_context` - Search memories
- `scan_project` - Analyze codebase
- `create_checkpoint` - Create safety checkpoint
- `rollback_to_checkpoint` - Restore checkpoint
- `validate_changes` - Run validation
- `get_memory_status` - Get statistics
- `run_health_checks` - System diagnostics

## Development

```bash
# Install dependencies
npm install

# Development mode (watch)
npm run dev

# Build
npm run build

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Type check
npm run typecheck

# Lint
npm run lint

# Format
npm run format
```

## Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- checkpoint.test.ts

# Run in watch mode
npm run test:watch
```

**Test Coverage:**

- 168 tests passing
- Unit tests for all commands
- Integration tests for workflows
- MCP tool integration tests

## Project Structure

```
jarvis-cli/
├── src/
│   ├── commands/         # Command implementations
│   │   ├── init.ts
│   │   ├── remember.ts
│   │   ├── recall.ts
│   │   ├── scan.ts
│   │   ├── status.ts
│   │   ├── doctor.ts
│   │   ├── checkpoint.ts
│   │   ├── rollback.ts
│   │   ├── validate.ts
│   │   ├── cleanup.ts
│   │   ├── config.ts
│   │   └── internal.ts
│   ├── api/              # MCP client wrapper
│   │   └── mcp-client.ts
│   ├── config/           # Configuration management
│   │   ├── config.ts
│   │   └── settings.ts
│   ├── utils/            # Output formatting
│   │   └── output.ts
│   └── index.ts          # CLI entry point
├── tests/
│   ├── unit/             # Unit tests (150+ tests)
│   └── integration/      # Integration tests (20+ tests)
└── dist/                 # Built files
```

## Troubleshooting

### JARVIS not initialized

```bash
$ jarvis remember "test"
Error: Project not initialized

# Solution: Initialize JARVIS first
$ jarvis init
```

### Git hooks not triggering

```bash
# Re-install hooks
$ jarvis init --force

# Verify hook exists
$ cat .git/hooks/post-commit
```

### Validation tools not found

```bash
# Install Python tools
$ pip install ruff mypy pytest

# Install Node.js tools
$ npm install -D eslint vitest
```

### MCP server connection issues

```bash
# Check Python environment
$ cd jarvis-mcp
$ uv run python --version

# Reinstall dependencies
$ uv sync
```

## Performance

- **Initialization**: <1s
- **Remember**: <100ms
- **Recall**: <500ms (semantic search)
- **Scan**: <5s for 1000 files
- **Validation**: <30s (parallel execution)
- **Checkpoint**: <1s
- **Rollback**: <2s

## License

MIT
