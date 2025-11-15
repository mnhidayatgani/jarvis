# Feature Specification: Full Codebase Refactor

**Feature Branch**: `002-full-refactor`  
**Created**: November 15, 2025  
**Status**: Draft  
**Input**: User description: "Full refactor pada jarvis CLI dan jarvis MCP untuk meningkatkan arsitektur, maintainability, dan code quality"

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Improved Code Maintainability (Priority: P1)

Developers working on JARVIS codebase can easily navigate, understand, and modify code without deep system knowledge. Code follows consistent patterns, has clear separation of concerns, and includes comprehensive documentation.

**Why this priority**: Foundation for all future development - poor code organization blocks all other improvements and makes bug fixes risky.

**Independent Test**: New developer can locate and modify a specific feature (e.g., add validation rule to `remember` command) in under 30 minutes by following code organization patterns and inline documentation.

**Acceptance Scenarios**:

1. **Given** a developer needs to add a new CLI command, **When** they review the existing command structure, **Then** they can implement it by following the established pattern without consulting other developers
2. **Given** a developer encounters a bug in memory operations, **When** they trace the code flow, **Then** they can identify the issue within a single, well-defined module
3. **Given** a developer wants to add a new memory type, **When** they review the memory architecture, **Then** they find clear extension points with documented interfaces

---

### User Story 2 - Enhanced Type Safety & Error Prevention (Priority: P1)

Development team catches errors at compile/lint time rather than runtime. Type system prevents common bugs like null references, wrong parameter types, and invalid state transitions.

**Why this priority**: Prevents production bugs and reduces debugging time - essential for system reliability and developer productivity.

**Independent Test**: Can be fully tested by running type checker and linter on the entire codebase and verifying zero type errors, zero linter warnings, and 100% type coverage for public APIs.

**Acceptance Scenarios**:

1. **Given** strict TypeScript configuration is enabled, **When** developer compiles code, **Then** all function parameters, return types, and variables have explicit types
2. **Given** Python code uses strict mypy configuration, **When** type checking runs, **Then** all functions have complete type hints and pass strict type validation
3. **Given** developer tries to pass wrong parameter type, **When** code is compiled/checked, **Then** clear type error message appears before runtime

---

### User Story 3 - Unified Error Handling & Logging (Priority: P2)

All errors are handled consistently across CLI and MCP server. Users receive helpful error messages, developers get detailed logs for debugging, and errors never crash the application silently.

**Why this priority**: Critical for production reliability and user experience - inconsistent errors confuse users and make debugging difficult.

**Independent Test**: Can be fully tested by triggering common error scenarios (file not found, permission denied, network timeout) and verifying error messages are user-friendly, logs contain debugging details, and system recovers gracefully.

**Acceptance Scenarios**:

1. **Given** an operation fails, **When** error occurs in CLI, **Then** user sees JARVIS-styled error message with actionable guidance and developers see detailed stack trace in logs
2. **Given** MCP server encounters error, **When** processing tool call, **Then** returns structured error response with error code, message, and suggested resolution
3. **Given** critical system error occurs, **When** error is logged, **Then** includes timestamp, context (command/tool name), stack trace, and system state

---

### User Story 4 - Modular Architecture with Clear Boundaries (Priority: P2)

System components are loosely coupled with well-defined interfaces. CLI and MCP server can be developed, tested, and deployed independently. Memory layers are truly separate and interchangeable.

**Why this priority**: Enables parallel development, easier testing, and future extensibility - essential for scaling the codebase.

**Independent Test**: Can be fully tested by running CLI tests without MCP server, running MCP tests without CLI, and replacing one memory layer (e.g., swap ChromaDB for different vector DB) without touching other layers.

**Acceptance Scenarios**:

1. **Given** developer wants to change semantic search implementation, **When** they modify `SemanticMemory` class, **Then** no changes needed in CLI code or other memory layers
2. **Given** team wants to add new MCP tool, **When** implementing in `tools.py`, **Then** no changes needed to core memory classes or server infrastructure
3. **Given** developer runs unit tests, **When** testing CLI commands, **Then** tests run without starting MCP server or database connections

