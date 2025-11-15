# Remaining Tasks: JARVIS - AI Coding Agent Memory System

**Status**: Continued implementation based on completed foundation
**Completed**: 6 user stories (US-2.1 Init, US-2.2 Scan, US-8.1 MCP, US-3.2 Remember, US-2 Recall, US-7 Status/Doctor)
**Remaining**: Auto-capture + Extended features
**Last Updated**: 2025-11-15 (Phase 6 Complete)

---

## Current Implementation Status

### ✅ Completed (108 tests passing)

- Phase 1: Setup (10/10 tasks) ✓
- Phase 2: Foundational (14/14 tasks) ✓
- Phase 3: User Story 1 - Initialize (9/9 tasks) ✓
- Phase 4: User Story 2 - Remember + Recall (12/12 tasks) ✓ **[COMPLETE]**
- Phase 5: User Story 3 - Scan (12/12 tasks) ✓
- Phase 6: Status & Doctor Commands (8/8 tasks) ✓ **[COMPLETE]**
- MCP Integration (2/2 tasks) ✓

### 🔄 In Progress / Remaining

---

## Phase 4 Continuation: User Story 2 - Complete Recall Functionality ✅ **[COMPLETE]**

**Goal**: Enable `jarvis recall` command for semantic memory retrieval

**Priority**: P1 (MVP Critical)

**Status**: ✅ Completed on 2025-11-15

**Independent Test**: Run `jarvis recall "database decision"`, verify semantic search returns relevant memories

### Tasks

- [x] T201 [US2] Implement recall.ts display formatting with table view and snippets
- [x] T202 [US2] Add drill-down support (view full content by ID)
- [x] T203 [US2] Add unit tests for recall command (21 tests - EXCEEDED minimum)
- [x] T204 [US2] Add integration test for remember→recall workflow (10 tests)

**Files Created/Modified**:

- ✅ `jarvis-cli/src/commands/recall.ts` (+150 lines)
- ✅ `jarvis-cli/tests/unit/recall.test.ts` (new - 280 lines)
- ✅ `jarvis-cli/tests/integration/memory.integration.test.ts` (new - 180 lines)

**Acceptance Criteria**: ✅ ALL MET

- ✅ `jarvis recall "query"` returns ranked results with table formatting
- ✅ Results show relevance scores and snippets
- ✅ `--verbose` shows full content with additional columns
- ✅ `--json` outputs machine-readable format
- ✅ Tests cover happy path + edge cases (31 tests total)
- ✅ Drill-down by ID implemented (`--id` flag)
- ✅ All quality checks passing

**Test Results**: 82 tests passing (21 recall unit + 10 memory integration)

**Commit**: dc1d8ae - Pushed to 001-ai-memory-system

---

## Phase 6: Status & Doctor Commands ✅ **[COMPLETE]**

**Goal**: Implement system health and status monitoring

**Priority**: P2 (High value, low complexity)

**Status**: ✅ Completed on 2025-11-15

### Tasks

- [x] T301 [US7] Implement status command in jarvis-cli/src/commands/status.ts
- [x] T302 [US7] Implement get_memory_status in jarvis-mcp/src/jarvis/memory/recall.py
- [x] T303 [US7] Add status MCP tool to server.py
- [x] T304 [US7] Implement doctor command in jarvis-cli/src/commands/doctor.ts
- [x] T305 [US7] Implement health checks in jarvis-mcp/src/jarvis/utils/doctor.py
- [x] T306 [US7] Add doctor MCP tool to server.py
- [x] T307 [US7] Add unit tests for status command (11 tests)
- [x] T308 [US7] Add unit tests for doctor command (15 tests)

**Files Created**:

- ✅ `jarvis-mcp/src/jarvis/memory/recall.py` (200 lines)
- ✅ `jarvis-mcp/src/jarvis/utils/doctor.py` (330 lines)
- ✅ `jarvis-cli/tests/unit/status.test.ts` (150 lines)
- ✅ `jarvis-cli/tests/unit/doctor.test.ts` (250 lines)

**Files Modified**:

- ✅ `jarvis-cli/src/commands/status.ts` (MCP integration)
- ✅ `jarvis-cli/src/commands/doctor.ts` (MCP integration)
- ✅ `jarvis-mcp/src/jarvis/mcp/tools.py` (+60 lines, 2 new methods)

**Acceptance Criteria**: ✅ ALL MET

- ✅ `jarvis status` shows memory stats (entry count, disk usage, last activity)
- ✅ `jarvis doctor` checks database health, Python version, dependencies
- ✅ Both commands use JARVIS persona messaging
- ✅ Exit codes indicate health status (0=healthy, 1=failed)
- ✅ JSON output support for automation
- ✅ Verbose mode for detailed diagnostics
- ✅ Graceful fallback if MCP unavailable

**Test Results**: 108 tests passing (26 new tests)

**Commit**: 75532aa - Pushed to 001-ai-memory-system

---

## Phase 7: Auto-Capture Foundation

**Goal**: Implement git hooks for automatic code change tracking

**Priority**: P1 (MVP Critical)

### Tasks

- [ ] T401 [US4] Update init.ts to install post-commit git hook
- [ ] T402 [US4] Create internal.ts with handleInternalOnCommit
- [ ] T403 [US4] Add \_internal_on_commit routing to index.ts
- [ ] T404 [US4] Implement add_commit_event in jarvis-mcp/src/jarvis/memory/remember.py
- [ ] T405 [US4] Create on_commit MCP tool in server.py
- [ ] T406 [US4] Save diffs to .jarvis/snapshots/{hash}.diff
- [ ] T407 [US4] Add unit tests for git hook installation
- [ ] T408 [US4] Add integration test for commit capture

**Files to Create/Modify**:

- `jarvis-cli/src/commands/init.ts` (modify - add hook installer)
- `jarvis-cli/src/commands/internal.ts` (new)
- `jarvis-cli/src/index.ts` (modify - add internal routing)
- `jarvis-mcp/src/jarvis/memory/remember.py` (modify - add commit event)
- `jarvis-cli/tests/unit/internal.test.ts` (new)

**Acceptance Criteria**:

- ✓ `jarvis init` installs post-commit hook
- ✓ Git commits trigger automatic capture
- ✓ Diffs stored in .jarvis/snapshots/
- ✓ Commit messages stored in semantic memory
- ✓ Silent operation (no blocking)

---

## Phase 8: Safety System - Checkpoints & Rollback

**Goal**: Enable safety checkpoints and rollback functionality

**Priority**: P1 (MVP Critical)

### Tasks

- [ ] T501 [US7] Create safety.py with checkpoint functions
- [ ] T502 [US7] Implement create_checkpoint using git stash
- [ ] T503 [US7] Implement rollback_to_checkpoint
- [ ] T504 [US7] Create checkpoint.ts command in CLI
- [ ] T505 [US7] Create rollback.ts command in CLI
- [ ] T506 [US7] Add checkpoint and rollback MCP tools to server.py
- [ ] T507 [US7] Store checkpoint metadata in factual_memory
- [ ] T508 [US7] Add unit tests for checkpoint creation
- [ ] T509 [US7] Add unit tests for rollback
- [ ] T510 [US7] Add integration test for checkpoint→rollback workflow

**Files to Create**:

- `jarvis-mcp/src/jarvis/memory/safety.py`
- `jarvis-cli/src/commands/checkpoint.ts`
- `jarvis-cli/src/commands/rollback.ts`
- `jarvis-cli/tests/unit/checkpoint.test.ts`
- `jarvis-cli/tests/unit/rollback.test.ts`
- `jarvis-cli/tests/integration/safety.integration.test.ts`

**Acceptance Criteria**:

- ✓ `jarvis checkpoint "reason"` creates git stash checkpoint
- ✓ `jarvis rollback` or `jarvis rollback <id>` restores state
- ✓ Checkpoint metadata stored and retrievable
- ✓ Atomic rollback (all or nothing)
- ✓ JARVIS persona confirmation messages

---

## Phase 9: Validation System

