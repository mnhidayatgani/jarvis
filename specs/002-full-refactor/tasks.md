# Tasks: Full Codebase Refactor

**Input**: Design documents from `/specs/002-full-refactor/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `- [ ] [ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure) ✅ COMPLETE

**Purpose**: Initial configuration and tooling setup for both jarvis-cli and jarvis-mcp

- [x] T001 [P] Update jarvis-cli/tsconfig.json to enable strict mode with all strict flags
- [x] T002 [P] Update jarvis-mcp/pyproject.toml to enable strict mypy configuration
- [x] T003 [P] Create jarvis-cli/src/core/types/ directory with index.ts, config.ts, memory.ts
- [x] T004 [P] Create jarvis-mcp/src/jarvis/core/ directory with **init**.py, types.py, errors.py, validators.py
- [x] T005 [P] Create docs/ directory at repository root with architecture/ and best-practices/ subdirectories
- [x] T006 [P] Create jarvis-cli/tests/fixtures/ and jarvis-cli/tests/helpers/ directories
- [x] T007 [P] Create jarvis-mcp/tests/fixtures/ directory with **init**.py, memory_data.py, configs.py

---

## Phase 2: Foundational (Blocking Prerequisites) ✅ COMPLETE

**Purpose**: Core infrastructure that MUST be complete before ANY user story implementation

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Error Hierarchies

- [x] T008 [P] Implement JarvisError base class in jarvis-cli/src/core/errors/base.ts with toJSON() and toCLIMessage()
- [x] T009 [P] Implement Python JarvisError base class in jarvis-mcp/src/jarvis/core/errors.py with to_dict()
- [x] T010 [P] Implement ValidationError, MCPConnectionError, FileSystemError, ConfigurationError in jarvis-cli/src/core/errors/cli-errors.ts
- [x] T011 [P] Implement ValidationError, DatabaseError, MCPToolError, FileSystemError in jarvis-mcp/src/jarvis/core/errors.py
- [x] T012 Export all error classes from jarvis-cli/src/core/errors/index.ts
- [ ] T013 Replace all `throw new Error()` in jarvis-cli/src/ with specific error types

### Interface Definitions

- [x] T014 [P] Create ICommand<TOptions, TResult> interface in jarvis-cli/src/commands/base/command.ts
- [x] T015 [P] Create BaseCommand abstract class implementing ICommand in jarvis-cli/src/commands/base/command.ts
- [x] T016 [P] Create IMCPClient interface in jarvis-cli/src/api/types.ts with MCPResponse and MCPToolCall types
- [ ] T017 [P] Create IOutputFormatter interface in jarvis-cli/src/utils/output.ts
- [x] T018 [P] Create IMemoryLayer protocol in jarvis-mcp/src/jarvis/memory/interfaces.py
- [x] T019 [P] Create IStorageBackend and IEmbeddingsProvider protocols in jarvis-mcp/src/jarvis/memory/interfaces.py
- [x] T020 [P] Create MemoryEntry Pydantic model in jarvis-mcp/src/jarvis/core/types.py
- [x] T021 [P] Create SearchResult Pydantic model in jarvis-mcp/src/jarvis/core/types.py
- [x] T022 [P] Create ProjectConfig Pydantic model in jarvis-mcp/src/jarvis/core/validators.py

### Test Infrastructure

- [x] T023 [P] Create test fixtures for configs in jarvis-cli/tests/fixtures/configs.ts
- [x] T024 [P] Create mock MCP responses in jarvis-cli/tests/fixtures/responses.ts
- [x] T025 [P] Create test helper functions in jarvis-cli/tests/helpers/mocks.ts
- [x] T026 [P] Create pytest fixtures in jarvis-mcp/tests/conftest.py for temp projects and mock storage
- [ ] T027 Run TypeScript type checker and fix all type errors in existing code
- [x] T028 Run mypy on Python code and add type hints to all public APIs

**Checkpoint**: Foundation ready - strict typing enabled, errors defined, interfaces created, tests can run ✅

---

## Phase 3: User Story 1 - Improved Code Maintainability (Priority: P1) 🎯 IN PROGRESS

**Goal**: Consistent code organization with clear patterns that new developers can follow