---

### User Story 5 - Comprehensive Testing Infrastructure (Priority: P2)

All critical code paths have automated tests. Tests run fast, are reliable, and provide clear failure messages. Code coverage meets quality standards (>80%).

**Why this priority**: Prevents regressions and enables confident refactoring - essential for maintaining quality as codebase grows.

**Independent Test**: Can be fully tested by running full test suite and verifying all tests pass in under 30 seconds, coverage exceeds 80%, and mutation testing shows tests catch real bugs.

**Acceptance Scenarios**:

1. **Given** developer makes breaking change, **When** running test suite, **Then** relevant tests fail with clear messages indicating what broke and where
2. **Given** new feature is added, **When** pull request is submitted, **Then** code coverage for new code is >80% and all edge cases are tested
3. **Given** developer wants to refactor code, **When** running tests after changes, **Then** test suite completes in under 30 seconds and all pass

---

### User Story 6 - Optimized Performance & Resource Usage (Priority: P3)

JARVIS operations complete quickly and use minimal system resources. CLI commands respond instantly (<100ms), searches return results quickly (<500ms), and memory usage stays reasonable (<100MB).

**Why this priority**: Improves user experience but not blocking - system currently works, optimization can happen incrementally.

**Independent Test**: Can be fully tested by benchmarking common operations (init, remember, recall) and verifying execution times and memory usage meet defined thresholds.

**Acceptance Scenarios**:

1. **Given** user runs `jarvis remember` with 100-word note, **When** command executes, **Then** completes in under 100ms including disk write
2. **Given** user runs `jarvis recall` with semantic search, **When** searching 10,000 memories, **Then** returns results in under 500ms
3. **Given** JARVIS is running, **When** monitoring system resources, **Then** memory usage stays under 100MB and CPU usage is negligible when idle

---

### User Story 7 - Developer Experience & Documentation (Priority: P3)

Code is self-documenting with clear naming, comprehensive docstrings, and architectural documentation. New developers can onboard quickly and contribute confidently.

**Why this priority**: Accelerates development and reduces onboarding time but lower priority than core functionality.

**Independent Test**: Can be fully tested by having new developer complete onboarding checklist: set up environment, fix a bug, add a feature, all within 4 hours using only project documentation.

**Acceptance Scenarios**:

1. **Given** new developer reads architecture documentation, **When** understanding system design, **Then** can explain 3-layer memory architecture, CLI-MCP separation, and data flow without consulting team
2. **Given** developer reviews function signature, **When** reading docstring, **Then** understands purpose, parameters, return value, and error conditions without reading implementation
3. **Given** developer wants to contribute, **When** following setup guide, **Then** can install dependencies, run tests, and make first commit within 2 hours

---

### Edge Cases

- What happens when refactored code must maintain backward compatibility with existing `.jarvis` directories and data formats?
- How does refactor handle migration of existing user data and configurations without data loss?
- What happens when tests fail during refactor - how to identify if it's test issue or actual regression?
- How does system handle concurrent development on other features while refactor is in progress?
- What happens when performance optimization conflicts with code clarity?

## Requirements _(mandatory)_

### Functional Requirements

#### Code Organization

- **FR-001**: System MUST organize CLI commands using consistent command pattern with separate parse/validate/execute phases
- **FR-002**: System MUST separate MCP tool definitions from business logic using adapter pattern
- **FR-003**: System MUST implement memory layers as independent modules with defined interfaces
- **FR-004**: System MUST use dependency injection for testability and loose coupling
- **FR-005**: System MUST maintain clear separation between CLI (presentation), API client (communication), and MCP server (business logic)

#### Type Safety

