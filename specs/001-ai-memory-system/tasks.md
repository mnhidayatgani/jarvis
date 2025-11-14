# Tasks: JARVIS - AI Coding Agent Memory System

**Input**: Design documents from `/specs/001-ai-memory-system/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Tests are NOT included in this implementation as they were not explicitly requested in the feature specification.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `- [ ] [ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Dual project**: `jarvis-mcp/src/`, `jarvis-cli/src/` at repository root
- Paths shown below use dual project structure from plan.md

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure for both jarvis-mcp and jarvis-cli

- [x] T001 Create jarvis-mcp directory structure (src/jarvis/{memory,mcp,capture,speckit,utils}, tests/{unit,integration,e2e})
- [x] T002 [P] Create jarvis-cli directory structure (src/{commands,api,config,utils}, tests/{unit,integration})
- [x] T003 [P] Create jarvis-mcp/pyproject.toml with dependencies (chromadb==0.4.24, sentence-transformers, watchdog, uv dev deps)
- [x] T004 [P] Create jarvis-cli/package.json with dependencies (esbuild, typescript, vitest, eslint, prettier, pnpm config)
- [x] T005 [P] Create jarvis-cli/tsconfig.json with strict mode and ESM configuration
- [x] T006 [P] Create jarvis-cli/.eslintrc.json with Airbnb + TypeScript rules
- [x] T007 [P] Create jarvis-cli/.prettierrc.json with constitution-compliant formatting (single quotes, no semicolons)
- [x] T008 [P] Create jarvis-cli/vitest.config.ts for testing configuration
- [x] T009 [P] Create all **init**.py files for Python packages in jarvis-mcp/src/jarvis/
- [x] T010 [P] Create .gitignore files for both projects (Python-specific and Node-specific)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T011 Implement Configuration class in jarvis-mcp/src/jarvis/utils/config.py (load global ~/.jarvis/config.json, merge with project .jarvis/config.json)
- [x] T012 Implement get_config(), set_config(), validate_config() methods in jarvis-mcp/src/jarvis/utils/config.py
- [x] T013 Implement project_id generation (SHA256 hash of absolute path) in jarvis-mcp/src/jarvis/utils/config.py
- [x] T014 [P] Implement JARVIS persona formatter in jarvis-mcp/src/jarvis/utils/persona.py (format_response(), address_as_sir(), ensure_english())
- [x] T015 [P] Implement embeddings wrapper in jarvis-mcp/src/jarvis/utils/embeddings.py (load bge-large-en-v1.5 model, generate_embedding(), batch_embed())
- [x] T016 Create SQLite schema for MemoryEntry, ProjectContext tables in jarvis-mcp/src/jarvis/memory/schema.sql
- [x] T017 Implement FactualMemory class in jarvis-mcp/src/jarvis/memory/factual.py (initialize SQLite, CRUD operations for MemoryEntry)
- [x] T018 Implement create_entry(), get_entry(), query_entries() methods in jarvis-mcp/src/jarvis/memory/factual.py
- [x] T019 Implement SemanticMemory class in jarvis-mcp/src/jarvis/memory/semantic.py (initialize ChromaDB client and collection)
- [x] T020 Implement add_semantic_entry(), search_semantic() with filters (time, file, type) in jarvis-mcp/src/jarvis/memory/semantic.py
- [x] T021 Implement SnapshotMemory class in jarvis-mcp/src/jarvis/memory/snapshot.py (save/load code diffs to/from .jarvis/snapshots/)
- [x] T022 [P] Create MCP client wrapper in jarvis-cli/src/api/mcp-client.ts (connect to MCP server, call tools, handle responses)
- [x] T023 [P] Create CLI output formatter in jarvis-cli/src/utils/output.ts (colorized output, JSON support, --quiet flag, JARVIS persona)
- [x] T024 [P] Create CLI settings manager in jarvis-cli/src/config/settings.ts (load config, validate, provide defaults)

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Initialize Project Memory (Priority: P1) 🎯 MVP

**Goal**: Enable developers to run `jarvis init` in a project to create `.jarvis/` directory with initialized databases

**Independent Test**: Run `jarvis init` in empty directory, verify `.jarvis/` exists with config.json, SQLite DB, and ChromaDB collection

### Implementation for User Story 1

- [x] T025 [P] [US1] Implement init command handler in jarvis-cli/src/commands/init.ts (detect project root, validate prerequisites)
- [x] T026 [US1] Create .jarvis directory structure (.jarvis/{db,snapshots}, .jarvis/config.json) in jarvis-cli/src/commands/init.ts
- [x] T027 [US1] Call MCP server to initialize SQLite database (create tables from schema) in init.ts
- [x] T028 [US1] Call MCP server to initialize ChromaDB collection (project-specific collection name) in init.ts
- [x] T029 [US1] Create ProjectContext entity with auto-detected name and root_path in init.ts
- [x] T030 [US1] Handle existing .jarvis/ directory (warn user, ask for confirmation before reinit) in init.ts
- [x] T031 [US1] Detect if git repository exists, warn if not (auto-capture limited) in init.ts
- [x] T032 [US1] Register CLI entry point in jarvis-cli/src/index.ts (parse `jarvis init` command, route to handler)
- [x] T033 [US1] Add build script to jarvis-cli/package.json (esbuild with shebang, executable output)

**Checkpoint**: User Story 1 complete - `jarvis init` works, creates functional memory system

---

## Phase 4: User Story 2 - Manual Memory Capture (Priority: P1) 🎯 MVP

**Goal**: Enable `jarvis remember` and `jarvis recall` commands for manual memory storage and retrieval

**Independent Test**: Run `jarvis remember "chose PostgreSQL"`, then `jarvis recall "database"`, verify semantic match

### Implementation for User Story 2

- [x] T034 [P] [US2] Implement remember command handler in jarvis-cli/src/commands/remember.ts (accept content from args or stdin)
- [x] T035 [P] [US2] Implement recall command handler in jarvis-cli/src/commands/recall.ts (accept query, optional filters)
- [x] T036 [US2] In remember.ts, call MCP tool remember_context() with content, type='decision', metadata
- [x] T037 [US2] In jarvis-mcp, implement MCP tool remember_context in src/jarvis/mcp/tools.py (validate input, generate embedding)
- [x] T038 [US2] Store to FactualMemory (metadata) and SemanticMemory (content + embedding) in remember_context tool
- [x] T039 [US2] Return success response with memory_id, timestamp, JARVIS persona formatting
- [x] T040 [US2] In recall.ts, call MCP tool recall_context() with query and filters
- [x] T041 [US2] In jarvis-mcp, implement MCP tool recall_context in src/jarvis/mcp/tools.py (generate query embedding, search ChromaDB)
- [x] T042 [US2] Apply filters (time-based, file-based, type) to search results in recall_context tool
- [x] T043 [US2] Return ranked results with relevance scores, content snippets, JARVIS persona formatting
- [x] T044 [US2] Handle long content (>1000 words) chunking in remember_context for embedding efficiency
- [x] T045 [US2] Format recall results in jarvis-cli (table view, JSON support via --json flag) in recall.ts

**Checkpoint**: User Story 2 complete - Manual capture and retrieval working end-to-end

---

## Phase 5: User Story 3 - Onboard Existing Project (Priority: P2)

**Goal**: Enable `jarvis scan` to analyze existing codebases and populate memory with tech stack, structure, inconsistencies

**Independent Test**: Run `jarvis scan` in existing project, verify report shows tech stack, file structure, and asks clarifying questions

### Implementation for User Story 3

- [x] T046 [P] [US3] Implement scan command handler in jarvis-cli/src/commands/scan.ts (trigger codebase analysis)
- [x] T047 [US3] In jarvis-cli/src/commands/scan.ts, call MCP tool analyze_codebase() with project_path and options
- [x] T048 [US3] In jarvis-mcp, implement MCP tool analyze_codebase in src/jarvis/mcp/tools.py (detect tech stack from files)
- [x] T049 [US3] Scan package.json, pyproject.toml, Gemfile, go.mod for dependencies in analyze_codebase
- [x] T050 [US3] Build file structure map (recursive directory tree) in analyze_codebase
- [x] T051 [US3] Detect inconsistencies (mixed import styles, naming conventions, duplicate code) in analyze_codebase
- [x] T052 [US3] Generate clarifying questions based on ambiguous patterns in analyze_codebase
- [x] T053 [US3] Store ProjectContext with tech_stack, dependencies, file_structure_map in analyze_codebase
- [x] T054 [US3] Return tiered report (summary, inconsistencies, questions) with JARVIS persona
- [x] T055 [US3] In jarvis-cli, format scan results with drill-down capability (use --verbose for details)
- [x] T056 [US3] Implement interactive Q&A mode in scan.ts (ask questions, store answers to semantic memory)
- [x] T057 [US3] Enforce <5 minute timeout for 10k files scan (add progress indicator)

**Checkpoint**: User Story 3 complete - Project onboarding functional

---

## Phase 6: User Story 4 - Auto-Capture Code Changes (Priority: P2)

**Goal**: Automatically track code changes via git hooks and file watcher without blocking developer workflow

**Independent Test**: Make git commit, verify JARVIS captured diff, file paths, commit message in memory

### Implementation for User Story 4

- [x] T058 [P] [US4] Implement GitHooks class in jarvis-mcp/src/jarvis/capture/git_hooks.py (install/uninstall hooks)
- [x] T059 [P] [US4] Implement FileWatcher class in jarvis-mcp/src/jarvis/capture/file_watcher.py (using watchdog library)
- [x] T060 [US4] Create pre-commit hook script template in jarvis-mcp/templates/pre-commit.sh (call JARVIS capture endpoint)
- [x] T061 [US4] Create post-commit hook script template in jarvis-mcp/templates/post-commit.sh (update commit_sha in CodeChange)
- [x] T062 [US4] In GitHooks.install(), detect existing hooks, offer to merge or manual install
- [x] T063 [US4] In pre-commit hook, capture staged files and diffs via `git diff --cached`
- [x] T064 [US4] Create CodeChange entity (file_path, change_type, diff_content, timestamp) in pre-commit
- [x] T065 [US4] In post-commit hook, update CodeChange with commit_sha and commit_message
- [x] T066 [US4] Extract decisions from commit messages (detect keywords: "because", "chose", "decided")
- [x] T067 [US4] Create DecisionRecord if decision detected in commit message
- [x] T068 [US4] In FileWatcher, start watchdog observer on project root (async, non-blocking)
- [x] T069 [US4] Filter events by .gitignore rules (don't capture ignored files)
- [x] T070 [US4] On file modification event, create uncommitted CodeChange (commit_sha=NULL)
- [x] T071 [US4] Ensure file watcher uses <5% CPU (batch events, debounce rapid changes)
- [x] T072 [US4] Store CodeChange to FactualMemory and create SNAPSHOT MemoryEntry

**Checkpoint**: User Story 4 complete - Auto-capture working for committed and uncommitted changes

---

## Phase 7: User Story 5 - Semantic Context Retrieval (Priority: P2)

**Goal**: Enhanced semantic search with natural language queries, time filters, and relevance ranking

**Independent Test**: Store "chose Redux for state management", query "state library decision", verify semantic match

### Implementation for User Story 5

- [x] T073 [US5] Enhance recall_context tool with time-based filtering (parse "last week", "since March" queries)
- [x] T074 [US5] Add file-based filtering to recall_context (search within specific files/directories)
- [x] T075 [US5] Add type-based filtering to recall_context (filter by decision, bug, architecture, note)
- [x] T076 [US5] Implement relevance score calculation (cosine similarity of embeddings) in recall_context
- [x] T077 [US5] Return context snippets (not full content) in search results for quick preview
- [x] T078 [US5] Implement "no results" handling (suggest alternative queries, offer keyword fallback)
- [x] T079 [US5] Add drill-down support in jarvis-cli recall.ts (click result ID to see full content)
- [x] T080 [US5] Optimize ChromaDB query performance (use HNSW index, batch queries)

**Checkpoint**: User Story 5 complete - Advanced semantic search functional

---

## Phase 8: User Story 6 - JARVIS Persona Communication (Priority: P3)

**Goal**: Ensure all responses follow JARVIS MCU persona (English, concise, "Sir", calm)

**Independent Test**: Run any command, verify response is concise, addresses "Sir", English-only

### Implementation for User Story 6

- [x] T081 [P] [US6] Create persona templates in jarvis-mcp/src/jarvis/utils/persona.py (success, error, progress messages)
- [x] T082 [P] [US6] Implement language detection in persona.py (reject non-English, respond in English anyway)
- [x] T083 [US6] Apply persona formatter to all MCP tool responses in jarvis-mcp/src/jarvis/mcp/tools.py
- [x] T084 [US6] Apply persona formatter to all CLI outputs in jarvis-cli/src/utils/output.ts
- [x] T085 [US6] Add --verbose flag handling (show details only when requested, default concise)
- [x] T086 [US6] Implement calm error messaging (never panic, always provide next steps)
- [x] T087 [US6] Add subtle dry humor option (configurable, off by default)

**Checkpoint**: User Story 6 complete - JARVIS persona consistent across all interactions

---

## Phase 9: User Story 7 - Safety Checkpoints & Rollback (Priority: P3)

**Goal**: Create git stash checkpoints before risky changes and enable rollback via `jarvis rollback`

**Independent Test**: JARVIS modifies 15 files, fail validation, verify auto-rollback restores all files

### Implementation for User Story 7

- [x] T088 [P] [US7] Implement checkpoint command handler in jarvis-cli/src/commands/rollback.ts (manual checkpoint creation)
- [x] T089 [P] [US7] Implement rollback command handler in jarvis-cli/src/commands/rollback.ts (undo last N operations)
- [x] T090 [US7] In jarvis-mcp, implement MCP tool create_checkpoint in src/jarvis/mcp/tools.py (create git stash with message)
- [x] T091 [US7] Store Checkpoint entity (git_stash_ref, timestamp, reason, files_affected) in create_checkpoint
- [x] T092 [US7] Create memory snapshot (current MemoryEntry state) and link to Checkpoint
- [x] T093 [US7] Implement automatic checkpoint detection (>5 files, delete, config change, major refactor)
- [x] T094 [US7] In jarvis-mcp, implement MCP tool rollback in src/jarvis/mcp/tools.py (pop git stash)
- [x] T095 [US7] Restore memory state from memory_snapshot_id in rollback tool
- [x] T096 [US7] Mark Checkpoint as Applied after successful rollback
- [x] T097 [US7] Implement rollback preview (show what will be undone before confirming)
- [x] T098 [US7] Ensure atomic rollback (all files or none, never partial)
- [x] T099 [US7] Implement auto-rollback on validation failure (after 3 fix attempts)
- [x] T100 [US7] Implement checkpoint cleanup (delete checkpoints older than 30 days)

**Checkpoint**: User Story 7 complete - Safety system with checkpoints and rollback functional

---

## Phase 10: User Story 8 - MCP Server Integration (Priority: P3)

**Goal**: Expose JARVIS memory via MCP protocol for AI agent integration (Copilot, Cursor)

**Independent Test**: Call MCP tool `recall_context("database")` from Copilot, verify JARVIS memories returned

### Implementation for User Story 8

- [x] T101 [US8] Create MCP server bootstrap in jarvis-mcp/src/jarvis/mcp/server.py (using official MCP Python package)
- [x] T102 [US8] Register all 7 MCP tools (remember_context, recall_context, analyze_codebase, validate_changes, get_architecture, create_checkpoint, rollback)
- [x] T103 [US8] Implement MCP tool validate_changes in jarvis-mcp/src/jarvis/mcp/tools.py (run syntax, lint, test, build checks)
- [x] T104 [US8] Implement MCP tool get_architecture in jarvis-mcp/src/jarvis/mcp/tools.py (return file_structure_map from ProjectContext)
- [x] T105 [US8] Implement MCP tool switch_project in jarvis-mcp/src/jarvis/mcp/tools.py (change active project_id)
- [x] T106 [US8] Add server lifecycle management (start, stop, health check) in server.py
- [x] T107 [US8] Configure server port (default 3000, fallback 3001-3010 if in use) in server.py
- [x] T108 [US8] Implement request logging (all tool calls, errors, performance metrics) in server.py
- [x] T109 [US8] Handle multiple concurrent agent connections (async request handling)
- [x] T110 [US8] Add graceful shutdown (finish pending requests, close DB connections)
- [x] T111 [US8] Create systemd service file for auto-start on boot (optional)

**Checkpoint**: User Story 8 complete - MCP server exposing all tools for AI agents

---

## Phase 11: User Story 9 - Spec Kit Workflow Integration (Priority: P3)

**Goal**: Wrap Spec Kit commands in JARVIS CLI with automatic memory storage

**Independent Test**: Run `jarvis specify "photo album"`, verify spec created and stored in memory

### Implementation for User Story 9

- [ ] T112 [P] [US9] Implement specify command wrapper in jarvis-cli/src/commands/specify.ts (call speckit.specify, capture output)
- [ ] T113 [P] [US9] Implement plan command wrapper in jarvis-cli/src/commands/plan.ts (call speckit.plan, capture output)
- [ ] T114 [P] [US9] Implement implement command wrapper in jarvis-cli/src/commands/implement.ts (call speckit.implement, capture output)
- [ ] T115 [US9] In jarvis-mcp, create SpecKitIntegration in src/jarvis/speckit/commands.py (shell out to speckit commands)
- [ ] T116 [US9] After spec creation, store spec content to semantic memory (type='architecture')
- [ ] T117 [US9] After plan creation, store plan content to semantic memory (type='decision')
- [ ] T118 [US9] Reference past specs during new planning (search semantic memory for similar features)
- [ ] T119 [US9] Enable `jarvis recall "photo album requirements"` to retrieve original spec

**Checkpoint**: User Story 9 complete - Spec Kit integration with memory persistence

---

## Phase 12: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T120 [P] Implement status command in jarvis-cli/src/commands/status.ts (show memory stats, project info, MCP server status)
- [ ] T121 [P] Implement config command in jarvis-cli/src/commands/config.ts (get/set/list/reset configuration)
- [ ] T122 [P] Implement doctor command in jarvis-cli/src/commands/doctor.ts (health checks: MCP server, databases, disk space, memory)
- [ ] T123 [P] Add --help documentation to all CLI commands
- [ ] T124 [P] Add progress indicators for long operations (>5 seconds)
- [ ] T125 [P] Implement error recovery (retry transient failures, clear error messages)
- [ ] T126 [P] Add performance monitoring (log query times, warn if >2s threshold exceeded)
- [ ] T127 [P] Add memory cleanup command (delete old snapshots, compress old memories)
- [ ] T128 [P] Create comprehensive README.md for jarvis-mcp and jarvis-cli
- [ ] T129 [P] Add CLI autocomplete support (bash, zsh completion scripts)
- [ ] T130 Run quickstart.md validation (follow guide, ensure all steps work)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-11)**: All depend on Foundational phase completion
  - User stories can proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Polish (Phase 12)**: Depends on desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1 - Initialize)**: Can start after Foundational - No dependencies on other stories
