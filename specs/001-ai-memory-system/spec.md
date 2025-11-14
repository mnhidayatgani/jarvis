# Feature Specification: JARVIS - AI Coding Agent Memory System

**Feature Branch**: `001-ai-memory-system`  
**Created**: 2025-11-15  
**Status**: Draft  
**Input**: User description: "JARVIS is an AI coding agent memory system designed to provide consistent, context-aware development assistance across multiple projects."

## User Scenarios & Testing _(mandatory)_

<!--
  IMPORTANT: User stories should be PRIORITIZED as user journeys ordered by importance.
  Each user story/journey must be INDEPENDENTLY TESTABLE - meaning if you implement just ONE of them,
  you should still have a viable MVP (Minimum Viable Product) that delivers value.

  Assign priorities (P1, P2, P3, etc.) to each story, where P1 is the most critical.
  Think of each story as a standalone slice of functionality that can be:
  - Developed independently
  - Tested independently
  - Deployed independently
  - Demonstrated to users independently
-->

### User Story 1 - Initialize Project Memory (Priority: P1)

As a developer, I want to initialize JARVIS in a new project so that it can start tracking context and decisions from the beginning.

**Why this priority**: Foundation for all other features. Without initialization, no memory system can function. This is the absolute minimum viable product - a developer can initialize JARVIS and start using it immediately.

**Independent Test**: Can be fully tested by running `jarvis init` in an empty directory and verifying the `.jarvis/` directory structure is created with SQLite and ChromaDB databases initialized.

**Acceptance Scenarios**:

1. **Given** an empty project directory, **When** I run `jarvis init`, **Then** `.jarvis/` directory is created with config, SQLite database, and ChromaDB collection
2. **Given** a project with existing `.jarvis/` directory, **When** I run `jarvis init`, **Then** system warns and asks for confirmation before reinitializing
3. **Given** a project without git, **When** I run `jarvis init`, **Then** system initializes memory but warns that auto-capture will be limited

---

### User Story 2 - Manual Memory Capture (Priority: P1)

As a developer, I want to manually record decisions and context so that JARVIS remembers important information I explicitly want to preserve.

**Why this priority**: Core memory function. Even without auto-capture, developers can manually build context. This makes the system immediately useful.

**Independent Test**: Can be fully tested by running `jarvis remember "We chose PostgreSQL for better JSON support"` and then `jarvis recall "database choice"` to verify retrieval.

**Acceptance Scenarios**:

1. **Given** an initialized project, **When** I run `jarvis remember "We chose X because Y"`, **Then** the decision is stored in semantic memory with timestamp
2. **Given** stored memories, **When** I run `jarvis recall "database"`, **Then** relevant memories are returned ranked by relevance with timestamps
3. **Given** a long memory text (>1000 words), **When** I try to remember it, **Then** system accepts it and chunks appropriately for embedding

---

### User Story 3 - Onboard Existing Project (Priority: P2)

As a developer, I want JARVIS to understand my existing codebase so that it can provide context-aware assistance without me explaining everything.

**Why this priority**: Critical for adoption - most developers have existing projects. This story delivers immediate value by scanning and understanding current state.

**Independent Test**: Can be fully tested by running `jarvis scan` in an existing project and verifying the generated report contains tech stack, file structure, and inconsistencies.

**Acceptance Scenarios**:

1. **Given** an existing project with code, **When** I run `jarvis scan`, **Then** system analyzes tech stack, dependencies, and file structure in <5 minutes
2. **Given** scan results with inconsistencies, **When** scan completes, **Then** system generates tiered report with summary and asks clarifying questions
3. **Given** user answers to clarifying questions, **When** I provide context, **Then** JARVIS stores answers in semantic memory and confirms understanding

---

### User Story 4 - Auto-Capture Code Changes (Priority: P2)

As a developer, I want JARVIS to automatically track my code changes so that I don't have to manually record every modification.

**Why this priority**: Reduces friction - automatic capture means developers get memory benefits without extra work. Makes the system feel intelligent and helpful.

**Independent Test**: Can be fully tested by making a git commit and verifying JARVIS captured the diff, file paths, and commit message in memory.

**Acceptance Scenarios**:

1. **Given** git hooks installed, **When** I make a commit, **Then** JARVIS captures file paths, diffs, commit message, and timestamp
2. **Given** uncommitted file changes, **When** file watcher detects modifications, **Then** JARVIS tracks changes without blocking my workflow
3. **Given** ignored files (.gitignore), **When** changes occur in them, **Then** JARVIS does not capture these changes

---

### User Story 5 - Semantic Context Retrieval (Priority: P2)

As a developer, I want to find past decisions and context by meaning rather than exact keywords so that I can quickly recall "why we did something" without remembering exact phrases.