**Independent Test**: New developer can add validation rule to `remember` command in under 30 minutes

### Command Pattern Implementation

- [ ] T029 [P] [US1] Write characterization tests for InitCommand in jarvis-cli/tests/unit/commands/init.test.ts
- [ ] T030 [US1] Refactor InitCommand to extend BaseCommand in jarvis-cli/src/commands/init.ts
- [ ] T031 [US1] Implement parse(), validate(), execute() methods for InitCommand
- [ ] T032 [US1] Verify InitCommand tests still pass and add edge case tests
- [x] T033 [P] [US1] Write characterization tests for StatusCommand in jarvis-cli/tests/unit/commands/status.test.ts
- [x] T034 [US1] Refactor StatusCommand to extend BaseCommand in jarvis-cli/src/commands/status.ts
- [x] T035 [P] [US1] Write characterization tests for ConfigCommand in jarvis-cli/tests/unit/commands/config.test.ts
- [x] T036 [US1] Refactor ConfigCommand to extend BaseCommand in jarvis-cli/src/commands/config.ts
- [x] T037 [P] [US1] Write characterization tests for ScanCommand in jarvis-cli/tests/unit/commands/scan.test.ts
- [x] T038 [US1] Refactor ScanCommand to extend BaseCommand in jarvis-cli/src/commands/scan.ts
- [x] T039 [P] [US1] Write characterization tests for RememberCommand in jarvis-cli/tests/unit/commands/remember.test.ts
- [x] T040 [US1] Refactor RememberCommand to extend BaseCommand in jarvis-cli/src/commands/remember.ts
- [x] T041 [P] [US1] Write characterization tests for RecallCommand in jarvis-cli/tests/unit/commands/recall.test.ts
- [x] T042 [US1] Refactor RecallCommand to extend BaseCommand in jarvis-cli/src/commands/recall.ts

### Memory Layer Organization

- [ ] T043 [P] [US1] Create BaseMemory abstract class in jarvis-mcp/src/jarvis/memory/base.py
- [ ] T044 [US1] Refactor FactualMemory to extend BaseMemory in jarvis-mcp/src/jarvis/memory/factual.py
- [ ] T045 [US1] Refactor SemanticMemory to extend BaseMemory in jarvis-mcp/src/jarvis/memory/semantic.py
- [ ] T046 [US1] Refactor SnapshotMemory to extend BaseMemory in jarvis-mcp/src/jarvis/memory/snapshot.py
- [ ] T047 [US1] Update MemoryCore to use base classes in jarvis-mcp/src/jarvis/memory/core.py

### Documentation

- [ ] T048 [P] [US1] Create ADR-001: Command Pattern in docs/architecture/adr-001-command-pattern.md
- [ ] T049 [P] [US1] Create ADR-002: Memory Interfaces in docs/architecture/adr-002-memory-interfaces.md
- [ ] T050 [P] [US1] Document code organization in docs/architecture/overview.md
- [ ] T051 [P] [US1] Create developer onboarding guide in docs/architecture/refactoring-guide.md

**Checkpoint**: All commands follow consistent pattern, memory layers have clear structure, documentation exists

---

## Phase 4: User Story 2 - Enhanced Type Safety (Priority: P1) 🎯

**Goal**: Zero type errors with 100% type coverage for public APIs

**Independent Test**: Run type checkers with zero errors and zero `any` types in source code

### TypeScript Type Coverage

- [ ] T052 [P] [US2] Define all command option types in jarvis-cli/src/commands/base/types.ts
- [ ] T053 [P] [US2] Define all command result types in jarvis-cli/src/commands/base/types.ts
- [ ] T054 [P] [US2] Create type guards for runtime validation in jarvis-cli/src/core/validators/input.ts
- [ ] T055 [P] [US2] Add explicit types to all MCPClient methods in jarvis-cli/src/api/client.ts
- [ ] T056 [P] [US2] Add explicit types to OutputFormatter in jarvis-cli/src/utils/output.ts
- [ ] T057 [P] [US2] Add explicit types to ConfigManager in jarvis-cli/src/config/config.ts
- [ ] T058 [US2] Remove all `any` types from jarvis-cli/src/ replacing with `unknown` or explicit types
- [ ] T059 [US2] Add JSDoc comments with type examples for complex types in jarvis-cli/src/core/types/