**Goal**: Implement code validation before and after changes

**Priority**: P2

### Tasks

- [ ] T601 [US7] Create validator.py with run_validation function
- [ ] T602 [US7] Implement test detection (pytest, vitest, jest)
- [ ] T603 [US7] Implement lint detection (ruff, eslint)
- [ ] T604 [US7] Add validate_changes MCP tool to server.py
- [ ] T605 [US7] Add --validate flag to checkpoint command
- [ ] T606 [US7] Implement auto-rollback on validation failure
- [ ] T607 [US7] Add unit tests for validator
- [ ] T608 [US7] Add integration test for auto-rollback

**Files to Create**:

- `jarvis-mcp/src/jarvis/capture/validator.py`
- `jarvis-cli/tests/unit/validator.test.ts` (if needed)

**Acceptance Criteria**:

- ✓ Validates Python projects (ruff, mypy, pytest)
- ✓ Validates TypeScript projects (eslint, tsc, vitest)
- ✓ Returns clear pass/fail with error details
- ✓ Auto-rollback after 3 failed validation attempts
- ✓ Performance: <30s for typical project

---

## Phase 10: Extended Features (Post-MVP)

### Tasks

- [ ] T701 Implement analyze_commit_for_bugs (detect bugfix patterns)
- [ ] T702 Implement analyze_diff_for_arch (track architecture changes)
- [ ] T703 Create proactive.py with suggestion engine
- [ ] T704 Implement Spec Kit wrappers (specify, plan, implement)
- [ ] T705 Add config command for configuration management
- [ ] T706 Implement memory cleanup command
- [ ] T707 Add bash/zsh autocomplete scripts
- [ ] T708 Create comprehensive user documentation

---

## Implementation Priority Order

### Sprint 1: Complete MVP (P1 Stories)

1. **Week 1**: Recall command (T201-T204) - 4 tasks
2. **Week 2**: Status/Doctor commands (T301-T308) - 8 tasks
3. **Week 3**: Auto-capture (T401-T408) - 8 tasks
4. **Week 4**: Safety system (T501-T510) - 10 tasks

**Total MVP**: 30 tasks, 4 weeks

### Sprint 2: Extended Features

1. **Week 5**: Validation system (T601-T608) - 8 tasks
2. **Week 6**: Extended features (T701-T708) - 8 tasks

**Total Extended**: 16 tasks, 2 weeks

### Sprint 3: Polish & Documentation

1. Final testing and bug fixes
2. Performance optimization
3. Documentation completion
4. Production readiness

---

## Task Execution Guide for `/speckit.implement`

### Example Usage

For implementing Recall command (Phase 4):

```
Follow instructions in speckit.implement.prompt.md

Task Breakdown: US-2 Recall Command Completion

Objective: Complete jarvis recall command with semantic search and formatting

Tasks:
- T201: Enhance recall.ts with table formatting
- T202: Add drill-down by memory ID
- T203: Create unit tests (10 tests)
- T204: Create integration tests

Target: jarvis-cli and jarvis-mcp
Expected Output: jarvis recall "query" returns formatted results
```

### Validation After Each Phase

```bash
# After implementing
cd jarvis-cli && npm test
cd jarvis-mcp && uv run pytest

# Check quality
cd jarvis-cli && npm run lint && npm run build
cd jarvis-mcp && uv run ruff check . && uv run mypy .

# Manual test
jarvis recall "database decision"
jarvis status
jarvis checkpoint "before refactor"
```

---

## Success Metrics

### MVP Complete When:

- ✅ All P1 tasks complete (T201-T510)
- ✅ Test coverage >80%
- ✅ All commands work end-to-end
- ✅ Documentation updated
- ✅ Performance targets met (<2s recall, <5s scan)

### Production Ready When:

- ✅ All tasks complete
- ✅ Test coverage >90%
- ✅ Security audit passed
- ✅ User guide complete
- ✅ Docker deployment ready

---

**Version**: 2.0.0 (Remaining Tasks)
**Generated**: 2025-11-15
**Status**: Ready for incremental implementation via `/speckit.implement`
