# TypeScript Best Practices for JARVIS

This document outlines TypeScript best practices applied in the JARVIS codebase, with specific focus on error handling patterns, type safety, and maintainability.

## Error Handling

### Custom Error Classes

Always use specific error classes instead of generic `Error`:

```typescript
// ❌ Bad
throw new Error("Validation failed");

// ✅ Good
throw new ValidationError("Content is required", "content", "");
```

### Error Hierarchy

Extend `JarvisError` for all custom errors:

```typescript
export class MyCustomError extends JarvisError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, "MY_CUSTOM_ERROR", context);
  }
}
```

### Centralized Error Handling

Use `ErrorHandler` for consistent error handling:

```typescript
// In commands
class MyCommand extends BaseCommand<Options, Result> {
  async execute(options: Options): Promise<Result> {
    try {
      // Command logic
      return result;
    } catch (error) {
      // ErrorHandler is already integrated in BaseCommand
      throw error; // Will be caught and handled by base class
    }
  }
}

// Standalone functions
const wrapped = errorHandler.wrap(
  async () => {
    // Risky operation
  },
  { context: "operation_name" }
);
```

### Error Context

Always include relevant context in errors:

```typescript
throw new FileSystemError(
  "Failed to read config file",
  path,
  "read",
  originalError
);

// Context will include:
// - path: "/path/to/file"
// - operation: "read"
// - originalError: <Error instance>
```

### Async Error Handling

Use try/catch for async operations:

```typescript
async function fetchData(): Promise<Data> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new MCPConnectionError(`HTTP ${response.status}`, url);
    }
    return await response.json();
  } catch (error) {
    if (error instanceof MCPConnectionError) {
      throw error;
    }
    throw new InternalError("Failed to fetch data", {}, error as Error);
  }
}
```

### Recovery Patterns

Provide recovery functions for graceful degradation:

```typescript
try {
  return await primaryOperation();
} catch (error) {
  return await errorHandler.handleAsync(
    error,
    async () => await fallbackOperation()
  );
}
```

## Type Safety

### Strict Configuration

Enable all strict TypeScript flags:

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noImplicitReturns": true
  }
}
```

### Explicit Types

Always declare types explicitly:

```typescript
// ❌ Bad
const result = await fetchData();

// ✅ Good
const result: DataResponse = await fetchData();
```

### Type Guards

Use type guards for runtime checks:

```typescript
function isValidConfig(obj: unknown): obj is ProjectConfig {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "language" in obj &&
    typeof obj.language === "string"
  );
}

// Usage
if (isValidConfig(data)) {
  // data is now typed as ProjectConfig
  console.log(data.language);
}
```

### Unknown over Any

Use `unknown` instead of `any`:

```typescript
// ❌ Bad
function process(data: any) {
  return data.value; // No type checking
}

// ✅ Good
function process(data: unknown) {
  if (isDataObject(data)) {
    return data.value; // Type-safe after guard
  }
  throw new ValidationError("Invalid data type", "data", typeof data);
}
```

## Dependency Injection

### Constructor Injection

Inject all dependencies via constructor:

```typescript
export class MyService {
  constructor(
    private readonly logger: Logger,
    private readonly config: IConfigManager
  ) {}

  async doWork(): Promise<void> {
    this.logger.info("Starting work");
    const settings = await this.config.load();
    // ...
  }
}
```

### Interface-Based Dependencies

Depend on interfaces, not implementations:

```typescript
// Define interface
export interface IOutputFormatter {
  success(message: string): void;
  error(message: string, error?: Error): void;
}

// Depend on interface
class Command {
  constructor(private readonly formatter: IOutputFormatter) {}
}

// Can inject any implementation
const command = new Command(new OutputFormatter());
const testCommand = new Command(new MockFormatter());
```

## Logging

### Structured Logging

Use structured logging with context:

```typescript
logger.info("User action completed", {
  userId: user.id,
  action: "login",
  timestamp: Date.now(),
});

logger.error("Operation failed", {
  operation: "save",
  error: error.message,
  stack: error.stack,
});
```

### Log Levels

Use appropriate log levels:

```typescript
logger.debug("Detailed information for debugging");
logger.info("General information about operation");
logger.warn("Warning - something unexpected but handled");
logger.error("Error - operation failed");
```

## Async/Await

### Always Use Async/Await

Prefer async/await over raw promises:

```typescript
// ❌ Bad
function fetchData(): Promise<Data> {
  return fetch(url)
    .then((r) => r.json())
    .catch((e) => handleError(e));
}

// ✅ Good
async function fetchData(): Promise<Data> {
  try {
    const response = await fetch(url);
    return await response.json();
  } catch (error) {
    throw new MCPConnectionError("Fetch failed", url);
  }
}
```

### Parallel Operations

Use `Promise.all()` for concurrent operations:

```typescript
// ❌ Bad - Sequential
const result1 = await operation1();
const result2 = await operation2();
const result3 = await operation3();