- **FR-006**: TypeScript code MUST use strict mode with no implicit `any` types
- **FR-007**: Python code MUST pass strict mypy checking with complete type hints for all public APIs
- **FR-008**: System MUST define shared type definitions/interfaces in centralized location
- **FR-009**: System MUST use type guards and validators for runtime type safety at boundaries
- **FR-010**: System MUST document complex types with TSDoc/docstrings including examples

#### Error Handling

- **FR-011**: System MUST implement custom error hierarchy with specific error types (ValidationError, DatabaseError, NetworkError, etc.)
- **FR-012**: System MUST provide user-friendly error messages for CLI while logging technical details
- **FR-013**: System MUST never silently swallow errors - all errors must be logged or returned
- **FR-014**: System MUST include error recovery strategies (retry with backoff, fallback mechanisms)
- **FR-015**: System MUST format all user-facing errors using JARVIS persona

#### Testing

- **FR-016**: System MUST have unit tests for all business logic with >80% code coverage
- **FR-017**: System MUST have integration tests for CLI-MCP communication paths
- **FR-018**: System MUST have E2E tests for critical user workflows (init, remember, recall)
- **FR-019**: System MUST use test fixtures and factories for consistent test data
- **FR-020**: System MUST mock external dependencies (filesystem, git, databases) in unit tests

#### Performance

- **FR-021**: CLI command initialization MUST complete in under 100ms
- **FR-022**: Memory operations (remember) MUST complete in under 200ms for 1KB data
- **FR-023**: Search operations (recall) MUST complete in under 500ms for 10K entries
- **FR-024**: System MUST use lazy loading for heavy dependencies (embeddings model)
- **FR-025**: System MUST implement caching for frequently accessed data (project context)

#### Documentation

- **FR-026**: System MUST include architectural decision records (ADRs) for major design choices
- **FR-027**: All public APIs MUST have comprehensive docstrings with parameter descriptions, return types, examples, and error conditions
- **FR-028**: System MUST maintain up-to-date README files with setup, usage, and contribution guidelines
- **FR-029**: Complex algorithms MUST include inline comments explaining the "why" not just "what"
- **FR-030**: System MUST generate API documentation automatically from code annotations

#### Backward Compatibility

- **FR-031**: System MUST support existing `.jarvis` directory structure without migration
- **FR-032**: System MUST maintain compatibility with existing config.json format
- **FR-033**: System MUST not break existing git hooks during refactor
- **FR-034**: System MUST preserve all existing CLI command signatures and behavior
- **FR-035**: System MUST maintain MCP tool contracts unchanged

### Key Entities

Since this is a refactoring effort, the key entities remain the same as defined in the original specification, but with improved structure:

- **Module**: Represents a logical unit of code (e.g., FactualMemory, MCPTools, InitCommand) with clear boundaries, dependencies, and interfaces
- **Interface Contract**: Defines the public API between modules including method signatures, parameter types, return types, and error conditions
- **Error Type**: Specific error class in the error hierarchy representing different failure modes with contextual information
- **Test Suite**: Collection of tests for a module including unit tests, integration tests, and test fixtures
- **Configuration**: System and user settings organized in layers (defaults, global, project-specific) with validation schemas

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: All TypeScript code passes strict type checking with zero type errors and zero `any` types in source code
- **SC-002**: All Python code passes strict mypy checking with 100% type coverage for public APIs
- **SC-003**: Test suite achieves >85% code coverage across both CLI and MCP codebase
- **SC-004**: All tests complete in under 30 seconds for fast feedback during development
- **SC-005**: Zero regressions - all existing functionality works identically after refactor
- **SC-006**: CLI command initialization completes in under 100ms measured on standard hardware
- **SC-007**: Code complexity metrics improve by 30% (lower cyclomatic complexity, fewer code smells)
- **SC-008**: New developer can complete onboarding and make first contribution within 4 hours using documentation alone
- **SC-009**: 90% of functions and classes have comprehensive docstrings meeting documentation standards
- **SC-010**: Zero production errors caused by type mismatches or unhandled edge cases in first month after deployment
