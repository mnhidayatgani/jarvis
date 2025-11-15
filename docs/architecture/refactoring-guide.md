# JARVIS Refactoring Guide

**Target Audience**: New developers contributing to JARVIS  
**Time to Complete**: 30-45 minutes  
**Prerequisites**: Basic TypeScript and Python knowledge

## Table of Contents

1. [Quick Start](#quick-start)
2. [Adding a New CLI Command](#adding-a-new-cli-command)
3. [Adding Validation Rules](#adding-validation-rules)
4. [Working with Memory Layers](#working-with-memory-layers)
5. [Common Patterns](#common-patterns)
6. [Testing Guidelines](#testing-guidelines)
7. [Troubleshooting](#troubleshooting)

---

## Quick Start

### Setup Development Environment

```bash
# Clone and navigate
cd jarvis

# Install CLI dependencies
cd jarvis-cli
npm install

# Install MCP dependencies
cd ../jarvis-mcp
uv sync

# Run tests to verify
cd ../jarvis-cli && npm test
cd ../jarvis-mcp && uv run pytest
```

### Verify Type Checking

```bash
# TypeScript
cd jarvis-cli
npm run typecheck  # Should show 0 errors

# Python
cd jarvis-mcp
uv run mypy src/jarvis  # Should show 0 errors
```

**If you see errors**, check [Troubleshooting](#troubleshooting).

---

## Adding a New CLI Command

**Time**: ~15 minutes  
**Example**: Adding a `jarvis export` command to export memories

### Step 1: Define Types (3 min)

Create types in `jarvis-cli/src/commands/base/types.ts`:

```typescript
// Add to existing types.ts
export interface ExportOptions extends BaseCommandOptions {
  /** Output file path */
  output: string;

  /** Export format: json or markdown */
  format?: "json" | "markdown";

  /** Optional filter by type */
  type?: string;
}

export interface ExportResult {
  /** Number of entries exported */
  count: number;

  /** Output file path */
  file: string;

  /** File size in bytes */
  size: number;
}
```

### Step 2: Create Command File (5 min)

Create `jarvis-cli/src/commands/export.ts`:

```typescript
import { BaseCommand } from "./base/command";
import { ExportOptions, ExportResult } from "./base/types";
import { IMCPClient } from "../api/types";
import { IOutputFormatter } from "../utils/output";
import {
  MissingArgumentError,
  InvalidArgumentError,
  MCPConnectionError,
} from "../core/errors";

export class ExportCommand extends BaseCommand<ExportOptions, ExportResult> {
  constructor(private client: IMCPClient, private formatter: IOutputFormatter) {
    super();
  }

  parse(args: string[]): ExportOptions {
    const options: ExportOptions = {
      output: "",
      format: "json",
    };

    // Parse arguments
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];

      if (arg === "--output" || arg === "-o") {
        options.output = args[++i];
      } else if (arg === "--format" || arg === "-f") {
        options.format = args[++i] as "json" | "markdown";
      } else if (arg === "--type" || arg === "-t") {
        options.type = args[++i];
      } else if (arg === "--json") {
        options.json = true;
      } else if (arg === "--verbose") {
        options.verbose = true;
      }
    }

    return options;
  }

  validate(options: ExportOptions): void {
    // Required fields
    if (!options.output) {
      throw new MissingArgumentError("output");
    }

    // Format validation
    if (options.format && !["json", "markdown"].includes(options.format)) {
      throw new InvalidArgumentError(
        "format",
        options.format,
        'Must be either "json" or "markdown"'
      );
    }
  }

  async execute(options: ExportOptions): Promise<ExportResult> {
    try {
      // Call MCP server
      const response = await this.client.callTool("export_memories", {
        output: options.output,
        format: options.format,
        type_filter: options.type,
      });

      if (!response.success) {
        const errorMsg =
          typeof response.error === "string"
            ? response.error
            : (response.error as any)?.message || "Export failed";
        throw new MCPConnectionError(errorMsg, "mcp://export_memories");
      }

      const data = response.data as any;

      // Display output
      if (!options.json) {
        this.formatter.success(
          `Exported ${data.count} entries to ${data.file}`
        );
        if (options.verbose) {
          this.formatter.info(`File size: ${data.size} bytes`, false);
        }
      }

      return {
        success: true,
        count: data.count,
        file: data.file,
        size: data.size,
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new MCPConnectionError(error.message, "mcp://export_memories");
      }
      throw error;
    }
  }
}
```

### Step 3: Register Command (2 min)

Add to `jarvis-cli/src/index.ts`:

```typescript
import { ExportCommand } from './commands/export';

// In main() function
case 'export':
  const exportCmd = new ExportCommand(client, formatter);
  await exportCmd.run(args);
  break;
```

### Step 4: Test (5 min)

Create `jarvis-cli/tests/unit/commands/export.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { ExportCommand } from "../../../src/commands/export";
import { createMockMCPClient, createMockFormatter } from "../../helpers/mocks";

describe("ExportCommand", () => {
  let command: ExportCommand;
  let mockClient: ReturnType<typeof createMockMCPClient>;
  let mockFormatter: ReturnType<typeof createMockFormatter>;

  beforeEach(() => {
    mockClient = createMockMCPClient();
    mockFormatter = createMockFormatter();
    command = new ExportCommand(mockClient, mockFormatter);
  });

  describe("parse", () => {
    it("should parse output argument", () => {
      const options = command.parse(["--output", "export.json"]);
      expect(options.output).toBe("export.json");
      expect(options.format).toBe("json");
    });

    it("should parse format argument", () => {
      const options = command.parse(["-o", "out.md", "-f", "markdown"]);
      expect(options.format).toBe("markdown");
    });
  });

  describe("validate", () => {
    it("should throw if output missing", () => {
      expect(() => command.validate({ output: "" })).toThrow(
        "Missing required argument: output"
      );
    });

    it("should throw if format invalid", () => {
      expect(() =>
        command.validate({
          output: "test.txt",
          format: "xml" as any,
        })
      ).toThrow('Must be either "json" or "markdown"');
    });
  });

  describe("execute", () => {
    it("should export memories successfully", async () => {
      mockClient.callTool.mockResolvedValue({
        success: true,
        data: { count: 42, file: "export.json", size: 1024 },
      });

      const result = await command.execute({ output: "export.json" });

      expect(result.count).toBe(42);
      expect(result.file).toBe("export.json");
      expect(mockClient.callTool).toHaveBeenCalledWith("export_memories", {
        output: "export.json",
        format: "json",
        type_filter: undefined,
      });
    });
  });
});
```

Run test:

```bash
npm test -- export.test.ts
```

**Done!** You've added a new command following the established pattern.

---

## Adding Validation Rules

**Time**: <10 minutes  
**Example**: Add length validation to `remember` command

### Step 1: Locate validate() method

Open `jarvis-cli/src/commands/remember.ts` and find the `validate()` method.

### Step 2: Add Validation Logic

```typescript
validate(options: RememberOptions): void {
  // Existing validations
  if (!options.content) {
    throw new MissingArgumentError('content');
  }

  // NEW: Add length validation
  if (options.content.length < 10) {
    throw new ValidationError(
      'Content too short',
      'content',
      { minLength: 10, actual: options.content.length }
    );
  }

  if (options.content.length > 10000) {
    throw new ValidationError(
      'Content too long',
      'content',
      { maxLength: 10000, actual: options.content.length }
    );
  }

  // Existing tag validation...
}
```

### Step 3: Add Test

In `jarvis-cli/tests/unit/commands/remember.test.ts`:

```typescript
describe("validate", () => {
  // Existing tests...

  it("should throw if content too short", () => {
    expect(() =>
      command.validate({
        content: "short",
      })
    ).toThrow("Content too short");
  });

  it("should throw if content too long", () => {
    const longContent = "x".repeat(10001);
    expect(() =>
      command.validate({
        content: longContent,
      })
    ).toThrow("Content too long");
  });
});
```

### Step 4: Verify

```bash
npm run typecheck  # 0 errors
npm test -- remember.test.ts  # All pass
```

**Done!** Validation added in under 10 minutes.

---

## Working with Memory Layers

**Time**: ~20 minutes  
**Example**: Adding a custom query method to FactualMemory

### Understanding the Structure

All memory layers extend `BaseMemory`:

```python
# Base class provides:
- initialize(project_path)
- store(entry: MemoryEntry) -> str
- search(query, limit, filters) -> Sequence[MemoryEntry]
- get_by_id(entry_id) -> MemoryEntry | None
- delete(entry_id) -> bool
- count(filters) -> int

# Your subclass implements:
- _ensure_storage() -> None
- _store_entry(entry_id, content, metadata) -> None
- _retrieve_entry(entry_id) -> dict | None
- _search_entries(query, limit, filters) -> list[dict]
- _delete_entry(entry_id) -> bool
- _count_entries(filters) -> int
```

### Adding a Custom Method

Open `jarvis-mcp/src/jarvis/memory/factual.py`:

```python
class FactualMemory(BaseMemory):
    # Existing methods...

    def get_recent_decisions(
        self,
        days: int = 7,
        limit: int = 10
    ) -> list[dict[str, Any]]:
        """Get recent decision entries.

        Args:
            days: Number of days to look back.
            limit: Maximum results to return.

        Returns:
            List of recent decision entries.
        """
        cutoff_time = time.time() - (days * 24 * 60 * 60)

        conn = self._get_connection()
        try:
            cursor = conn.execute(
                """
                SELECT * FROM memory_entries
                WHERE content_type = 'decision'
                  AND timestamp >= ?
                ORDER BY timestamp DESC
                LIMIT ?
                """,
                (cutoff_time, limit),
            )
            rows = cursor.fetchall()
            return [self._row_to_dict(row) for row in rows]
        finally:
            conn.close()
```

### Testing the Custom Method

Create test in `jarvis-mcp/tests/unit/memory/test_factual.py`:

```python
def test_get_recent_decisions(tmp_path):
    """Test getting recent decisions."""
    memory = FactualMemory(tmp_path / "test.db")

    # Create test entries
    memory.create_entry(
        project_id="test",
        content="Use PostgreSQL",
        content_type="decision",
    )

    # Query recent decisions
    decisions = memory.get_recent_decisions(days=7, limit=10)

    assert len(decisions) == 1
    assert decisions[0]["content_type"] == "decision"
```

**Best Practice**: Keep custom methods that leverage storage-specific features (SQL joins, vector similarity, file globbing).

---

## Common Patterns

### 1. Error Handling

**Always use specific error types**:

```typescript
// ❌ Bad
throw new Error("Invalid input");

// ✅ Good
throw new ValidationError("Invalid input", "fieldName", context);
```

**Error Hierarchy**:

```
JarvisError (base)
├── NotInitializedError
├── ValidationError
│   ├── MissingArgumentError
│   └── InvalidArgumentError
├── DatabaseError
└── MCPConnectionError
```

### 2. Async/Await

**Always handle errors**:

```typescript
// ❌ Bad
const result = await client.callTool("remember", data);

// ✅ Good
try {
  const response = await client.callTool("remember", data);
  if (!response.success) {
    throw new MCPConnectionError(response.error, "mcp://remember");
  }
  return response.data;
} catch (error) {
  // Handle or re-throw
}
```

### 3. Type Safety

**Avoid `any`, use `unknown` + type guards**:

```typescript
// ❌ Bad
const data: any = response.data;

// ✅ Good
const data = response.data as unknown;
if (typeof data === "object" && data !== null && "count" in data) {
  const count = (data as { count: number }).count;
}
```

### 4. JARVIS Persona

**All user-facing output uses JARVIS persona**:

```typescript
// ❌ Bad
console.log("Memory stored successfully");

// ✅ Good
this.formatter.success("Memory stored", "Sir");
// Output: "✓ Memory stored, Sir."

// ✅ Good (error)
this.formatter.error("Failed to connect to MCP server");
// Output: "✗ I apologize, Sir. Failed to connect to MCP server"
```

---

## Testing Guidelines

### Unit Tests

**Test each method in isolation**:

```typescript
describe("RememberCommand", () => {
  describe("parse", () => {
    it("should parse content argument", () => {
      const options = command.parse(["Using PostgreSQL"]);
      expect(options.content).toBe("Using PostgreSQL");
    });
  });

  describe("validate", () => {
    it("should throw if content empty", () => {
      expect(() => command.validate({ content: "" })).toThrow(
        MissingArgumentError
      );
    });
  });

  describe("execute", () => {
    it("should call MCP client", async () => {
      mockClient.callTool.mockResolvedValue({
        success: true,
        data: { id: "123" },
      });

      await command.execute({ content: "test" });

      expect(mockClient.callTool).toHaveBeenCalledWith(
        "remember_context",
        expect.objectContaining({ content: "test" })
      );
    });
  });
});
```

### Integration Tests

**Test full command flow**:

```typescript
describe("RememberCommand Integration", () => {
  it("should store and retrieve memory", async () => {
    const command = new RememberCommand(realClient, formatter);

    const result = await command.run(["Using Redis for caching"]);

    expect(result.success).toBe(true);
    expect(result.data.id).toBeDefined();
  });
});
```

### Running Tests

```bash
# CLI tests
cd jarvis-cli
npm test                    # All tests
npm test -- remember        # Specific test
npm test -- --coverage      # With coverage

# MCP tests
cd jarvis-mcp
uv run pytest                      # All tests
uv run pytest tests/unit/          # Unit only
uv run pytest --cov=src/jarvis     # With coverage
```

---

## Troubleshooting

### TypeScript Errors

**Problem**: `npm run typecheck` shows errors

**Solutions**:

1. **Unused variables**: Prefix with underscore

   ```typescript
   validate(_options: SomeOptions): void {
     // options not used yet
   }
   ```

2. **Type mismatch**: Use proper casting

   ```typescript
   const config = loadConfig() as unknown as Record<string, unknown>;
   ```

3. **Missing types**: Check imports
   ```typescript
   import type { IMCPClient } from "../api/types";
   ```

### Python Type Errors

**Problem**: `mypy` shows errors

**Solutions**:

1. **Missing type hints**: Add them

   ```python
   def get_entry(self, entry_id: str) -> dict[str, Any] | None:
   ```

2. **Protocol compliance**: Implement all methods
   ```python
   class FactualMemory(BaseMemory):
       def _ensure_storage(self) -> None:  # Required
           ...
   ```

### Test Failures

**Problem**: Tests fail after changes

**Debug Steps**:

1. Run single test:

   ```bash
   npm test -- --run specific.test.ts
   ```

2. Check mock setup:

   ```typescript
   mockClient.callTool.mockResolvedValue({ success: true, data: {} });
   ```

3. Add debug output:
   ```typescript
   console.log("Options:", options);
   ```

### Import Errors

**Problem**: `Cannot find module`

**Solutions**:

1. Check file path (case-sensitive)
2. Verify export exists:
   ```typescript
   export class MyCommand {} // not: export default
   ```
3. Check tsconfig.json paths

---

## Best Practices Checklist

Before committing code, verify:

- [ ] `npm run typecheck` passes (TypeScript)
- [ ] `uv run mypy src/jarvis` passes (Python)
- [ ] `npm test` passes (CLI tests)
- [ ] `uv run pytest` passes (MCP tests)
- [ ] No `any` types in new code
- [ ] All public methods have JSDoc/docstrings
- [ ] Error handling uses specific error types
- [ ] JARVIS persona in all user-facing output
- [ ] Tests added for new functionality

---

## Next Steps

✅ **Completed**: Added new command / validation  
📖 **Learn More**:

- [Architecture Overview](./overview.md) - Understand system design
- [ADR-001: Command Pattern](./adr-001-command-pattern.md) - Deep dive on commands
- [ADR-002: Memory Interfaces](./adr-002-memory-interfaces.md) - Memory layer details

🚀 **Ready to Contribute**: You're now equipped to add features following JARVIS patterns!

---

**Questions?** Check the [architecture docs](./overview.md) or review existing commands in `jarvis-cli/src/commands/`.

**Found a bug?** Follow the same patterns to fix it - parse → validate → execute!

---

**Last Updated**: November 15, 2025  
**Maintainer**: JARVIS Development Team