### Python Type Coverage

- [ ] T060 [P] [US2] Add complete type hints to all FactualMemory methods in jarvis-mcp/src/jarvis/memory/factual.py
- [ ] T061 [P] [US2] Add complete type hints to all SemanticMemory methods in jarvis-mcp/src/jarvis/memory/semantic.py
- [ ] T062 [P] [US2] Add complete type hints to all SnapshotMemory methods in jarvis-mcp/src/jarvis/memory/snapshot.py
- [ ] T063 [P] [US2] Add complete type hints to all MCPTools methods in jarvis-mcp/src/jarvis/mcp/tools.py
- [ ] T064 [P] [US2] Add complete type hints to all Scanner methods in jarvis-mcp/src/jarvis/capture/scanner.py
- [ ] T065 [US2] Add Pydantic validators for all input data in jarvis-mcp/src/jarvis/core/validators.py
- [ ] T066 [US2] Add Google-style docstrings with type examples for complex types

### Validation

- [ ] T067 [US2] Run `npm run typecheck` and ensure zero errors
- [ ] T068 [US2] Run `uv run mypy src/jarvis` and ensure zero errors
- [ ] T069 [US2] Verify no `any` types in TypeScript source using grep
- [ ] T070 [US2] Run linters and fix all warnings (eslint for TS, ruff for Python)

**Checkpoint**: Type checkers pass with zero errors, 100% type coverage for public APIs

---

## Phase 5: User Story 3 - Unified Error Handling (Priority: P2)

**Goal**: Consistent error handling with user-friendly messages and detailed logging

**Independent Test**: Trigger error scenarios and verify messages are user-friendly and logs contain debug details

### Error Handler Implementation

- [ ] T071 [P] [US3] Create ErrorHandler class in jarvis-cli/src/core/errors/handler.ts
- [ ] T072 [P] [US3] Create structured logger in jarvis-cli/src/utils/logger.ts
- [ ] T073 [P] [US3] Create error handler for MCP tools in jarvis-mcp/src/jarvis/mcp/error_handler.py
- [ ] T074 [P] [US3] Create structured logger in jarvis-mcp/src/jarvis/utils/logger.py
- [ ] T075 [US3] Integrate ErrorHandler into all CLI commands in jarvis-cli/src/commands/
- [ ] T076 [US3] Integrate error handler into all MCP tools in jarvis-mcp/src/jarvis/mcp/tools.py
- [ ] T077 [US3] Add JARVIS persona formatting to all error messages in jarvis-cli/src/utils/output.ts

### Error Recovery

- [ ] T078 [P] [US3] Implement retry logic with exponential backoff in jarvis-cli/src/api/client.ts
- [ ] T079 [P] [US3] Implement graceful degradation for failed memory operations in jarvis-mcp/src/jarvis/memory/core.py
- [ ] T080 [US3] Add error recovery tests in jarvis-cli/tests/integration/error-handling.test.ts
- [ ] T081 [US3] Add error recovery tests in jarvis-mcp/tests/integration/test_error_handling.py

### Documentation

- [ ] T082 [P] [US3] Create ADR-003: Error Hierarchy in docs/architecture/adr-003-error-hierarchy.md
- [ ] T083 [P] [US3] Document error handling patterns in docs/best-practices/typescript.md
- [ ] T084 [P] [US3] Document error handling patterns in docs/best-practices/python.md

**Checkpoint**: Errors handled consistently, user-friendly messages, detailed logs, graceful recovery

---

## Phase 6: User Story 4 - Modular Architecture (Priority: P2)

**Goal**: Loosely coupled components with well-defined interfaces and dependency injection

**Independent Test**: Run CLI tests without MCP server, swap memory layer without touching other code

### Dependency Injection

- [ ] T085 [P] [US4] Create CommandFactory in jarvis-cli/src/commands/factory.ts
- [ ] T086 [P] [US4] Create MemoryFactory in jarvis-mcp/src/jarvis/memory/factory.py
- [ ] T087 [US4] Refactor CLI entry point to use CommandFactory in jarvis-cli/src/index.ts
- [ ] T088 [US4] Refactor MCP server to use MemoryFactory in jarvis-mcp/src/jarvis/mcp/server.py
- [ ] T089 [US4] Update all commands to accept dependencies via constructor in jarvis-cli/src/commands/
- [ ] T090 [US4] Update all memory layers to accept dependencies via constructor in jarvis-mcp/src/jarvis/memory/

