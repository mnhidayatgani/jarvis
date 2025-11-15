# Implementation Plan: Full Codebase Refactor

**Branch**: `002-full-refactor` | **Date**: November 15, 2025 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-full-refactor/spec.md`

## Summary

Comprehensive refactor of JARVIS CLI (TypeScript) and MCP server (Python) to improve code maintainability, type safety, error handling, modularity, testing, performance, and documentation. Focuses on applying industry best practices while maintaining 100% backward compatibility with existing `.jarvis` data structures and user workflows. Technical approach emphasizes strict typing, dependency injection, layered architecture, comprehensive testing (>85% coverage), and clear separation of concerns between CLI presentation layer and MCP business logic layer.

## Technical Context

**Language/Version**: TypeScript 5.2+ (Node.js 18+), Python 3.10+  
**Primary Dependencies**:

- TypeScript: esbuild (bundler), vitest (testing), eslint + prettier (linting/formatting)
- Python: uv (package manager), pytest + pytest-asyncio (testing), ruff + black (linting/formatting), mypy (type checking)

**Storage**: SQLite (factual memory), ChromaDB (semantic search), filesystem (snapshots, configs)  
**Testing**: Vitest (TypeScript unit/integration), pytest (Python unit/integration/e2e)  
**Target Platform**: Cross-platform CLI tool (Linux, macOS, Windows) + Python MCP server  
**Project Type**: Dual-project refactor (jarvis-cli + jarvis-mcp)  
**Performance Goals**:

- CLI init <100ms
- Remember operation <200ms for 1KB data
- Recall/search <500ms for 10K entries
- Full test suite <30s

**Constraints**:

- Zero breaking changes to user-facing APIs
- 100% backward compatibility with .jarvis data structures
- Must maintain JARVIS persona in all outputs
- No new runtime dependencies

**Scale/Scope**:

- ~3,000 LOC TypeScript (jarvis-cli)
- ~4,000 LOC Python (jarvis-mcp)
- 168 existing tests to maintain + expand
- 15+ CLI commands, 10+ MCP tools

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

### Gate 1: Memory-First Architecture ✓ PASS

- **Requirement**: Three-layer memory (L1/L2/L3) with semantic search capabilities
- **Compliance**: Refactor preserves existing memory architecture (FR-031, FR-035). Improves modularity through dependency injection (FR-004) without changing core memory contracts
- **Status**: Fully aligned - refactor enhances existing architecture without violations

### Gate 2: JARVIS Persona Standards ✓ PASS

- **Requirement**: English responses, "Sir" address, concise format, JARVIS tone
- **Compliance**: FR-015 mandates all user-facing errors use JARVIS persona. Refactor improves consistency through centralized error formatting
- **Status**: Fully aligned - enhances persona consistency

### Gate 3: Autonomous Operation with Safety ✓ PASS

- **Requirement**: Auto-capture, checkpoints, rollback, validation
- **Compliance**: FR-033 preserves git hooks, FR-034 maintains all command behavior. Enhanced error handling (FR-011-FR-015) improves safety
- **Status**: Fully aligned - safety features preserved and enhanced

### Gate 4: Spec-Driven Development ✓ PASS

- **Requirement**: Follow speckit workflow for all features
- **Compliance**: This refactor itself follows speckit process (spec → plan → tasks → implement)
- **Status**: Fully aligned - exemplifies spec-driven development

### Gate 5: Code Quality & Testing Standards ✓ PASS

- **Requirement**: Type safety, testing (80%+ coverage), PEP 8 + Airbnb style
- **Compliance**: Core focus of refactor - FR-006/FR-007 (strict typing), FR-016-FR-020 (testing), SC-001-SC-003 (measurable quality)
- **Status**: Fully aligned - directly addresses quality standards

### Gate 6: Local-First Architecture ✓ PASS

- **Requirement**: No cloud dependencies, local storage
- **Compliance**: FR-031 preserves local .jarvis structure. No new dependencies (constraint stated in Technical Context)
- **Status**: Fully aligned - maintains local-first approach

### Gate 7: Integration Philosophy ✓ PASS

- **Requirement**: Enhance existing tools, MCP protocol, external architecture
- **Compliance**: FR-035 maintains MCP contracts. FR-034 preserves CLI signatures. Refactor internal implementation only
- **Status**: Fully aligned - internal refactor without breaking integrations

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Delete unused options and expand the chosen structure with
  real paths (e.g., apps/admin, packages/something). The delivered plan must
  not include Option labels.
-->

````text
## Project Structure

### Documentation (this feature)

```text
specs/002-full-refactor/
├── plan.md              # This file (/speckit.plan command output)
├── spec.md              # Feature specification (completed)
├── research.md          # Phase 0 output (TypeScript/Python best practices)
├── data-model.md        # Phase 1 output (refactored architecture model)
├── quickstart.md        # Phase 1 output (refactoring guide)
├── contracts/           # Phase 1 output (interface definitions)
│   ├── cli-commands.md  # CLI command contracts
│   ├── mcp-tools.md     # MCP tool contracts (unchanged from 001)
│   ├── memory-interfaces.md  # Memory layer interfaces
│   └── error-types.md   # Error hierarchy definitions
└── checklists/
    └── requirements.md  # Quality checklist (completed)
