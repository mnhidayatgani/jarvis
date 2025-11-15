# ADR-003: Error Hierarchy and Handling Strategy

## Status

Accepted

## Context

The original JARVIS codebase had inconsistent error handling:

- Mix of throwing `Error` objects and returning error strings
- No structured error information for debugging
- Inconsistent user-facing error messages
- Difficult to handle errors programmatically
- No error recovery mechanisms
- Scattered error handling logic throughout codebase

We needed a consistent error handling strategy that provides:

- Type-safe error handling
- Structured error information (code, message, context)
- User-friendly messages with JARVIS persona
- Detailed logging for debugging
- Programmatic error handling
- Graceful degradation and recovery
- Centralized error handling logic

## Decision

We implemented a hierarchical error system with:

### 1. Custom Error Hierarchy

**TypeScript** (`jarvis-cli/src/core/errors/`):

```typescript
abstract class JarvisError extends Error
├── ValidationError
├── MCPConnectionError
├── FileSystemError
├── ConfigurationError
└── InternalError
```

**Python** (`jarvis-mcp/src/jarvis/core/errors.py`):

```python
class JarvisError(Exception)
├── ValidationError
├── DatabaseError
├── MCPToolError
├── FileSystemError
└── InternalError
```

### 2. Structured Error Information

All errors include:

- **code**: Machine-readable error code (e.g., "VALIDATION_ERROR")
- **message**: Human-readable error message
- **context**: Additional debugging information (field, value, operation, etc.)
- **cause**: Original error if wrapping another error

### 3. Centralized Error Handler

**TypeScript** (`ErrorHandler` class):

- Normalizes all errors to `JarvisError` instances
- Logs errors with appropriate severity
- Displays user-friendly messages with JARVIS persona
- Provides contextual hints for common errors
- Supports error recovery with fallback functions

**Python** (`ErrorHandler` class):

- Similar functionality for MCP tools
- Returns structured error responses for MCP protocol
- Supports decorator pattern for wrapping functions

### 4. Retry Logic with Exponential Backoff

Implemented in `MCPClient` for network operations:

- Configurable max retries (default: 3)
- Exponential backoff with jitter
- Retryable error detection
- Maximum delay cap

### 5. Graceful Degradation

Implemented in `MemoryCore` for memory operations:

- Partial success when one layer fails
- Continue operation if at least one layer succeeds
- Detailed logging of failures
- User notification of degraded functionality

## Consequences

### Positive

1. **Consistent Error Handling**

   - All errors follow same structure
   - Predictable error handling across codebase
   - Easy to add new error types

2. **Better Debugging**

   - Structured context in every error
   - Detailed logging with severity levels
   - Stack traces preserved in logs

3. **Improved User Experience**

   - User-friendly error messages with JARVIS persona
   - Helpful hints for common errors
   - Clear indication of degraded functionality

4. **Programmatic Error Handling**

   - Type-safe error catching
   - Error codes for automated handling
   - Structured error responses for APIs

5. **Resilience**

   - Automatic retry for transient failures
   - Graceful degradation when components fail
   - System remains functional even with partial failures

6. **Testability**
   - Easy to mock error scenarios
   - Consistent error assertions in tests
   - Error handlers are independently testable

### Negative

1. **Additional Boilerplate**

   - Must create specific error classes
   - More code to maintain error hierarchy
   - Need to map errors to correct types

2. **Learning Curve**

   - Developers must learn error hierarchy
   - Need to know which error type to use
   - Additional testing required for error paths

3. **Performance Overhead**
   - Retry logic adds latency to failures
   - Error normalization has minimal overhead
   - Logging can impact performance if excessive

### Neutral

1. **Migration Required**

   - All existing `throw new Error()` replaced
   - All exception handlers updated
   - Tests updated to check error types

2. **Documentation Needed**
   - Error types must be documented
   - Recovery patterns need examples
   - Best practices for error handling

## Implementation Notes

