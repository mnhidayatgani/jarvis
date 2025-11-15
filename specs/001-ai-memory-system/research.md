# Research: JARVIS - AI Coding Agent Memory System

**Phase**: 0 (Outline & Research)  
**Date**: 2025-11-15  
**Purpose**: Research technical decisions, validate technology choices, document best practices

## Research Overview

All technical choices are clearly specified in the constitution and feature spec. No NEEDS CLARIFICATION items exist. This research validates those choices and documents implementation patterns.

## 1. Memory Architecture Research

### Decision: 3-Layer Memory System (L1/L2/L3)

**Rationale**:

- L1 (Working Memory): MCP session context - ephemeral, conversation-scoped
- L2 (Project Memory): Persistent storage - SQLite (factual) + ChromaDB (semantic) + filesystem (snapshots)
- L3 (Core Knowledge): LLM base knowledge - no custom training needed

**Why This Approach**:

- Separation of concerns: ephemeral vs persistent vs foundational
- Each layer optimized for its access pattern (fast/structured/vast)
- Mirrors human cognitive architecture (short-term/long-term/expertise)

**Alternatives Considered**:

- Single unified database: Rejected - mixing ephemeral and persistent data leads to bloat and slower queries
- Cloud-based vector DB (Pinecone, Weaviate): Rejected - violates local-first principle (Constitution 2.3)
- Pure key-value store (Redis): Rejected - lacks semantic search capabilities

### Decision: SQLite for Factual Memory

**Rationale**:

- Zero-configuration, file-based, ACID compliant
- Perfect for structured data (tech stack, file paths, config)
- Fast B-tree index for key-value lookups
- Native Python support via sqlite3 module

**Why This Approach**:

- No server process needed - aligns with local-first architecture
- Single file per project - easy backup/migration
- Built into Python standard library - zero external dependencies
- Proven reliability in production (used by browsers, mobile apps)

**Alternatives Considered**:

- PostgreSQL: Rejected - requires server process, overkill for single-user
- JSON files: Rejected - no indexing, slow queries, no ACID guarantees
- LevelDB: Rejected - less mature Python bindings, harder to inspect/debug

### Decision: ChromaDB for Semantic Memory

**Rationale**:

- Built for embeddings and vector similarity search
- Python-native, simple API, persistent storage
- Supports filtering by metadata (time, file, type)
- HNSW algorithm for fast approximate nearest neighbor search

**Why This Approach**:

- Designed specifically for semantic search use case
- Local-first architecture option (no API calls needed)
- Easy integration with custom embeddings (bge-large-en-v1.5)
- Active development, good documentation

**Alternatives Considered**:

- Faiss: Rejected - lower-level, requires more manual index management
- Milvus: Rejected - enterprise-scale, complex setup for single-user
- Pure cosine similarity in SQLite: Rejected - no indexing, O(n) search time

### Decision: bge-large-en-v1.5 Embeddings

**Rationale**:

- SOTA performance on semantic search benchmarks (MTEB leaderboard)
- 1024-dimensional embeddings - good balance of quality vs size
- Runs locally via sentence-transformers library
- English-optimized matches JARVIS persona requirement

**Why This Approach**:

- No API dependencies - fully local (Constitution 2.3)
- Reproducible embeddings - same text always → same vector
- Efficient inference - ~100ms per text chunk on CPU
- Apache 2.0 license - commercial use allowed

**Alternatives Considered**:

- OpenAI embeddings: Rejected - requires API key, costs money, network dependency
- all-MiniLM-L6-v2: Rejected - smaller but lower quality results
- instructor-xl: Rejected - larger model, slower inference, minimal quality gain

## 2. MCP Protocol Integration Research

### Decision: Official Python MCP Package

**Rationale**:

- Maintained by Anthropic/ModelContextProtocol org
- Guarantees protocol compliance and future updates
- Built-in server/client implementations
- Type-safe tool definitions

**Why This Approach**:

- Avoid protocol drift - official implementation tracks spec changes
- Community support and documentation
- Examples and best practices included
- Interoperability with other MCP tools

**Alternatives Considered**:

