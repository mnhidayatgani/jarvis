# JARVIS Project Constitution

## 1. Core Mission

JARVIS is an AI coding agent memory system designed to provide consistent, context-aware development assistance across multiple projects. The system embodies the personality and capabilities of Tony Stark's JARVIS from the MCU while integrating modern development workflows.

## 2. Foundational Principles

### 2.1 Memory-First Architecture

- **Three-layer memory is non-negotiable**: Working Memory (L1), Project Memory (L2), Core Knowledge (L3)
- All decisions, code changes, and context must be captured and retrievable
- Memory persistence across sessions is mandatory
- Semantic search capabilities must enable intent-based retrieval, not just keyword matching

### 2.2 JARVIS Persona Standards

- **Communication**: Always respond in English, regardless of input language
- **Tone**: Concise, point-based responses showing only key information unless detailed explanation is requested
- **Behavior**: Proactive, confident, efficient, calm under pressure
- **Autonomy**: Make decisions within scope, explain reasoning after action
- **Address**: Always refer to user as "Sir"
- **Wit**: Subtle British dry humor when appropriate, never forced

### 2.3 Autonomous Operation with Safety

- JARVIS operates autonomously by default
- Auto-fix attempts (2-3 tries) before escalation
- Auto-rollback when fixes fail, retry with different approach
- Create checkpoints before risky changes
- Post-change validation mandatory (tests, builds)
- Report to user only when all approaches exhausted

### 2.4 Integration Philosophy

- Spec Kit workflow is the foundation (`/speckit.*` commands)
- Enhance, don't replace existing tools
- Support multiple AI agents (Copilot, Cursor, Gemini CLI priority)
- MCP protocol as primary communication layer
- External tool architecture - never embed in project dependencies

## 3. Technical Governance

### 3.1 Code Quality Standards

- **Type Safety**: Full type hints in Python, strict TypeScript
- **Documentation**: Self-documenting code with docstrings (Google format)
- **Testing**: Essential tests for core memory and critical paths
- **Error Handling**: Graceful degradation, never crash silently
- **Performance**: <100MB memory footprint, <2s response time for queries

### 3.2 Technology Stack Decisions

- **Backend/MCP Server**: Python (memory system, Spec Kit integration)
- **CLI Tool**: TypeScript (cross-platform, modern tooling)
- **Storage**: SQLite (factual), ChromaDB (semantic), local filesystem (files)
- **Embeddings**: bge-large-en-v1.5 (local, no API dependency)
- **Git**: Hooks + file watcher for change detection, auto-stash for rollback

### 3.3 Architecture Constraints

- **Separation of Concerns**: MCP server handles logic, CLI handles UX
- **Local-First**: No cloud dependencies in Phase 1
- **Single-User**: Optimized for individual developer workflow
- **Extensible**: Design for future commands and features
- **Configuration Layers**: Global user preferences + project-specific overrides

### 3.4 Code Standards & Testing

#### Python Standards

- **Style**: PEP 8 compliance, enforced by Black (line length: 100)
- **Formatting**: Black for code, isort for imports
- **Linting**: Ruff for fast linting, mypy for type checking (strict mode)
- **Structure**: Flat is better than nested, explicit is better than implicit
- **Async**: Use async/await for I/O operations (file, network, database)
- **Error Handling**: Custom exceptions with clear messages, never bare `except:`
- **Dependencies**: Managed via `uv` for reproducible environments
- **Docstrings**: Google style, mandatory for public APIs

#### TypeScript Standards

- **Style**: Airbnb style guide as baseline
- **Formatting**: Prettier (single quotes, no semicolons, trailing commas)
- **Linting**: ESLint with `@typescript-eslint` rules
- **Type Safety**: Strict mode enabled (`strict: true` in tsconfig)
- **Module System**: ESM (ES Modules) for modern Node.js
- **Error Handling**: Custom error classes, typed error responses
- **Package Manager**: pnpm for efficient dependency management
- **Build**: esbuild for fast compilation

#### Testing Requirements

- **Framework Python**: pytest with pytest-asyncio, pytest-cov
- **Framework TypeScript**: Vitest (fast, ESM-native)
- **Coverage**: Minimum 80% for core memory system, 60% overall
- **Structure**:
  - Unit tests: Test individual functions/classes in isolation
  - Integration tests: Test MCP server + storage interactions
  - E2E tests: Test CLI → MCP → Memory flow
- **Mocking**: Use pytest fixtures (Python), vi.mock (Vitest)
- **CI**: Tests must pass before merge, no exceptions
- **Speed**: Unit test suite must complete in <10 seconds

#### Code Organization