**Why this priority**: Key differentiator from simple text search. Semantic search makes the memory system truly intelligent and natural to use.

**Independent Test**: Can be fully tested by storing "We chose Redux for state management" and querying "state library decision" to verify semantic match.

**Acceptance Scenarios**:

1. **Given** semantic memories stored, **When** I query "the database bug we fixed last week", **Then** relevant bug fixes from the past 7 days are returned
2. **Given** multiple relevant memories, **When** I search, **Then** results are ranked by relevance score and include context snippets
3. **Given** a query with time filter, **When** I search "decisions since March", **Then** only memories after March are returned

---

### User Story 6 - JARVIS Persona Communication (Priority: P3)

As a developer, I want JARVIS to communicate like the MCU character so that interactions feel consistent, professional, and efficient.

**Why this priority**: Enhances user experience but not critical for functionality. Can be implemented after core features work.

**Independent Test**: Can be fully tested by running any command and verifying responses are concise, address user as "Sir", and are in English only.

**Acceptance Scenarios**:

1. **Given** any successful command, **When** operation completes, **Then** JARVIS responds with concise confirmation like "Done, Sir" not verbose explanations
2. **Given** input in non-English language, **When** I interact with JARVIS, **Then** responses are always in English
3. **Given** an error situation, **When** JARVIS responds, **Then** tone is calm, professional, and provides clear next steps

---

### User Story 7 - Safety Checkpoints & Rollback (Priority: P3)

As a developer, I want JARVIS to create safety checkpoints before risky changes so that I can easily undo if something goes wrong.

**Why this priority**: Important for trust and safety but builds on core memory functions. Can be added after basic memory system works.

**Independent Test**: Can be fully tested by having JARVIS make a multi-file change, then running `jarvis rollback` to verify all files are restored.

**Acceptance Scenarios**:

1. **Given** JARVIS about to modify >5 files, **When** operation starts, **Then** git stash checkpoint is created with timestamp and reason
2. **Given** a failed validation after changes, **When** auto-fix attempts fail, **Then** JARVIS automatically rolls back to checkpoint
3. **Given** multiple checkpoints, **When** I run `jarvis rollback 2`, **Then** last 2 operations are undone atomically

---

### User Story 8 - MCP Server Integration (Priority: P3)

As a developer, I want AI agents like GitHub Copilot to connect to JARVIS memory so that they can provide context-aware assistance.

**Why this priority**: Advanced integration feature. Core memory must work first before exposing via MCP protocol.

**Independent Test**: Can be fully tested by calling MCP tool `recall_context("database choice")` from Copilot and verifying it returns JARVIS memories.

**Acceptance Scenarios**:

1. **Given** MCP server running, **When** Copilot calls `remember_context()` tool, **Then** content is stored in JARVIS memory with timestamp
2. **Given** stored memories, **When** Copilot calls `recall_context()` tool, **Then** relevant memories are returned with JARVIS persona formatting
3. **Given** multiple projects, **When** Copilot switches projects via `switch_project()` tool, **Then** memory context switches to correct project

---

### User Story 9 - Spec Kit Workflow Integration (Priority: P3)

As a developer, I want to use Spec Kit commands through JARVIS so that all specifications and plans are stored in memory automatically.

**Why this priority**: Nice-to-have integration. Spec Kit can work independently, this just adds memory persistence.

**Independent Test**: Can be fully tested by running `jarvis specify "photo album"` and verifying spec is created and stored in memory for later recall.

**Acceptance Scenarios**:

1. **Given** initialized project, **When** I run `jarvis specify <description>`, **Then** feature spec is created and stored in semantic memory
2. **Given** past specs in memory, **When** planning new feature, **Then** JARVIS references similar past specs for consistency
3. **Given** spec with decisions, **When** I run `jarvis recall "photo album requirements"`, **Then** original spec content is returned

---

### Edge Cases

- What happens when ChromaDB becomes corrupted or unavailable?
  - Fallback to keyword search in SQLite, warn user, suggest repair
- What happens when memory databases exceed 10GB?
  - Warn user at 8GB, suggest cleanup, provide retention policy options
- What happens when git hooks conflict with existing hooks?
  - Detect existing hooks, offer to merge, provide manual installation option
- What happens when semantic search returns 0 results?
  - Suggest alternative queries, offer keyword fallback, check if memory is empty
- What happens when user provides non-English input?
  - Accept input, process it, respond in English as per persona requirements
- What happens when rollback checkpoint doesn't exist?
  - Inform user no checkpoint available, suggest alternatives (git reflog)
- What happens when MCP server port is already in use?
  - Try alternative ports (3000-3010), inform user of selected port, update config
