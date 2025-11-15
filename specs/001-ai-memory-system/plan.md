# Implementation Plan: JARVIS - AI Coding Agent Memory System

**Branch**: `001-ai-memory-system` | **Date**: 2025-11-15 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-ai-memory-system/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

JARVIS is an external memory system for AI coding agents providing persistent, context-aware assistance across multiple projects. The system implements a 3-layer memory architecture (Working/Project/Core) with semantic search, auto-capture of code changes and decisions, autonomous operation with safety guarantees, and MCP protocol integration for AI agent connectivity. Technical approach: Python MCP server for memory logic, TypeScript CLI for user interaction, SQLite for factual storage, ChromaDB for semantic search with bge-large-en-v1.5 embeddings, git hooks for auto-capture, and JARVIS MCU persona throughout.

## Technical Context

**Language/Version**: Python 3.10+ (MCP server, memory system), TypeScript/Node.js 18+ (CLI tool)  
**Primary Dependencies**: ChromaDB 0.4+, SQLite 3.35+, bge-large-en-v1.5 (embeddings), MCP Python package, uv (Python), pnpm (TypeScript)  
**Storage**: SQLite (factual memory: tech stack, file structure), ChromaDB (semantic memory: decisions, context), local filesystem (code snapshots, git diffs)  
**Testing**: pytest with pytest-asyncio and pytest-cov (Python), Vitest (TypeScript), minimum 80% coverage for core memory, 60% overall  
**Target Platform**: Linux (primary), macOS, Windows; x86_64 and ARM64 architecture  
**Project Type**: Dual project (MCP server + CLI tool) - MCP server is backend service, CLI is user-facing tool  
**Performance Goals**: <2s query response time (95th percentile), <5min project scan (10k files), <10s context switch, auto-capture <5% CPU overhead  
**Constraints**: <100MB memory footprint (excluding databases), 100% rollback success rate, >95% auto-capture accuracy, databases up to 10GB, local-only (no cloud dependencies Phase 1)  
**Scale/Scope**: Single-user, multiple projects (isolated by path hash), up to 50k files per project, unlimited memory retention (user-controlled cleanup)

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

### Gate 1: Memory-First Architecture ✓ PASS

- **Requirement**: Three-layer memory (L1/L2/L3), persistent across sessions, semantic search
- **Compliance**: Spec FR-001 defines 3-layer system, FR-020 ensures persistence, FR-003/FR-004 implement semantic search with ChromaDB
- **Status**: Fully aligned, no violations

### Gate 2: JARVIS Persona Standards ✓ PASS

- **Requirement**: English-only responses, address as "Sir", concise format, proactive behavior
- **Compliance**: Spec FR-011 mandates persona requirements, US-6.1 to US-6.3 define communication standards
- **Status**: Fully aligned, no violations

### Gate 3: Autonomous Operation with Safety ✓ PASS

- **Requirement**: Auto-fix (2-3 tries), auto-rollback on failure, checkpoints before risky changes, post-change validation
- **Compliance**: Spec FR-009/FR-010 define validation and auto-rollback, FR-008 defines checkpoint creation, US-5.3 specifies auto-fix attempts
- **Status**: Fully aligned, no violations

### Gate 4: Spec-Driven Development ✓ PASS

- **Requirement**: Constitution alignment, specification creation, planning, task breakdown, implementation via `/speckit.*` commands
- **Compliance**: This plan follows `/speckit.plan` workflow, FR-012 integrates Spec Kit commands, US-9.1 to US-9.3 define Spec Kit integration
- **Status**: Fully aligned, currently executing the required workflow

### Gate 5: Code Quality & Testing Standards ✓ PASS

- **Requirement**: Full type hints (Python), strict mode (TypeScript), 80% coverage (core), 60% (overall), pytest/Vitest, <10s unit tests
- **Compliance**: Technical Context specifies pytest + pytest-asyncio + pytest-cov and Vitest, FR-006 references testing requirements, constitution Section 3.4 enforced
- **Status**: Fully aligned, no violations