### Error Codes

Standardized error codes across both projects:

- `VALIDATION_ERROR` - Input validation failures
- `MCP_CONNECTION_ERROR` - MCP server communication failures
- `FILESYSTEM_ERROR` - File system operation failures
- `DATABASE_ERROR` - Database operation failures (Python)
- `CONFIGURATION_ERROR` - Configuration issues (TypeScript)
- `MCP_TOOL_ERROR` - MCP tool execution failures (Python)
- `INTERNAL_ERROR` - Unexpected errors

### Retry Configuration

Default retry settings:

- Max retries: 3
- Initial delay: 1000ms
- Max delay: 10000ms
- Backoff multiplier: 2
- Retryable errors: `NETWORK_ERROR`, `TIMEOUT_ERROR`, `MCP_CONNECTION_ERROR`

### Graceful Degradation Strategy

Memory operations continue if:

- At least one memory layer succeeds
- Non-critical operations can be skipped
- Fallback data is available

Memory operations fail if:

- All memory layers fail
- Critical operation cannot be completed
- No fallback available

## Examples

### TypeScript Error Handling

```typescript
// Throwing specific error
throw new ValidationError("Content is required", "content", "");

// Handling with error handler
try {
  await command.execute(options);
} catch (error) {
  errorHandler.handle(error, { command: "init" });
  throw error;
}

// Wrapping with automatic error handling
const wrapped = errorHandler.wrap(riskyOperation, { context: "scan" });
await wrapped();
```

### Python Error Handling

```python
# Raising specific error
raise ValidationError("Content required", field="content", value="")

# Handling with decorator
@error_handler.wrap(context={"tool": "remember"})
def remember_context(content: str) -> dict:
    ...

# Recovery pattern
result = error_handler.handle_with_recovery(
    error,
    recovery=lambda: fallback_search(query)
)
```

### Graceful Degradation

```python
# Store in memory with degradation
successful_layers = []
failed_layers = []

try:
    factual.store(entry)
    successful_layers.append("factual")
except Exception as e:
    failed_layers.append("factual")
    logger.warning(f"Factual layer failed: {e}")

try:
    semantic.store(entry)
    successful_layers.append("semantic")
except Exception as e:
    failed_layers.append("semantic")
    logger.warning(f"Semantic layer failed: {e}")

if not successful_layers:
    raise RuntimeError("All layers failed")
```

## Alternatives Considered

### 1. Result<T, E> Pattern

Use a Result type instead of exceptions.

**Rejected because**:

- Not idiomatic in TypeScript/Python
- Requires wrapping every operation
- More verbose than try/catch
- Library support expects exceptions

### 2. Error Middleware

Centralized error middleware that catches all errors.

**Rejected because**:

- Loss of context at error origin
- Harder to debug error sources
- Less control over error handling
- Difficult to test specific error scenarios

### 3. Simple Error Codes Only

Just use error codes without custom classes.

**Rejected because**:

- Loses type safety
- No structured context
- Can't use instanceof checks
- Harder to extend

### 4. No Retry Logic

Handle retries at application level.

**Rejected because**:

- Duplicated retry logic everywhere
- Inconsistent retry behavior
- Harder to test and maintain
- No centralized retry configuration

## Related

- [ADR-001: Command Pattern](./adr-001-command-pattern.md) - Uses error handler in base command
- [ADR-002: Memory Interfaces](./adr-002-memory-interfaces.md) - Graceful degradation in memory core
- [research.md](../../specs/002-full-refactor/research.md) - Error handling best practices

## References

- TypeScript Error Handling: https://www.typescriptlang.org/docs/handbook/2/narrowing.html
- Python Exception Hierarchy: https://docs.python.org/3/library/exceptions.html
- Exponential Backoff: https://en.wikipedia.org/wiki/Exponential_backoff
- Circuit Breaker Pattern: https://martinfowler.com/bliki/CircuitBreaker.html