- What happens when project is moved to different directory?
  - Memory uses relative paths, detect move, offer to update absolute references

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST implement 3-layer memory architecture: L1 (conversation context), L2 (project memory: SQLite + ChromaDB + filesystem), L3 (LLM base knowledge)
- **FR-002**: System MUST store factual data in SQLite including tech stack, file structure map, coding conventions, dependencies, and configuration values
- **FR-003**: System MUST store semantic data in ChromaDB including decisions with reasoning, bug descriptions and fixes, architecture explanations, and code patterns
- **FR-004**: System MUST use bge-large-en-v1.5 embeddings for semantic search with local execution (no API dependency)
- **FR-005**: System MUST support semantic queries with natural language, time-based filtering, file-based filtering, and type filtering
- **FR-006**: System MUST capture code changes via git pre-commit hooks (committed changes) and file watcher (uncommitted changes)
- **FR-007**: System MUST detect architecture changes including new directories, file moves (>50% of directory), dependency changes, and configuration changes
- **FR-008**: System MUST create safety checkpoints before modifying >5 files, deleting files, changing configuration, or major refactoring
- **FR-009**: System MUST validate changes post-modification via syntax check, linter, tests (if available), and build (if applicable)
- **FR-010**: System MUST auto-rollback when validation fails after 3 fix attempts using different approaches
- **FR-011**: System MUST respond in English only, address user as "Sir", use concise point-based format, and provide details only when explicitly asked
- **FR-012**: System MUST implement MCP protocol server exposing tools: remember_context, recall_context, analyze_codebase, validate_changes, get_architecture, create_checkpoint, rollback
- **FR-013**: System MUST support CLI commands: init, scan, remember, recall, status, rollback, config, doctor, specify, plan, implement
- **FR-014**: System MUST complete memory queries in <2 seconds for databases up to 10GB
- **FR-015**: System MUST complete project scans in <5 minutes for projects up to 10k files
- **FR-016**: System MUST maintain memory footprint <100MB excluding database storage
- **FR-017**: System MUST auto-capture with <5% CPU overhead during normal operations
- **FR-018**: System MUST ensure rollback success rate of 100% with no data loss
- **FR-019**: System MUST isolate project memories by project identifier (path hash)
- **FR-020**: System MUST persist memory across application restarts, system reboots, and project directory moves (using relative paths)
- **FR-021**: System MUST sanitize all user input to prevent injection attacks
- **FR-022**: System MUST store API keys in system keyring, never in plaintext
- **FR-023**: System MUST NOT capture files matching .gitignore patterns
- **FR-024**: System MUST NOT capture sensitive data (API keys, passwords, tokens)
- **FR-025**: System MUST support Python 3.10, 3.11, 3.12 on Linux (primary), macOS, and Windows

### Key Entities _(include if feature involves data)_

- **Memory Entry**: Represents stored information with attributes: id, type (factual/semantic/snapshot), content, embedding (for semantic), timestamp, project_id, metadata (tags, file_paths, related_ids)
- **Project Context**: Represents project metadata with attributes: id (path hash), name, root_path, tech_stack, dependencies, file_structure_map, coding_conventions, configuration
- **Decision Record**: Represents captured decisions with attributes: id, description, reasoning, alternatives_considered, timestamp, related_files, related_memories
- **Code Change**: Represents tracked modifications with attributes: id, file_path, change_type (add/modify/delete), diff_content, commit_sha, timestamp, decision_id (optional link)
- **Checkpoint**: Represents safety snapshots with attributes: id, git_stash_ref, timestamp, reason, files_affected, memory_snapshot_id
- **Configuration**: Represents user and project settings with attributes: scope (global/project), preferences (language, response_style, persona_settings), retention_policies, mcp_server_config

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Memory query response time must be <2 seconds for 95th percentile across databases up to 10GB
- **SC-002**: Auto-capture accuracy must be >95% of all relevant code changes and decisions captured without false negatives
- **SC-003**: Rollback success rate must be 100% with zero data loss incidents across all rollback operations
- **SC-004**: System memory footprint must remain <100MB excluding database storage during normal operations
- **SC-005**: Project onboarding via `jarvis scan` must complete in <5 minutes for codebases up to 10k files
- **SC-006**: Context switch overhead between projects must be <10 seconds from command to ready state
- **SC-007**: User satisfaction metric: Post-MVP feedback indicates "Feels like working with MCU JARVIS" from 80% of users
- **SC-008**: Auto-fix success rate must be >70% for common issues (syntax errors, import errors) within 3 attempts
- **SC-009**: Semantic search relevance must show >90% of top-3 results are contextually relevant to query intent
- **SC-010**: Installation and initialization must complete in <2 minutes from `pip install` to `jarvis init` success