- **User Story 2 (P1 - Manual Capture)**: Can start after Foundational - No dependencies on other stories
- **User Story 3 (P2 - Onboard Project)**: Can start after Foundational - Independent
- **User Story 4 (P2 - Auto-Capture)**: Can start after Foundational - Independent
- **User Story 5 (P2 - Semantic Retrieval)**: Can start after Foundational - May enhance US2 but independently testable
- **User Story 6 (P3 - JARVIS Persona)**: Can start after Foundational - Cross-cutting, affects all UX
- **User Story 7 (P3 - Safety/Rollback)**: Can start after Foundational - Independent
- **User Story 8 (P3 - MCP Integration)**: Can start after Foundational - Exposes existing functionality
- **User Story 9 (P3 - Spec Kit)**: Can start after Foundational - Independent

### Within Each Phase

- **Setup**: All tasks can run in parallel (creating different files/configs)
- **Foundational**: T011-T015 (config, persona, embeddings) can run in parallel, then T016-T024 (memory classes, MCP client, CLI utils)
- **Each User Story**: Implementation tasks within story follow dependency order, [P] tasks can run in parallel

### Parallel Opportunities

- Setup: All 10 tasks can run in parallel
- Foundational: Tasks T014, T015, T022, T023, T024 can run in parallel (different subsystems)
- User Story 1: T025, T026 can start in parallel
- User Story 2: T034, T035 can run in parallel (separate commands)
- User Story 3: T046 can start independently
- User Story 4: T058, T059 can run in parallel (git hooks + file watcher)
- User Story 6: All persona tasks (T081-T087) can run in parallel
- User Story 7: T088, T089 can run in parallel
- User Story 9: T112, T113, T114 can run in parallel
- Polish: All 11 tasks can run in parallel