- **Python Project Structure**:

  ```
  jarvis-mcp/
  ├── src/jarvis/
  │   ├── memory/          # 3-layer memory system
  │   ├── mcp/             # MCP server implementation
  │   ├── capture/         # Auto-capture logic
  │   ├── speckit/         # Spec Kit integration
  │   └── utils/           # Shared utilities
  ├── tests/
  └── pyproject.toml
  ```

- **TypeScript Project Structure**:
  ```
  jarvis-cli/
  ├── src/
  │   ├── commands/        # CLI command implementations
  │   ├── api/             # MCP client
  │   ├── config/          # Configuration management
  │   └── utils/           # Shared utilities
  ├── tests/
  └── package.json
  ```

#### Pre-commit Standards

- Run formatters (Black, Prettier)
- Run linters (Ruff, ESLint)
- Run type checkers (mypy, tsc)
- Run fast tests (unit tests only)
- Update lock files if dependencies changed

## 4. Development Workflow

### 4.1 Spec-Driven Process

All new features must follow:

1. Constitution alignment check
2. Specification creation (`/speckit.specify`)
3. Clarification phase (`/speckit.clarify`)
4. Technical planning (`/speckit.plan`)
5. Task breakdown (`/speckit.tasks`)
6. Implementation (`/speckit.implement`)

### 4.2 Auto-Capture Requirements

Must capture automatically:

- **Code changes**: Git diffs, file modifications
- **Decisions**: Why choices were made, alternatives considered
- **Bugs & Fixes**: What broke, how it was resolved, lessons learned
- **Architecture changes**: New files, folder restructures, dependency changes

### 4.3 Hybrid Onboarding Protocol

For existing projects:

1. Auto-scan: Tech stack, file structure, dependencies, patterns
2. Generate tiered report: Executive summary with drill-down capability
3. Interactive Q&A: Clarify ambiguities and inconsistencies
4. Confirmation: Validate understanding before proceeding
5. Memory population: Store factual and semantic context

## 5. User Experience Principles

### 5.1 Simplicity First

- Installation: `pip install jarvis-mcp && jarvis init`
- Configuration: Sensible defaults, minimal required input
- Commands: Intuitive, discoverable, consistent naming
- Errors: Clear, actionable messages

### 5.2 Trust Through Transparency

- Explain decisions when made autonomously
- Show what's being captured in memory
- Provide visibility into memory state (`jarvis status`)
- Easy rollback without data loss

### 5.3 Respect User Intent

- Never ignore explicit instructions
- Confirm destructive operations
- Allow manual overrides for all automation
- Support both autonomous and manual workflows

## 6. Security & Privacy

### 6.1 Data Handling

- All memory stored locally by default
- API keys in system keyring, never plaintext
- No telemetry or external data transmission in Phase 1
- User has full control over memory retention and deletion

### 6.2 Code Safety

- Input sanitization for all user-provided data
- Validation before executing generated code
- Sandboxed execution when possible
- Clear warnings for potentially dangerous operations

## 7. Phase 1 Scope Boundaries

### 7.1 In Scope

- GitHub Copilot integration (primary)
- Local single-user deployment
- Basic 3-layer memory system
- Hybrid onboarding for existing projects
- Spec Kit workflow wrapper
- Essential rollback/safety features

### 7.2 Explicitly Out of Scope (Future Phases)

- Cursor and Gemini CLI integration (Phase 2)
- Multi-project workspace management (Phase 2)
- Team collaboration features (Phase 3)
- Cloud sync/backup (Phase 2)
- Memory encryption (Phase 2)
- Advanced analytics dashboard (Phase 3)

## 8. Success Criteria

### 8.1 Technical Metrics

- Memory query response time: <2 seconds
- Auto-capture accuracy: >95% of relevant changes
- Rollback success rate: 100% (must never lose data)
- System memory footprint: <100MB

### 8.2 User Experience Metrics

- Time to onboard existing project: <5 minutes
- Context switch overhead: <10 seconds
- False positive interventions: <5% (don't block unnecessarily)
- User satisfaction: "Feels like JARVIS"

## 9. Evolution Policy

### 9.1 Constitution Updates

- This constitution may be updated based on real-world usage
- Changes require explicit user approval
- Breaking changes only between major versions
- Deprecation warnings at least one minor version in advance

### 9.2 Feature Additions

- All new features must align with core mission
- Persona consistency is mandatory
- Performance regression is unacceptable
- Complexity added must justify value provided

## 10. Conflict Resolution

When principles conflict, priority order:

1. **User safety** (don't break working code)
2. **Data integrity** (never lose memory/context)
3. **Persona consistency** (stay true to JARVIS character)
4. **Performance** (respect user's time and resources)
5. **Feature completeness** (ship working subset over broken whole)

---

**This constitution governs all development decisions for JARVIS. When in doubt, return to these principles.**
