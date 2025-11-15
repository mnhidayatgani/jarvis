# Quickstart: Refactoring Guide

**Purpose**: Step-by-step guide for executing the refactor  
**Date**: November 15, 2025  
**For**: Development team implementing the refactor

## Overview

This guide provides a structured approach to refactoring the JARVIS codebase while maintaining 100% backward compatibility and zero downtime. The refactor follows a phased approach with continuous testing and validation.

## Prerequisites

Before starting, ensure:

- ✅ All existing tests pass (`npm test` and `pytest`)
- ✅ Git working directory is clean
- ✅ Branch `002-full-refactor` is checked out
- ✅ Dependencies are up to date (`npm install` and `uv sync`)
- ✅ You've read `research.md` and `data-model.md`

## Phase Timeline

```
Week 1-2: Foundation & Setup
Week 3-4: Core Refactoring
Week 5-6: Testing & Polish
```

## Week 1-2: Foundation & Setup

### Day 1-2: TypeScript Configuration

**Goal**: Enable strict mode and fix immediate type errors

**Steps**:

1. **Update `tsconfig.json`**:

   ```bash
   cd jarvis-cli
   ```

   Edit `tsconfig.json` to enable strict mode:

   ```json
   {
     "compilerOptions": {
       "strict": true,
       "noImplicitAny": true,
       "strictNullChecks": true,
       "strictFunctionTypes": true,
       "noUnusedLocals": true,
       "noUnusedParameters": true,
       "noImplicitReturns": true
     }
   }
   ```

2. **Run type checker**:

   ```bash
   npm run typecheck
   ```

   Expect ~50-100 errors initially. This is normal.

3. **Fix errors systematically**:

   - Start with `src/core/types/` (create if needed)
   - Then `src/core/errors/`
   - Then `src/utils/`
   - Finally `src/commands/`

4. **Create type definitions**:

   ```bash
   mkdir -p src/core/types
   touch src/core/types/{config.ts,memory.ts,index.ts}
   ```

5. **Commit progress**:
   ```bash
   git add .
   git commit -m "chore: enable TypeScript strict mode"
   ```

**Validation**: `npm run typecheck` passes with zero errors

---

### Day 3-4: Python Type Configuration

**Goal**: Enable strict mypy and add type hints

**Steps**:

1. **Update `pyproject.toml`**:

   ```bash
   cd jarvis-mcp
   ```

   Add strict mypy config:

   ```toml
   [tool.mypy]
   strict = true
   warn_return_any = true
   disallow_untyped_defs = true
   disallow_incomplete_defs = true
   ```

2. **Run mypy**:

   ```bash
   uv run mypy src/jarvis
   ```

   Expect ~100-200 errors initially.

3. **Fix errors systematically**:

   - Start with `src/jarvis/core/types.py` (create if needed)
   - Then `src/jarvis/core/errors.py`
   - Then `src/jarvis/utils/`
   - Finally `src/jarvis/memory/` and `src/jarvis/mcp/`

4. **Create Protocol definitions**:

   ```bash
   mkdir -p src/jarvis/memory
   touch src/jarvis/memory/{base.py,interfaces.py}
   ```

5. **Commit progress**:
   ```bash
   git add .
   git commit -m "chore: enable strict mypy checking"
   ```

**Validation**: `uv run mypy src/jarvis` passes with zero errors

---

### Day 5-7: Error Hierarchies

**Goal**: Implement custom error classes

**TypeScript (jarvis-cli)**:

1. **Create error base class**:

   ```bash
   mkdir -p src/core/errors
   touch src/core/errors/{base.ts,cli-errors.ts,index.ts}
   ```

2. **Implement base error** (`src/core/errors/base.ts`):

   - Copy from `contracts/error-types.md`
   - Implement `JarvisError` class
   - Add `toJSON()` and `toCLIMessage()` methods

3. **Implement specific errors** (`src/core/errors/cli-errors.ts`):

   - `ValidationError`
   - `MCPConnectionError`
   - `FileSystemError`
   - `ConfigurationError`
   - `InternalError`

4. **Export all errors** (`src/core/errors/index.ts`)

5. **Update existing error usage**:
   ```bash
   # Find all throw new Error()
   grep -r "throw new Error" src/commands/
   # Replace with specific error types
   ```

**Python (jarvis-mcp)**:

1. **Create error base class**:

   ```bash
   mkdir -p src/jarvis/core
   touch src/jarvis/core/errors.py
   ```

2. **Implement hierarchy**:

   - Copy from `contracts/error-types.md`
   - Implement all error classes
   - Add `to_dict()` method for JSON serialization

3. **Update existing error usage**:
   ```bash
   # Find all raise Exception()
   grep -r "raise Exception" src/jarvis/
   # Replace with specific error types
   ```

**Validation**:

- All tests still pass
- Can import and instantiate all error types
- Errors serialize to JSON correctly

**Commit**:

```bash
git add .
git commit -m "feat: implement custom error hierarchy"
```

---

### Day 8-10: Interface Definitions

**Goal**: Define interfaces/protocols for all major components

**TypeScript**:

1. **Create command interface** (`src/commands/base/command.ts`):

   - Copy from `contracts/cli-commands.md`
   - Implement `ICommand<TOptions, TResult>` interface
   - Implement abstract `BaseCommand` class

2. **Create client interface** (`src/api/types.ts`):

   - Define `IMCPClient` interface
   - Define `MCPResponse` type
   - Define `MCPToolCall` type

3. **Create formatter interface** (`src/utils/output.ts`):
   - Define `IOutputFormatter` interface
   - Update existing `OutputFormatter` to implement it

**Python**:

1. **Create memory interfaces** (`src/jarvis/memory/interfaces.py`):

   - Copy from `contracts/memory-interfaces.md`
   - Implement `IMemoryLayer` protocol
   - Implement `IStorageBackend` protocol
   - Implement `IEmbeddingsProvider` protocol

2. **Create data models** (`src/jarvis/core/types.py`):
   - Implement `MemoryEntry` Pydantic model
   - Implement `SearchResult` model
   - Implement `ProjectConfig` model

**Validation**:

- All interfaces are importable
- Type checkers recognize interface contracts
- No circular dependencies

**Commit**:

```bash
git add .
git commit -m "feat: define interfaces and protocols"
```

---

## Week 3-4: Core Refactoring

### Day 11-15: Command Pattern (TypeScript)

**Goal**: Refactor all CLI commands to use Command pattern

**Process for EACH command**:

1. **Characterization tests first**:

   ```typescript
   // tests/unit/commands/init.test.ts
   describe("InitCommand", () => {
     it("current behavior", async () => {
       // Test existing implementation
     });
   });
   ```

2. **Refactor to pattern**:

   ```typescript
   // src/commands/init.ts
   class InitCommand extends BaseCommand<InitOptions, InitResult> {
     parse(args: string[]): InitOptions {
       /* ... */
     }
     validate(options: InitOptions): void {
       /* ... */
     }
     async execute(options: InitOptions): Promise<InitResult> {
       /* ... */
     }
   }
   ```

3. **Verify tests still pass**

4. **Add edge case tests**

5. **Commit each command**:
   ```bash
   git add src/commands/init.ts tests/unit/commands/init.test.ts
   git commit -m "refactor: migrate InitCommand to command pattern"
   ```

**Order of refactoring** (easiest → hardest):

1. `status.ts` (read-only, simple)
2. `config.ts` (simple logic)
3. `scan.ts` (read-heavy)
4. `remember.ts` (core functionality)
5. `recall.ts` (core functionality)
6. `init.ts` (filesystem operations)
7. `checkpoint.ts` (git operations)
8. `rollback.ts` (git operations)
9. `validate.ts` (external tools)
10. `cleanup.ts` (destructive operations)

**Daily validation**:

```bash
npm test
npm run typecheck
npm run lint
```

---

### Day 16-20: Memory Layer Refactor (Python)

**Goal**: Refactor memory layers to use interfaces

**Process for EACH layer**:

1. **Create base classes**:

   ```python
   # src/jarvis/memory/base.py
   from abc import ABC, abstractmethod

   class BaseMemory(ABC):
       @abstractmethod
       def initialize(self, project_path: Path) -> None: ...
   ```

2. **Refactor implementation**:

   ```python
   # src/jarvis/memory/factual.py
   class FactualMemory(BaseMemory, IFactualMemory):
       def __init__(self, storage: IStorageBackend) -> None:
           self._storage = storage
   ```

3. **Update tests with mocks**:

   ```python
   def test_factual_memory():
       mock_storage = Mock(spec=IStorageBackend)
       memory = FactualMemory(mock_storage)
       # test with mock
   ```

