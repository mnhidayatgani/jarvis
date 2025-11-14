# JARVIS CLI

Command-line interface for JARVIS AI Coding Agent Memory System.

## Overview

User-facing CLI tool that provides:

- Project initialization (`jarvis init`)
- Manual memory capture (`jarvis remember`)
- Context retrieval (`jarvis recall`)
- Project scanning (`jarvis scan`)
- Configuration management (`jarvis config`)
- Health checks (`jarvis doctor`)

## Requirements

- Node.js 18+
- npm or pnpm

## Installation

```bash
# Install dependencies
npm install

# Build
npm run build

# Link for global use (optional)
npm link
```

## Usage

```bash
# Initialize JARVIS in a project
jarvis init

# Manual memory capture
jarvis remember "We chose PostgreSQL for better JSON support"

# Search memories
jarvis recall "database choice"

# Scan existing project
jarvis scan

# Configuration management
jarvis config list
jarvis config get language
jarvis config set responseStyle verbose
jarvis config reset

# Health check
jarvis doctor
```

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

## Project Structure

```
jarvis-cli/
├── src/
│   ├── commands/     # Command implementations
│   ├── api/          # MCP client wrapper
│   ├── config/       # Configuration management
│   ├── utils/        # Output formatting, helpers
│   └── index.ts      # CLI entry point
└── tests/
    ├── unit/         # Unit tests
    └── integration/  # Integration tests
```

## Configuration

Global config: `~/.jarvis/config.json`

Default configuration:

```json
{
  "language": "en",
  "responseStyle": "concise",
  "persona": "jarvis"
}
```

## Commands

- `jarvis init` - Initialize project memory
- `jarvis remember <content>` - Store information
- `jarvis recall <query>` - Search memories
- `jarvis scan` - Analyze codebase
- `jarvis config [get|set|list|reset]` - Manage configuration
- `jarvis status` - Show memory statistics
- `jarvis doctor` - Run health checks
- `jarvis rollback [n]` - Undo last n operations

## License

MIT