````

### Source Code (repository root)

```text
# Existing structure preserved, internal organization improved

jarvis-cli/                      # TypeScript CLI
├── src/
│   ├── commands/                # CLI command implementations
│   │   ├── base/                # NEW: Base command class
│   │   │   ├── command.ts       # Abstract command pattern
│   │   │   └── types.ts         # Shared command types
│   │   ├── init.ts              # Refactored with pattern
│   │   ├── remember.ts          # Refactored with pattern
│   │   ├── recall.ts            # Refactored with pattern
│   │   └── ...                  # All commands follow pattern
│   ├── api/                     # MCP client wrapper
│   │   ├── client.ts            # Refactored with proper DI
│   │   ├── types.ts             # NEW: API type definitions
│   │   └── errors.ts            # NEW: API-specific errors
│   ├── core/                    # NEW: Core domain logic
│   │   ├── errors/              # Custom error hierarchy
│   │   │   ├── base.ts          # Base error classes
│   │   │   ├── cli-errors.ts    # CLI-specific errors
│   │   │   └── index.ts         # Error exports
│   │   ├── types/               # Shared type definitions
│   │   │   ├── config.ts        # Config types
│   │   │   ├── memory.ts        # Memory types
│   │   │   └── index.ts         # Type exports
│   │   └── validators/          # Runtime validation
│   │       ├── config.ts        # Config validators
│   │       └── input.ts         # Input validators
│   ├── config/                  # Configuration management
│   │   ├── config.ts            # Refactored with validation
│   │   ├── settings.ts          # Settings management
│   │   └── schema.ts            # NEW: Config schema
│   ├── utils/                   # Utilities
│   │   ├── output.ts            # Refactored formatter
│   │   ├── logger.ts            # NEW: Structured logging
│   │   └── performance.ts       # NEW: Performance monitoring
│   └── index.ts                 # CLI entry point (refactored)
├── tests/
│   ├── unit/                    # Expanded unit tests
│   │   ├── commands/            # Command tests
│   │   ├── core/                # Core logic tests
│   │   └── utils/               # Utility tests
│   ├── integration/             # Integration tests
│   │   ├── cli-mcp.test.ts      # CLI-MCP communication
│   │   └── end-to-end.test.ts   # E2E workflows
│   ├── fixtures/                # NEW: Test fixtures
│   │   ├── configs.ts           # Config fixtures
│   │   └── responses.ts         # Mock responses
│   └── helpers/                 # NEW: Test helpers
│       ├── mocks.ts             # Mock factories
│       └── setup.ts             # Test setup utilities
├── docs/                        # NEW: Generated documentation
│   ├── api/                     # API docs from TSDoc
│   └── architecture/            # Architecture diagrams + ADRs
│       ├── adr-001-command-pattern.md
│       ├── adr-002-error-hierarchy.md
│       └── adr-003-dependency-injection.md
├── tsconfig.json                # Updated strict config
├── vitest.config.ts             # Enhanced test config
└── package.json                 # Updated scripts

jarvis-mcp/                      # Python MCP server
├── src/jarvis/
│   ├── memory/                  # 3-layer memory system
│   │   ├── __init__.py
│   │   ├── base.py              # NEW: Abstract base classes
│   │   ├── interfaces.py        # NEW: Protocol definitions
│   │   ├── factual.py           # Refactored with interfaces
│   │   ├── semantic.py          # Refactored with interfaces
│   │   ├── snapshot.py          # Refactored with interfaces
│   │   └── core.py              # Refactored orchestration
│   ├── mcp/                     # MCP server implementation
│   │   ├── __init__.py
│   │   ├── server.py            # Refactored with DI
│   │   ├── tools.py             # Refactored adapters
│   │   └── types.py             # NEW: MCP type definitions
│   ├── capture/                 # Auto-capture logic
│   │   ├── __init__.py
│   │   ├── base.py              # NEW: Base capture classes
│   │   ├── file_watcher.py      # Refactored
│   │   ├── git_hooks.py         # Refactored
│   │   └── scanner.py           # Refactored
│   ├── core/                    # NEW: Core domain
│   │   ├── __init__.py
│   │   ├── errors.py            # Custom exception hierarchy
│   │   ├── types.py             # Shared type definitions
│   │   └── validators.py        # Runtime validation (Pydantic)
│   ├── speckit/                 # Spec Kit integration
│   │   └── ...                  # Existing files
│   └── utils/                   # Shared utilities
│       ├── __init__.py
│       ├── config.py            # Refactored with validation
│       ├── persona.py           # Enhanced JARVIS persona
│       ├── embeddings.py        # Refactored
│       ├── logger.py            # NEW: Structured logging
│       └── performance.py       # NEW: Performance monitoring
├── tests/
│   ├── unit/                    # Expanded unit tests
│   │   ├── memory/              # Memory layer tests
│   │   ├── mcp/                 # MCP server tests
│   │   └── utils/               # Utility tests
│   ├── integration/             # Integration tests
│   │   ├── test_memory_layers.py
│   │   └── test_mcp_tools.py
│   ├── e2e/                     # End-to-end tests
│   │   └── test_workflows.py
│   ├── fixtures/                # NEW: Test fixtures
│   │   ├── __init__.py
│   │   ├── memory_data.py       # Memory test data
│   │   └── configs.py           # Config fixtures
│   └── conftest.py              # pytest configuration
├── docs/                        # NEW: Generated documentation
│   ├── api/                     # API docs from docstrings
│   └── architecture/            # Architecture diagrams + ADRs
│       ├── adr-001-memory-interfaces.md
│       ├── adr-002-error-handling.md
│       └── adr-003-dependency-injection.md
├── pyproject.toml               # Updated with strict mypy config
└── pytest.ini                   # Enhanced pytest config

# Shared documentation
docs/                            # NEW: Project-wide documentation
├── architecture/
│   ├── overview.md              # System architecture
│   ├── cli-mcp-interaction.md   # Communication patterns
│   └── refactoring-guide.md     # Developer guide
└── best-practices/
    ├── typescript.md            # TS best practices applied
    └── python.md                # Python best practices applied
```