4. **Verify tests pass**

5. **Commit each layer**

**Order**:

1. `factual.py`
2. `semantic.py`
3. `snapshot.py`
4. `core.py` (orchestrator)

**Daily validation**:

```bash
uv run pytest
uv run mypy src/jarvis
uv run ruff check src
```

---

### Day 21-25: Dependency Injection

**Goal**: Implement DI throughout both projects

**TypeScript**:

1. **Create factories**:

   ```typescript
   // src/commands/factory.ts
   export class CommandFactory {
     constructor(
       private mcpClient: IMCPClient,
       private formatter: IOutputFormatter,
       private config: IConfigManager
     ) {}

     create(name: string): ICommand<unknown, unknown> {
       switch (name) {
         case "init":
           return new InitCommand(this.mcpClient, this.formatter, this.config);
         // ...
       }
     }
   }
   ```

2. **Update entry point**:
   ```typescript
   // src/index.ts
   async function main() {
     const mcpClient = new MCPClient();
     const formatter = new OutputFormatter();
     const config = new ConfigManager();
     const factory = new CommandFactory(mcpClient, formatter, config);

     const command = factory.create(commandName);
     await command.run(args);
   }
   ```

**Python**:

1. **Create factories**:

   ```python
   # src/jarvis/memory/factory.py
   class MemoryFactory:
       @staticmethod
       def create_memory_core(project_path: Path) -> IMemoryCore:
           # Wire dependencies
           factual = FactualMemory(SQLiteBackend())
           semantic = SemanticMemory(ChromaDBBackend(), BGEEmbeddings())
           snapshot = SnapshotMemory(project_path)
           return MemoryCore(factual, semantic, snapshot)
   ```

2. **Update MCP tools**:
   ```python
   # src/jarvis/mcp/tools.py
   class MCPTools:
       def __init__(self, memory_core: IMemoryCore) -> None:
           self._memory = memory_core
   ```

**Validation**:

- All tests still pass
- Can mock all dependencies in tests
- No global state or singletons

**Commit**:

```bash
git add .
git commit -m "refactor: implement dependency injection"
```

---

## Week 5-6: Testing & Polish

### Day 26-28: Comprehensive Testing

**Goal**: Achieve >85% test coverage

**Process**:

1. **Check current coverage**:

   ```bash
   # TypeScript
   npm run test:cov

   # Python
   uv run pytest --cov=jarvis --cov-report=html
   ```

2. **Identify gaps**:

   ```bash
   # View coverage report
   open coverage/index.html  # TypeScript
   open htmlcov/index.html   # Python
   ```

3. **Add missing tests**:

   - Edge cases
   - Error paths
   - Integration scenarios

4. **Add E2E tests**:
   ```typescript
   // tests/integration/end-to-end.test.ts
   describe("Full workflows", () => {
     it("init → remember → recall", async () => {
       await runCLI(["init"]);
       await runCLI(["remember", "test decision"]);
       const result = await runCLI(["recall", "decision"]);
       expect(result).toContain("test decision");
     });
   });
   ```

**Validation**:

- Coverage >85% on both projects
- All tests pass in <30s
- No flaky tests

---

### Day 29-30: Documentation

**Goal**: Complete documentation for all public APIs

**TypeScript**:

1. **Add TSDoc comments**:

   ````typescript
   /**
    * Stores information to JARVIS memory.
    *
    * @param content - Information to remember
    * @param options - Storage options
    * @returns Memory entry ID
    * @throws {ValidationError} If content invalid
    * @example
    * ```typescript
    * await remember('Using PostgreSQL', { type: 'decision' })
    * ```
    */
   async function remember(
     content: string,
     options?: RememberOptions
   ): Promise<string>;
   ````

2. **Generate API docs**:
   ```bash
   npx typedoc src/index.ts
   ```

**Python**:

1. **Add Google-style docstrings**:

   ```python
   def remember(
       self,
       content: str,
       memory_type: str = "decision"
   ) -> str:
       """Store information to memory.

       Args:
           content: Information to remember (1-10,000 chars)
           memory_type: Type of memory (decision/note/context)

       Returns:
           Generated memory entry ID

       Raises:
           ValidationError: If content invalid
           DatabaseError: If storage fails

       Example:
           >>> memory.remember("Using PostgreSQL", "decision")
           'mem-abc123'
       """
   ```