### Interface Compliance

- [ ] T091 [P] [US4] Ensure MCPClient implements IMCPClient interface in jarvis-cli/src/api/client.ts
- [ ] T092 [P] [US4] Ensure OutputFormatter implements IOutputFormatter interface in jarvis-cli/src/utils/output.ts
- [ ] T093 [P] [US4] Ensure FactualMemory implements IMemoryLayer protocol in jarvis-mcp/src/jarvis/memory/factual.py
- [ ] T094 [P] [US4] Ensure SemanticMemory implements IMemoryLayer protocol in jarvis-mcp/src/jarvis/memory/semantic.py
- [ ] T095 [P] [US4] Ensure SnapshotMemory implements IMemoryLayer protocol in jarvis-mcp/src/jarvis/memory/snapshot.py

### Testing Modularity

- [ ] T096 [US4] Create unit tests that mock all dependencies for each command in jarvis-cli/tests/unit/commands/
- [ ] T097 [US4] Create unit tests that mock storage backend for each memory layer in jarvis-mcp/tests/unit/memory/
- [ ] T098 [US4] Verify CLI tests run without MCP server running
- [ ] T099 [US4] Verify MCP tests run without CLI installed

### Documentation

- [ ] T100 [P] [US4] Create ADR-004: Dependency Injection in docs/architecture/adr-004-dependency-injection.md
- [ ] T101 [P] [US4] Document CLI-MCP interaction patterns in docs/architecture/cli-mcp-interaction.md

**Checkpoint**: Components loosely coupled, DI throughout, tests run independently

---

## Phase 7: User Story 5 - Comprehensive Testing (Priority: P2)

**Goal**: >85% test coverage with fast, reliable tests

**Independent Test**: Run test suite verifying all pass in <30s and coverage >85%

### Unit Tests Expansion

- [ ] T102 [P] [US5] Add edge case tests for all commands in jarvis-cli/tests/unit/commands/
- [ ] T103 [P] [US5] Add unit tests for all error classes in jarvis-cli/tests/unit/core/errors.test.ts
- [ ] T104 [P] [US5] Add unit tests for validators in jarvis-cli/tests/unit/core/validators.test.ts
- [ ] T105 [P] [US5] Add unit tests for all memory layers in jarvis-mcp/tests/unit/memory/
- [ ] T106 [P] [US5] Add unit tests for all MCP tools in jarvis-mcp/tests/unit/mcp/test_tools.py
- [ ] T107 [P] [US5] Add unit tests for error handler in jarvis-mcp/tests/unit/mcp/test_error_handler.py

### Integration Tests

- [ ] T108 [P] [US5] Create CLI-MCP integration tests in jarvis-cli/tests/integration/cli-mcp.test.ts
- [ ] T109 [P] [US5] Create memory layer integration tests in jarvis-mcp/tests/integration/test_memory_layers.py
- [ ] T110 [P] [US5] Create MCP tools integration tests in jarvis-mcp/tests/integration/test_mcp_tools.py

### E2E Tests

- [ ] T111 [US5] Create E2E test for init → remember → recall workflow in jarvis-cli/tests/integration/end-to-end.test.ts
- [ ] T112 [US5] Create E2E test for checkpoint → rollback workflow in jarvis-cli/tests/integration/end-to-end.test.ts
- [ ] T113 [US5] Create E2E test for scan → analyze workflow in jarvis-mcp/tests/e2e/test_workflows.py

### Coverage & Performance

- [ ] T114 [US5] Run coverage report for TypeScript: `npm run test:cov`
- [ ] T115 [US5] Run coverage report for Python: `uv run pytest --cov`
- [ ] T116 [US5] Identify and add tests for uncovered code paths
- [ ] T117 [US5] Optimize slow tests to meet <30s target for full suite

### Documentation