// ✅ Good - Parallel
const [result1, result2, result3] = await Promise.all([
  operation1(),
  operation2(),
  operation3(),
]);
```

## Testing

### Test Error Paths

Always test error scenarios:

```typescript
describe("MyCommand", () => {
  it("should throw ValidationError for empty content", async () => {
    const command = new MyCommand(formatter, logger, errorHandler);

    await expect(command.execute({ content: "" })).rejects.toThrow(
      ValidationError
    );
  });

  it("should handle MCP connection errors", async () => {
    const mockClient = createMockClient();
    mockClient.callTool.mockRejectedValue(
      new MCPConnectionError("Server unreachable", "http://localhost")
    );

    const command = new MyCommand(formatter, logger, errorHandler);

    await expect(command.execute({ content: "test" })).rejects.toThrow(
      MCPConnectionError
    );
  });
});
```

### Mock Dependencies

Mock all dependencies in tests:

```typescript
const mockFormatter: IOutputFormatter = {
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  // ... other methods
};

const mockLogger: Logger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
} as any;
```

## Code Organization

### Single Responsibility

Each class/function should have one responsibility:

```typescript
// ❌ Bad - Multiple responsibilities
class CommandHandler {
  parseArgs() {}
  validateInput() {}
  executeCommand() {}
  formatOutput() {}
  logResults() {}
}

// ✅ Good - Separated concerns
class ArgumentParser {
  parse(args: string[]): Options {}
}

class InputValidator {
  validate(options: Options): void {}
}

class CommandExecutor {
  execute(options: Options): Promise<Result> {}
}
```

### Immutability

Prefer immutable data structures:

```typescript
// ❌ Bad
function updateConfig(config: Config, key: string, value: string) {
  config[key] = value; // Mutates input
  return config;
}

// ✅ Good
function updateConfig(config: Config, key: string, value: string): Config {
  return { ...config, [key]: value }; // Returns new object
}
```

## Documentation

### TSDoc Comments

Document all public APIs:

````typescript
/**
 * Store information to JARVIS memory system.
 *
 * @param content - Information to remember (1-10,000 characters)
 * @param options - Storage options
 * @returns Memory entry ID
 * @throws {ValidationError} If content is invalid
 * @throws {MCPConnectionError} If MCP server unavailable
 *
 * @example
 * ```typescript
 * const id = await remember('Using PostgreSQL', {
 *   type: 'decision',
 *   tags: ['database']
 * });
 * ```
 */
async function remember(
  content: string,
  options?: RememberOptions
): Promise<string>;
````

### Inline Comments

Add comments for complex logic:

```typescript
// Calculate similarity score using cosine similarity
// Higher scores indicate more similar content
const similarity = dotProduct(v1, v2) / (magnitude(v1) * magnitude(v2));

// Skip entries below minimum threshold
if (similarity < MIN_SIMILARITY_THRESHOLD) {
  continue;
}
```

## Performance

### Lazy Loading

Lazy load heavy dependencies:

```typescript
class EmbeddingsService {
  private _model?: EmbeddingsModel;

  private get model(): EmbeddingsModel {
    if (!this._model) {
      this._model = new EmbeddingsModel(); // Load on first use
    }
    return this._model;
  }
}
```

### Caching

Cache expensive operations:

```typescript
class ConfigManager {
  private cache = new Map<string, Config>();

  async load(path: string): Promise<Config> {
    const cached = this.cache.get(path);
    if (cached) {
      return cached;
    }

    const config = await this.loadFromDisk(path);
    this.cache.set(path, config);
    return config;
  }
}
```

## Anti-Patterns to Avoid

### Don't Use `any`

```typescript
// ❌ Never do this
function process(data: any) {
  return data.value;
}

// ✅ Use unknown and type guards
function process(data: unknown) {
  if (isDataObject(data)) {
    return data.value;
  }
  throw new ValidationError("Invalid data");
}
```

### Don't Ignore Errors

```typescript
// ❌ Bad
try {
  await riskyOperation();
} catch {
  // Silently ignore
}

// ✅ Good
try {
  await riskyOperation();
} catch (error) {
  logger.error("Operation failed", { error });
  throw error;
}
```

### Don't Return `null` for Errors

```typescript
// ❌ Bad
function findUser(id: string): User | null {
  try {
    return database.find(id);
  } catch {
    return null; // Loses error information
  }
}

// ✅ Good
function findUser(id: string): User {
  try {
    return database.find(id);
  } catch (error) {
    throw new DatabaseError("User not found", "find", `id=${id}`);
  }
}
```

## Summary

1. **Use specific error classes** with proper context
2. **Enable strict TypeScript** for maximum type safety
3. **Inject dependencies** via constructor
4. **Use async/await** consistently
5. **Test error paths** thoroughly
6. **Document public APIs** with TSDoc
7. **Cache and lazy load** for performance
8. **Avoid `any`, `null`, and silent failures**

Following these practices ensures maintainable, type-safe, and robust TypeScript code in the JARVIS project.