2. **Generate API docs**:
   ```bash
   uv run pdoc src/jarvis --html --output-dir docs/api
   ```

---

### Day 31-35: Performance Optimization

**Goal**: Meet performance targets

**Benchmarks**:

```typescript
// Create benchmark script
// benchmark.ts
import { performance } from "perf_hooks";

async function benchmark() {
  // CLI init
  const initStart = performance.now();
  await runCLI(["init"]);
  const initTime = performance.now() - initStart;
  console.log(`Init: ${initTime}ms (target: <100ms)`);

  // Remember
  const rememberStart = performance.now();
  await runCLI(["remember", "test"]);
  const rememberTime = performance.now() - rememberStart;
  console.log(`Remember: ${rememberTime}ms (target: <200ms)`);

  // Recall
  const recallStart = performance.now();
  await runCLI(["recall", "test"]);
  const recallTime = performance.now() - recallStart;
  console.log(`Recall: ${recallTime}ms (target: <500ms)`);
}
```

**Optimization techniques**:

1. Lazy load heavy dependencies
2. Cache frequently accessed data
3. Use async/await for I/O
4. Batch database operations
5. Optimize embeddings generation

**Validation**:

- Init <100ms ✓
- Remember <200ms ✓
- Recall <500ms ✓
- Memory <100MB ✓

---

### Day 36-40: ADRs & Final Polish

**Goal**: Document architectural decisions

**Create ADRs**:

```bash
mkdir -p docs/architecture
```

**Required ADRs**:

1. `adr-001-command-pattern.md`
2. `adr-002-error-hierarchy.md`
3. `adr-003-dependency-injection.md`
4. `adr-004-memory-interfaces.md`
5. `adr-005-testing-strategy.md`

**ADR Template** (use from `research.md`):

- Status: Accepted
- Context: Problem being solved
- Decision: What was chosen
- Consequences: Positive/Negative/Neutral
- Alternatives Considered
- Implementation Notes

**Final checks**:

```bash
# TypeScript
npm run typecheck  # 0 errors
npm run lint       # 0 warnings
npm test           # All pass
npm run test:cov   # >85%

# Python
uv run mypy src/jarvis     # 0 errors
uv run ruff check src      # 0 warnings
uv run pytest              # All pass
uv run pytest --cov        # >85%

# Integration
npm run build
./dist/index.js status     # Works!
```

---

## Quality Gates

Before merging to main, verify:

- ✅ All tests pass (168+ tests)
- ✅ Coverage >85%
- ✅ Zero type errors (TypeScript strict + mypy strict)
- ✅ Zero linter warnings
- ✅ All performance targets met
- ✅ All ADRs documented
- ✅ API documentation generated
- ✅ Backward compatibility maintained
- ✅ No regressions in existing functionality

## Rollback Plan

If critical issues found:

1. **Immediate rollback**:

   ```bash
   git revert HEAD~N  # Revert N commits
   ```

2. **Partial rollback**:

   ```bash
   git checkout main -- src/commands/problematic-file.ts
   ```

3. **Feature flag**:
   ```typescript
   if (process.env.USE_OLD_IMPLEMENTATION === "true") {
     return oldImplementation();
   }
   return newImplementation();
   ```

## Success Metrics

Track these metrics before/after refactor:

| Metric                      | Before | After | Target |
| --------------------------- | ------ | ----- | ------ |
| TypeScript `any` count      | ~50    | 0     | 0      |
| Type errors                 | ~100   | 0     | 0      |
| Test coverage               | 75%    | 90%   | >85%   |
| Test execution time         | 45s    | 25s   | <30s   |
| CLI init time               | 150ms  | 80ms  | <100ms |
| Cyclomatic complexity (avg) | 15     | 8     | <10    |
| Failed tests                | 0      | 0     | 0      |

## Getting Help

- **Questions**: Post in #jarvis-dev channel
- **Issues**: Create GitHub issue with `refactor` label
- **Blockers**: Ping @tech-lead immediately
- **Documentation**: See `docs/architecture/`

## Next Steps After Refactor

1. Merge `002-full-refactor` → `main`
2. Tag release: `v0.2.0-refactor`
3. Update changelog
4. Deploy to production
5. Monitor for issues
6. Celebrate! 🎉