**Structure Decision**: Dual-project structure preserved from original implementation. Added new directories for better organization:

- `core/` in both projects: Domain logic, types, errors, validators
- `base/` classes: Abstract base classes and interfaces
- `fixtures/` and `helpers/` in tests: Better test organization
- `docs/architecture/`: ADRs and architecture documentation
- NEW shared `docs/` at root: Cross-project documentation

## Complexity Tracking

> **No violations found** - All Constitution checks pass. This refactor enhances existing architecture without introducing complexity violations.

The refactor maintains:

- ✅ Dual-project structure (jarvis-cli + jarvis-mcp) as established in feature 001
- ✅ Local-first architecture with no cloud dependencies
- ✅ Three-layer memory system (L1/L2/L3) unchanged
- ✅ MCP protocol contracts unchanged
- ✅ JARVIS persona consistency throughout

New patterns introduced (Command pattern, DI, error hierarchy) reduce complexity rather than increase it by providing consistent structure and clear contracts.

```

**Structure Decision**: [Document the selected structure and reference the real
directories captured above]

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation                  | Why Needed         | Simpler Alternative Rejected Because |
| -------------------------- | ------------------ | ------------------------------------ |
| [e.g., 4th project]        | [current need]     | [why 3 projects insufficient]        |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient]  |
```