- [ ] T118 [P] [US5] Create ADR-005: Testing Strategy in docs/architecture/adr-005-testing-strategy.md
- [ ] T119 [P] [US5] Document testing patterns in docs/best-practices/typescript.md
- [ ] T120 [P] [US5] Document testing patterns in docs/best-practices/python.md

**Checkpoint**: Test coverage >85%, all tests pass in <30s, clear test structure

---

## Phase 8: User Story 6 - Performance Optimization (Priority: P3)

**Goal**: CLI init <100ms, remember <200ms, recall <500ms

**Independent Test**: Run benchmarks and verify all performance targets met

### Lazy Loading

- [ ] T121 [P] [US6] Implement lazy loading for embeddings model in jarvis-mcp/src/jarvis/utils/embeddings.py
- [ ] T122 [P] [US6] Implement lazy loading for heavy dependencies in jarvis-cli/src/api/client.ts
- [ ] T123 [US6] Refactor imports to use dynamic imports where appropriate in jarvis-cli/src/

### Caching

- [ ] T124 [P] [US6] Implement config cache in jarvis-cli/src/config/config.ts
- [ ] T125 [P] [US6] Implement project context cache in jarvis-mcp/src/jarvis/mcp/tools.py
- [ ] T126 [P] [US6] Implement embeddings cache in jarvis-mcp/src/jarvis/memory/semantic.py

### Async Operations

- [ ] T127 [P] [US6] Convert all file I/O to async in jarvis-mcp/src/jarvis/memory/
- [ ] T128 [P] [US6] Implement concurrent search across memory layers in jarvis-mcp/src/jarvis/memory/core.py
- [ ] T129 [P] [US6] Use asyncio.gather for parallel operations in jarvis-mcp/src/jarvis/capture/scanner.py

### Performance Monitoring

- [ ] T130 [P] [US6] Create PerformanceMonitor class in jarvis-cli/src/utils/performance.ts
- [ ] T131 [P] [US6] Create performance monitoring in jarvis-mcp/src/jarvis/utils/performance.py
- [ ] T132 [US6] Add performance logging to critical paths in both projects

### Benchmarking

- [ ] T133 [US6] Create benchmark script in jarvis-cli/benchmark.ts
- [ ] T134 [US6] Run benchmarks and verify CLI init <100ms
- [ ] T135 [US6] Run benchmarks and verify remember <200ms
- [ ] T136 [US6] Run benchmarks and verify recall <500ms
- [ ] T137 [US6] Profile and optimize any operations exceeding targets

**Checkpoint**: All performance targets met, monitoring in place

---

## Phase 9: User Story 7 - Developer Experience (Priority: P3)

**Goal**: Self-documenting code with comprehensive documentation

**Independent Test**: New developer completes onboarding in 4 hours using documentation alone

### API Documentation

- [ ] T138 [P] [US7] Add TSDoc comments to all public APIs in jarvis-cli/src/
- [ ] T139 [P] [US7] Add Google-style docstrings to all public APIs in jarvis-mcp/src/jarvis/
- [ ] T140 [US7] Generate TypeScript API docs: `npx typedoc src/index.ts`
- [ ] T141 [US7] Generate Python API docs: `uv run pdoc src/jarvis --html --output-dir docs/api`

### Architecture Documentation

- [ ] T142 [P] [US7] Complete docs/architecture/overview.md with system architecture diagrams
- [ ] T143 [P] [US7] Complete docs/architecture/cli-mcp-interaction.md with sequence diagrams
- [ ] T144 [P] [US7] Update README files in jarvis-cli/ and jarvis-mcp/ with refactor changes

### Code Examples

- [ ] T145 [P] [US7] Add usage examples to all command docstrings in jarvis-cli/src/commands/
- [ ] T146 [P] [US7] Add usage examples to all MCP tool docstrings in jarvis-mcp/src/jarvis/mcp/tools.py
- [ ] T147 [P] [US7] Create code example snippets in docs/examples/

### Onboarding Guide

- [ ] T148 [US7] Create developer setup guide in docs/CONTRIBUTING.md
- [ ] T149 [US7] Create troubleshooting guide in docs/TROUBLESHOOTING.md
- [ ] T150 [US7] Test onboarding process with new developer (4-hour target)