- Custom MCP implementation: Rejected - high maintenance burden, error-prone
- JSON-RPC framework: Rejected - MCP has specific conventions beyond basic RPC
- REST API: Rejected - not MCP protocol, breaks agent integrations

### Decision: MCP Tools Exposed

**Research Finding**: Based on spec FR-012, expose these tools:

1. `remember_context(content, type, metadata)` - Store to memory
2. `recall_context(query, filters, limit)` - Search memory
3. `analyze_codebase(project_path)` - Run scan/onboarding
4. `validate_changes(files, validation_type)` - Pre-change safety check
5. `get_architecture(project_path)` - Retrieve file structure map
6. `create_checkpoint(reason)` - Manual checkpoint creation
7. `rollback(checkpoint_id)` - Undo changes

**Why This Set**:

- Covers all core workflows: remember, recall, analyze, validate, rollback
- Minimal API surface - 7 tools vs 13 CLI commands (simplicity)
- Each tool maps to specific user story (US-2.2, US-3.1, US-2.2, US-5.2, US-3.4, US-5.1, US-5.4)
- JARVIS persona applied in tool responses automatically

## 3. Auto-Capture Implementation Research

### Decision: Git Hooks + File Watcher

**Rationale**:

- Git hooks: Capture committed changes with full context (commit message, author, timestamp)
- File watcher: Detect uncommitted changes for real-time awareness
- Dual approach ensures no changes missed

**Why This Approach**:

- Git hooks: Guaranteed to run on commit, no polling needed
- File watcher: Catches WIP changes, provides context even before commit
- Together: Complete coverage of code evolution

**Alternatives Considered**:

- Git hooks only: Rejected - misses uncommitted changes, no real-time context
- File watcher only: Rejected - misses commit metadata (message, author)
- Periodic polling: Rejected - resource intensive, misses rapid changes

### Decision: Watchdog Library for File Watching

**Rationale**:

- Cross-platform (Linux inotify, macOS FSEvents, Windows ReadDirectoryChangesW)
- Event-driven (no polling) - minimal CPU usage
- Mature library (11k+ stars, active maintenance)
- Async support via watchdog[watchmedo]

**Why This Approach**:

- Platform abstraction - single API for all OSes
- Efficient - OS-level notifications, not polling
- Proven - used by major projects (pytest-watch, Sphinx autobuild)

**Alternatives Considered**:

- Manual polling with os.walk(): Rejected - high CPU usage, slow detection
- inotify directly: Rejected - Linux-only, doesn't support macOS/Windows
- Custom platform-specific code: Rejected - high maintenance, error-prone

## 4. Safety System Research

### Decision: Git Stash for Checkpoints

**Rationale**:

- Native git feature - no external dependencies
- Atomic operations - all files saved together
- Includes uncommitted and staged changes
- Stash metadata (message, timestamp) for identification

**Why This Approach**:

- Leverages existing git infrastructure
- Reliable - battle-tested in millions of repositories
- Easy to inspect/restore manually if needed
- Doesn't pollute commit history

**Alternatives Considered**:

- Git commits on hidden branch: Rejected - clutters repository, harder to clean up
- Manual file copies: Rejected - no atomicity, manual conflict resolution
- Filesystem snapshots: Rejected - OS-dependent, requires root/admin

### Decision: 3-Attempt Auto-Fix Strategy

**Rationale**:

- Attempt 1: Direct fix (syntax errors, import errors)
- Attempt 2: Partial rollback (revert problematic parts only)
- Attempt 3: Alternative approach (different implementation)
- Final: Full rollback if all fail

**Why This Approach**:

- Graduated response - try least invasive first
- Different strategies per attempt - avoid repeating same failure
- Safety net - always rollback if can't fix
- User trust - predictable behavior

**Alternatives Considered**:

- Single attempt: Rejected - too quick to give up, low success rate
- Unlimited attempts: Rejected - could loop forever, wastes time
- Ask user between attempts: Rejected - breaks autonomous operation principle

## 5. CLI Architecture Research

### Decision: TypeScript + esbuild for CLI

**Rationale**:

- TypeScript: Type safety, IDE support, catches errors at compile time
- esbuild: Fast compilation (<100ms), single executable output
- Node.js 18+: Modern ESM support, stable LTS