### Gate 6: Local-First Architecture ✓ PASS

- **Requirement**: No cloud dependencies, <100MB footprint, <2s queries, local embeddings, SQLite + ChromaDB, keyring for secrets
- **Compliance**: FR-016 (<100MB), FR-014 (<2s queries), FR-001 (SQLite + ChromaDB), FR-004 (bge-large-en-v1.5 local), FR-022 (keyring)
- **Status**: Fully aligned, no violations

### Gate 7: Integration Philosophy ✓ PASS

- **Requirement**: Spec Kit foundation, MCP protocol, support multiple AI agents, external tool architecture
- **Compliance**: FR-012 exposes MCP tools, FR-008 integrates Spec Kit, FR-013 provides CLI interface, Technical Context confirms external architecture
- **Status**: Fully aligned, no violations

**GATE RESULT**: ✅ ALL GATES PASSED - Proceed to Phase 0 Research

## Project Structure

### Documentation (this feature)

```text
specs/001-ai-memory-system/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   └── mcp-tools.md     # MCP protocol tool definitions
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
# Dual Project Structure: MCP Server (Python) + CLI Tool (TypeScript)

jarvis-mcp/                    # Python MCP server
├── src/jarvis/
│   ├── memory/                # 3-layer memory system
│   │   ├── __init__.py
│   │   ├── factual.py         # SQLite operations
│   │   ├── semantic.py        # ChromaDB operations
│   │   └── snapshot.py        # Filesystem operations
│   ├── mcp/                   # MCP server implementation
│   │   ├── __init__.py
│   │   ├── server.py          # MCP protocol server
│   │   └── tools.py           # MCP tool definitions
│   ├── capture/               # Auto-capture logic
│   │   ├── __init__.py
│   │   ├── git_hooks.py       # Git hook management
│   │   └── file_watcher.py    # File system watcher
│   ├── speckit/               # Spec Kit integration
│   │   ├── __init__.py
│   │   └── commands.py        # Spec Kit command wrappers
│   └── utils/                 # Shared utilities
│       ├── __init__.py
│       ├── embeddings.py      # bge-large-en-v1.5 wrapper
│       └── config.py          # Configuration management
├── tests/
│   ├── unit/                  # Unit tests
│   ├── integration/           # MCP + storage integration tests
│   └── e2e/                   # End-to-end workflow tests
├── pyproject.toml             # uv project config
└── README.md

jarvis-cli/                    # TypeScript CLI tool
├── src/
│   ├── commands/              # CLI command implementations
│   │   ├── init.ts
│   │   ├── scan.ts
│   │   ├── remember.ts
│   │   ├── recall.ts
│   │   ├── status.ts
│   │   ├── rollback.ts
│   │   ├── config.ts
│   │   └── doctor.ts
│   ├── api/                   # MCP client
│   │   └── mcp-client.ts      # Connects to MCP server
│   ├── config/                # Configuration management
│   │   └── settings.ts
│   ├── utils/                 # Shared utilities
│   │   └── output.ts          # Formatted output helpers
│   └── index.ts               # CLI entry point
├── tests/
│   ├── unit/                  # Unit tests
│   └── integration/           # CLI → MCP integration tests
├── package.json               # pnpm project config
├── tsconfig.json              # TypeScript config
├── .eslintrc.json             # ESLint config
├── .prettierrc.json           # Prettier config
├── vitest.config.ts           # Vitest config
└── README.md
```

**Structure Decision**: Dual-project architecture selected based on Constitution 3.2 and 3.3. The MCP server (jarvis-mcp) handles all memory logic, storage, and AI agent integration using Python for async I/O and data processing strengths. The CLI tool (jarvis-cli) provides user-facing commands using TypeScript for cross-platform compatibility and modern tooling. Separation of concerns: MCP server = backend logic, CLI = UX layer. Both projects exist at repository root as peers to enable independent versioning and deployment while maintaining clear boundaries.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

**No violations detected** - Constitution Check shows all gates passed. No complexity justification required.