**Checkpoint**: Documentation complete, API docs generated, onboarding validated

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Final improvements and validation

### Remaining Commands

- [ ] T151 [P] Write characterization tests for DoctorCommand in jarvis-cli/tests/unit/commands/doctor.test.ts
- [ ] T152 Refactor DoctorCommand to extend BaseCommand in jarvis-cli/src/commands/doctor.ts
- [ ] T153 [P] Write characterization tests for CheckpointCommand in jarvis-cli/tests/unit/commands/checkpoint.test.ts
- [ ] T154 Refactor CheckpointCommand to extend BaseCommand in jarvis-cli/src/commands/checkpoint.ts
- [ ] T155 [P] Write characterization tests for RollbackCommand in jarvis-cli/tests/unit/commands/rollback.test.ts
- [ ] T156 Refactor RollbackCommand to extend BaseCommand in jarvis-cli/src/commands/rollback.ts
- [ ] T157 [P] Write characterization tests for ValidateCommand in jarvis-cli/tests/unit/commands/validate.test.ts
- [ ] T158 Refactor ValidateCommand to extend BaseCommand in jarvis-cli/src/commands/validate.ts
- [ ] T159 [P] Write characterization tests for CleanupCommand in jarvis-cli/tests/unit/commands/cleanup.test.ts
- [ ] T160 Refactor CleanupCommand to extend BaseCommand in jarvis-cli/src/commands/cleanup.ts

### Code Quality

- [ ] T161 [P] Run complexity analysis and refactor functions with cyclomatic complexity >10
- [ ] T162 [P] Remove code duplication using DRY principle
- [ ] T163 [P] Ensure all functions are <50 lines
- [ ] T164 Run linters and fix all warnings (eslint, ruff)
- [ ] T165 Run formatters (prettier, black) on all code

### Final Validation

- [ ] T166 Run all tests: `npm test` and `uv run pytest`
- [ ] T167 Verify test coverage >85% on both projects
- [ ] T168 Run type checkers: zero errors in both projects
- [ ] T169 Run performance benchmarks: all targets met
- [ ] T170 Verify backward compatibility: all existing functionality works
- [ ] T171 Run quickstart.md validation checklist
- [ ] T172 Build and test CLI distribution: `npm run build && ./dist/index.js status`

### Documentation Finalization

- [ ] T173 [P] Update CHANGELOG.md with refactor changes
- [ ] T174 [P] Update version numbers to v0.2.0-refactor
- [ ] T175 [P] Create migration guide for contributors in docs/MIGRATION.md
- [ ] T176 Review and finalize all ADRs in docs/architecture/

**Checkpoint**: All quality gates passed, ready for merge to main

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - start immediately
- **Foundational (Phase 2)**: Depends on Setup (Phase 1) - BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational (Phase 2)
- **User Story 2 (Phase 4)**: Depends on Foundational (Phase 2) + User Story 1
- **User Story 3 (Phase 5)**: Depends on Foundational (Phase 2) + User Story 1
- **User Story 4 (Phase 6)**: Depends on User Story 1-3
- **User Story 5 (Phase 7)**: Depends on User Story 1-4
- **User Story 6 (Phase 8)**: Depends on User Story 1-5
- **User Story 7 (Phase 9)**: Depends on User Story 1-6
- **Polish (Phase 10)**: Depends on all user stories

### User Story Independence

While phases are sequential, within each phase:

- All tasks marked [P] can run in parallel
- Each user story focuses on different aspects of the refactor
- User Story 1 (Code Organization) → Foundation for all others
- User Story 2 (Type Safety) → Can start after US1 foundations
- User Story 3-7 → Build incrementally on previous stories

### Parallel Opportunities by Phase

**Phase 1 - Setup**: All 7 tasks can run in parallel

**Phase 2 - Foundational**:

- Error hierarchy tasks (T008-T013) can run in parallel
- Interface definition tasks (T014-T022) can run in parallel
- Test infrastructure tasks (T023-T026) can run in parallel
- Then T027-T028 sequentially

**Phase 3 - US1**: Command refactoring can be parallelized:

- Different commands (init, status, config, etc.) can be refactored in parallel
- Memory layers can be refactored in parallel
- Documentation can be written in parallel