---

## Parallel Example: Foundational Phase

```bash
# Launch config, persona, embeddings together:
Task T011: "Implement Configuration class in jarvis-mcp/src/jarvis/utils/config.py"
Task T014: "Implement JARVIS persona formatter in jarvis-mcp/src/jarvis/utils/persona.py"
Task T015: "Implement embeddings wrapper in jarvis-mcp/src/jarvis/utils/embeddings.py"

# Then launch memory classes together:
Task T017: "Implement FactualMemory class in jarvis-mcp/src/jarvis/memory/factual.py"
Task T019: "Implement SemanticMemory class in jarvis-mcp/src/jarvis/memory/semantic.py"
Task T021: "Implement SnapshotMemory class in jarvis-mcp/src/jarvis/memory/snapshot.py"

# In parallel, TypeScript team can do:
Task T022: "Create MCP client wrapper in jarvis-cli/src/api/mcp-client.ts"
Task T023: "Create CLI output formatter in jarvis-cli/src/utils/output.ts"
Task T024: "Create CLI settings manager in jarvis-cli/src/config/settings.ts"
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (Initialize Project Memory)
4. **VALIDATE**: Test `jarvis init` independently
5. Complete Phase 4: User Story 2 (Manual Memory Capture)
6. **VALIDATE**: Test `jarvis remember` and `jarvis recall` end-to-end
7. **STOP and DEMO**: Working MVP with manual memory capture/retrieval

### Incremental Delivery

1. MVP (US1 + US2) → Deploy/Demo 🎯
2. Add US3 (Onboard Existing Project) → Deploy/Demo
3. Add US4 (Auto-Capture) → Deploy/Demo
4. Add US5 (Semantic Retrieval) → Deploy/Demo
5. Add US6-US9 as needed → Each adds value independently

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together (2-3 days)
2. Once Foundational done:
   - Developer A: User Story 1 + 2 (MVP, 1 week)
   - Developer B: User Story 3 (Onboard, 3 days)
   - Developer C: User Story 4 (Auto-Capture, 1 week)
3. Stories integrate and test independently

---

## Notes

- **[P] tasks** = different files, no dependencies within phase
- **[Story] label** maps task to specific user story for traceability
- Each user story should be independently completable and testable
- NO TESTS included - not requested in specification
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies

---

## Task Summary

**Total Tasks**: 130

- Setup: 10 tasks
- Foundational: 14 tasks
- User Story 1 (P1): 9 tasks
- User Story 2 (P1): 12 tasks
- User Story 3 (P2): 12 tasks
- User Story 4 (P2): 15 tasks
- User Story 5 (P2): 8 tasks
- User Story 6 (P3): 7 tasks
- User Story 7 (P3): 13 tasks
- User Story 8 (P3): 11 tasks
- User Story 9 (P3): 8 tasks
- Polish: 11 tasks

**MVP Scope** (Recommended): Phase 1 + Phase 2 + Phase 3 + Phase 4 = **45 tasks**

**Parallel Opportunities**: 35+ tasks marked [P] can run in parallel

**Estimated Timeline**:

- MVP (US1 + US2): 2-3 weeks (1-2 developers)
- Full Phase 1 (all P1+P2 stories): 4-6 weeks
- Complete system (all phases): 8-12 weeks

---

**Tasks Version**: 1.0.0  
**Generated**: 2025-11-15  
**Status**: Ready for Implementation via `/speckit.implement`