**Why This Approach**:

- Cross-platform - runs on Linux/macOS/Windows without recompilation
- Fast startup - esbuild bundles to single file, no node_modules at runtime
- Developer experience - TypeScript provides excellent IDE support
- Modern - ESM modules, top-level await, latest language features

**Alternatives Considered**:

- Python CLI: Rejected - slower startup, harder to distribute single binary
- Go CLI: Rejected - team not familiar, harder to integrate with MCP (Python)
- Bash scripts: Rejected - not cross-platform, hard to maintain

### Decision: MCP Client in CLI

**Rationale**:

- CLI communicates with MCP server via MCP protocol
- All memory logic stays in Python server
- CLI is thin layer - just UX and command parsing

**Why This Approach**:

- Separation of concerns - CLI doesn't duplicate memory logic
- Single source of truth - memory system only in Python
- Enables other MCP clients - Copilot, Cursor can use same server

## 6. Configuration Management Research

### Decision: Two-Layer Config (Global + Project)

**Rationale**:

- Global: `~/.jarvis/config.json` - user preferences across all projects
- Project: `.jarvis/config.json` - project-specific overrides
- Merge strategy: project overrides global

**Why This Approach**:

- User convenience - set preferences once globally
- Project flexibility - override per project when needed
- Familiar pattern - matches git config (global vs local)

**Alternatives Considered**:

- Single global config: Rejected - no per-project customization
- Only project config: Rejected - duplicates user preferences across projects
- Environment variables: Rejected - harder to persist, easy to forget

## 7. Testing Strategy Research

### Decision: Pytest + Vitest with High Coverage

**Rationale**:

- pytest: Python standard, async support, fixtures for test isolation
- Vitest: Fast, ESM-native, compatible with Jest patterns
- Coverage targets: 80% core memory, 60% overall

**Why This Approach**:

- Industry standard tools - familiar to developers
- Async testing - matches async I/O in memory system
- Fast feedback - Vitest runs in milliseconds, pytest optimized
- Coverage enforcement - prevents untested code from shipping

**Test Structure**:

- Unit: Test individual functions (embeddings, config parsing)
- Integration: Test MCP server + storage interactions
- E2E: Test CLI → MCP → Memory full workflows

**Mocking Strategy**:

- Mock filesystem operations in unit tests (avoid temp files)
- Mock ChromaDB in unit tests (avoid slow embedding calls)
- Use real SQLite in integration tests (in-memory database)

## 8. Development Workflow Research

### Decision: uv for Python, pnpm for TypeScript

**Rationale**:

- uv: Fast, modern Python package manager, deterministic installs
- pnpm: Efficient disk usage (hardlinks), fast, strict dependency resolution

**Why This Approach**:

- Speed - both are significantly faster than pip/npm
- Reproducibility - lock files ensure consistent environments
- Modern - support latest Python/Node features

**Pre-commit Standards**:

1. Format (Black, Prettier)
2. Lint (Ruff, ESLint)
3. Type check (mypy, tsc)
4. Fast tests (unit only, skip integration)
5. Update lock files if deps changed

**Rationale**: Catch errors early, enforce consistency, fast feedback (<30s total)

## Research Conclusions

All technical decisions validated and documented. No NEEDS CLARIFICATION items remain. Key findings:

1. **Memory architecture** is well-designed: SQLite + ChromaDB + filesystem provides optimal performance for factual vs semantic vs snapshot storage
2. **Local-first** is achievable: bge-large-en-v1.5 + local databases eliminate all cloud dependencies
3. **MCP protocol** is the right choice: Official package ensures compliance, 7 tools cover all workflows
4. **Auto-capture** dual approach (git hooks + file watcher) provides complete coverage
5. **Safety system** using git stash is reliable, atomic, and familiar to developers
6. **CLI architecture** (TypeScript + esbuild) delivers fast, cross-platform, type-safe experience
7. **Testing strategy** (pytest + Vitest, 80%/60% coverage) balances quality and pragmatism
8. **Tooling** (uv + pnpm) provides speed and reproducibility

**Ready to proceed to Phase 1: Design & Contracts**