**Phases 4-9**: Many tasks marked [P] within each phase

---

## Parallel Example: User Story 1 - Code Maintainability

```bash
# Week 1: Parallel command refactoring
Developer A: T029-T032 (InitCommand)
Developer B: T033-T034 (StatusCommand)
Developer C: T035-T036 (ConfigCommand)

# Week 2: Continue parallel work
Developer A: T037-T038 (ScanCommand)
Developer B: T039-T040 (RememberCommand)
Developer C: T041-T042 (RecallCommand)

# Week 2: Parallel memory layer refactoring
Developer A: T043-T044 (BaseMemory + FactualMemory)
Developer B: T045 (SemanticMemory)
Developer C: T046 (SnapshotMemory)

# Anytime: Parallel documentation
Developer D: T048-T051 (All ADRs and docs)
```

---

## Implementation Strategy

### MVP First (Phases 1-3 Only)

1. Complete Phase 1: Setup (1-2 days)
2. Complete Phase 2: Foundational (3-5 days)
3. Complete Phase 3: User Story 1 - Code Maintainability (1 week)
4. **STOP and VALIDATE**: Tests pass, code organized, patterns clear
5. Can continue or pause with improved codebase

### Incremental Delivery

1. Setup + Foundational (1 week) → Foundation ready
2. - User Story 1 (1 week) → Code organized, patterns established
3. - User Story 2 (1 week) → Fully type-safe codebase
4. - User Story 3 (3-4 days) → Robust error handling
5. - User Story 4 (3-4 days) → Modular architecture
6. - User Story 5 (3-4 days) → High test coverage
7. - User Story 6 (2-3 days) → Performance optimized
8. - User Story 7 (2-3 days) → Well documented
9. - Polish (2-3 days) → Production ready

**Total: 6 weeks** (40 working days as per quickstart.md)

### Parallel Team Strategy

With 3-4 developers:

1. **Week 1-2**: All work together on Setup + Foundational
2. **Week 3**: All work on User Story 1 (different commands in parallel)
3. **Week 4**: Split into pairs:
   - Pair 1: User Story 2 (Type Safety)
   - Pair 2: User Story 3 (Error Handling)
4. **Week 5**: Continue:
   - Pair 1: User Story 4 (Modularity)
   - Pair 2: User Story 5 (Testing)
5. **Week 6**: Final push:
   - All: User Story 6, 7, and Polish in parallel

---

## Success Metrics Tracking

| Metric                 | Before | Target | Track With              |
| ---------------------- | ------ | ------ | ----------------------- |
| TypeScript `any` count | ~50    | 0      | `grep -r "any" src/`    |
| Type errors            | ~100   | 0      | `npm run typecheck`     |
| Test coverage (TS)     | 75%    | >85%   | `npm run test:cov`      |
| Test coverage (Py)     | 75%    | >85%   | `uv run pytest --cov`   |
| Test time              | 45s    | <30s   | `npm test` / `pytest`   |
| CLI init time          | 150ms  | <100ms | Benchmark script        |
| Cyclomatic complexity  | ~15    | <10    | Code analysis tools     |
| Linter warnings        | ~30    | 0      | `npm run lint` / `ruff` |

---

## Notes

- **[P] marker**: Tasks can run in parallel (different files, no blocking dependencies)
- **[Story] label**: Maps task to user story for traceability (US1-US7)
- **Commit frequency**: After each task or logical group (every 2-3 tasks)
- **Testing**: Run tests after every phase to catch issues early
- **Rollback**: Each user story is independently functional - can stop at any checkpoint
- **Focus**: Maintain backward compatibility throughout (FR-031 to FR-035)
- **JARVIS persona**: Keep "Sir" address and JARVIS tone in all user-facing changes

---

## Quality Gates Before Merge

- [ ] All 176 tasks completed
- [ ] All tests pass (both projects)
- [ ] Test coverage >85% (both projects)
- [ ] Zero type errors (TypeScript strict + mypy strict)
- [ ] Zero linter warnings
- [ ] All performance targets met
- [ ] All 5 ADRs documented
- [ ] API documentation generated
- [ ] Backward compatibility verified
- [ ] No regressions in existing functionality
- [ ] New developer onboarding validated (<4 hours)
