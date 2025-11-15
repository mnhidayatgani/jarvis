# Error Type Hierarchy

**Purpose**: Define error type hierarchies for TypeScript and Python  
**Date**: November 15, 2025

## TypeScript Error Hierarchy

### Base Error

```typescript
/**
 * Base error class for all JARVIS errors.
 * Provides structured error information with codes and context.
 */
abstract class JarvisError extends Error {
  /**
   * Machine-readable error code
   */
  readonly code: string;

  /**
   * Additional context for debugging
   */
  readonly context: Record<string, unknown>;

  /**
   * Original error if this wraps another error
   */
  readonly cause?: Error;

  constructor(
    message: string,
    code: string,
    context?: Record<string, unknown>,
    cause?: Error
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.context = context || {};
    this.cause = cause;

    // Maintains proper stack trace in V8
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Serialize error for JSON responses
   */
  toJSON(): ErrorResponse {
    return {
      error: this.name,
      code: this.code,
      message: this.message,
      context: this.context,
      stack: this.stack,
    };
  }

  /**
   * Format error message for CLI display
   */
  toCLIMessage(): string {
    return `Error: ${this.message}`;
  }
}

interface ErrorResponse {
  error: string;
  code: string;
  message: string;
  context: Record<string, unknown>;
  stack?: string;
}
```

### Validation Errors

```typescript
/**
 * Raised when input validation fails
 */
class ValidationError extends JarvisError {
  constructor(message: string, field: string, value: unknown, cause?: Error) {
    super(message, "VALIDATION_ERROR", { field, value }, cause);
  }

  override toCLIMessage(): string {
    return `Validation error in ${this.context.field}: ${this.message}`;
  }
}

/**
 * Raised when required argument is missing
 */
class MissingArgumentError extends ValidationError {
  constructor(argumentName: string) {
    super(
      `Required argument '${argumentName}' is missing`,
      argumentName,
      undefined
    );
  }
}

/**
 * Raised when argument has invalid value
 */
class InvalidArgumentError extends ValidationError {
  constructor(argumentName: string, value: unknown, expectedFormat: string) {
    super(
      `Invalid value for '${argumentName}': expected ${expectedFormat}`,
      argumentName,
      value
    );
    this.context.expectedFormat = expectedFormat;
  }
}
```

### Network/Connection Errors

```typescript
/**
 * Raised when MCP server connection fails
 */
class MCPConnectionError extends JarvisError {
  constructor(message: string, serverUrl: string, cause?: Error) {
    super(message, "MCP_CONNECTION_ERROR", { serverUrl }, cause);
  }

  override toCLIMessage(): string {
    return `Cannot connect to MCP server at ${this.context.serverUrl}: ${this.message}`;
  }
}

/**
 * Raised when MCP server returns error response
 */
class MCPServerError extends JarvisError {
  constructor(message: string, toolName: string, serverResponse: unknown) {
    super(message, "MCP_SERVER_ERROR", { toolName, serverResponse });
  }
}

/**
 * Raised when network request times out
 */
class TimeoutError extends JarvisError {
  constructor(operation: string, timeoutMs: number) {
    super(
      `Operation '${operation}' timed out after ${timeoutMs}ms`,
      "TIMEOUT_ERROR",
      { operation, timeoutMs }
    );
  }
}
```

### Filesystem Errors

```typescript
/**
 * Raised when file system operation fails
 */
class FileSystemError extends JarvisError {
  constructor(
    message: string,
    path: string,
    operation: "read" | "write" | "delete" | "create",
    cause?: Error
  ) {
    super(message, "FILESYSTEM_ERROR", { path, operation }, cause);
  }

  override toCLIMessage(): string {
    return `Cannot ${this.context.operation} '${this.context.path}': ${this.message}`;
  }
}

/**
 * Raised when file/directory not found
 */
class FileNotFoundError extends FileSystemError {
  constructor(path: string) {
    super(`File or directory not found: ${path}`, path, "read");
    this.code = "FILE_NOT_FOUND";
  }
}

/**
 * Raised when lacking permissions
 */
class PermissionDeniedError extends FileSystemError {
  constructor(path: string, operation: string) {
    super(`Permission denied`, path, operation as any);
    this.code = "PERMISSION_DENIED";
  }
}
```

### Configuration Errors

```typescript
/**
 * Raised when configuration is invalid
 */
class ConfigurationError extends JarvisError {
  constructor(message: string, configKey: string, configValue: unknown) {
    super(message, "CONFIGURATION_ERROR", { configKey, configValue });
  }
}

/**
 * Raised when project not initialized
 */
class NotInitializedError extends ConfigurationError {
  constructor(projectPath: string) {
    super(
      `Project not initialized. Run 'jarvis init' first.`,
      "initialized",
      false
    );
    this.context.projectPath = projectPath;
    this.code = "NOT_INITIALIZED";
  }
}
```

### Internal Errors

```typescript
/**
 * Raised for unexpected internal errors
 */
class InternalError extends JarvisError {
  constructor(
    message: string,
    context?: Record<string, unknown>,
    cause?: Error
  ) {
    super(message, "INTERNAL_ERROR", context, cause);
  }

  override toCLIMessage(): string {
    return `Internal error: ${this.message}\nPlease report this issue.`;
  }
}
```

## Python Error Hierarchy

### Base Error

```python
from typing import Any

class JarvisError(Exception):
    """Base exception for all JARVIS errors."""

    def __init__(
        self,
        message: str,
        code: str,
        context: dict[str, Any] | None = None,
        cause: Exception | None = None
    ) -> None:
        super().__init__(message)
        self.code = code
        self.context = context or {}
        self.__cause__ = cause

    def to_dict(self) -> dict[str, Any]:
        """Serialize error for JSON responses."""
        return {
            "error": self.__class__.__name__,
            "code": self.code,
            "message": str(self),
            "context": self.context
        }

    def to_cli_message(self) -> str:
        """Format error message for CLI display."""
        return f"Error: {self}"
```

### Validation Errors

```python
class ValidationError(JarvisError):
    """Raised when input validation fails."""

    def __init__(
        self,
        message: str,
        field: str,
        value: Any,
        cause: Exception | None = None
    ) -> None:
        super().__init__(
            message,
            "VALIDATION_ERROR",
            {"field": field, "value": value},
            cause
        )

    def to_cli_message(self) -> str:
        return f"Validation error in {self.context['field']}: {self}"


class MissingFieldError(ValidationError):
    """Raised when required field is missing."""

    def __init__(self, field_name: str) -> None:
        super().__init__(
            f"Required field '{field_name}' is missing",
            field_name,
            None
        )


class InvalidValueError(ValidationError):
    """Raised when field has invalid value."""

    def __init__(
        self,
        field_name: str,
        value: Any,
        expected_format: str
    ) -> None:
        super().__init__(
            f"Invalid value for '{field_name}': expected {expected_format}",
            field_name,
            value
        )
        self.context["expected_format"] = expected_format
```

### Database Errors

```python
class DatabaseError(JarvisError):
    """Raised when database operation fails."""

    def __init__(
        self,
        message: str,
        operation: str,
        query: str | None = None,
        cause: Exception | None = None
    ) -> None:
        super().__init__(
            message,
            "DATABASE_ERROR",
            {"operation": operation, "query": query},
            cause
        )


class ConnectionError(DatabaseError):
    """Raised when database connection fails."""

    def __init__(
        self,
        db_type: str,
        db_path: str,
        cause: Exception | None = None
    ) -> None:
        super().__init__(
            f"Cannot connect to {db_type} database at {db_path}",
            "connect",
            None,
            cause
        )
        self.code = "DATABASE_CONNECTION_ERROR"
        self.context.update({"db_type": db_type, "db_path": db_path})


class QueryError(DatabaseError):
    """Raised when database query fails."""

    def __init__(
        self,
        query: str,
        error_message: str,
        cause: Exception | None = None
    ) -> None:
        super().__init__(
            f"Query failed: {error_message}",
            "query",
            query,
            cause
        )
        self.code = "DATABASE_QUERY_ERROR"
```

### MCP Tool Errors

```python
class MCPToolError(JarvisError):
    """Raised when MCP tool execution fails."""

    def __init__(
        self,
        message: str,
        tool_name: str,
        arguments: dict[str, Any],
        cause: Exception | None = None
    ) -> None:
        super().__init__(
            message,
            "MCP_TOOL_ERROR",
            {"tool_name": tool_name, "arguments": arguments},
            cause
        )


class ToolNotFoundError(MCPToolError):
    """Raised when requested tool doesn't exist."""

    def __init__(self, tool_name: str) -> None:
        super().__init__(
            f"Tool '{tool_name}' not found",
            tool_name,
            {}
        )
        self.code = "TOOL_NOT_FOUND"


class ToolExecutionError(MCPToolError):
    """Raised when tool execution fails."""

    def __init__(
        self,
        tool_name: str,
        error_message: str,
        arguments: dict[str, Any],
        cause: Exception | None = None
    ) -> None:
        super().__init__(
            f"Tool '{tool_name}' execution failed: {error_message}",
            tool_name,
            arguments,
            cause
        )
        self.code = "TOOL_EXECUTION_ERROR"
```

### Filesystem Errors

```python
class FileSystemError(JarvisError):
    """Raised when filesystem operation fails."""

    def __init__(
        self,
        message: str,
        path: str,
        operation: str,
        cause: Exception | None = None
    ) -> None:
        super().__init__(
            message,
            "FILESYSTEM_ERROR",
            {"path": path, "operation": operation},
            cause
        )

    def to_cli_message(self) -> str:
        return f"Cannot {self.context['operation']} '{self.context['path']}': {self}"


class NotInitializedError(FileSystemError):
    """Raised when project not initialized."""

    def __init__(self, project_path: str) -> None:
        super().__init__(
            "Project not initialized. Run 'jarvis init' first.",
            project_path,
            "initialize"
        )
        self.code = "NOT_INITIALIZED"
```

## Error Handling Patterns

### TypeScript Error Handler

```typescript
/**
 * Central error handler for CLI commands
 */
class ErrorHandler {
  constructor(
    private readonly formatter: IOutputFormatter,
    private readonly logger: ILogger
  ) {}

  handle(error: unknown, command: string): never {
    // Log full error with stack trace
    this.logger.error("Command failed", {
      command,
      error: error instanceof Error ? error : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    // Format user-friendly message
    if (error instanceof JarvisError) {
      this.formatter.error(error.toCLIMessage());

      // Show context in verbose mode
      if (this.formatter.isVerbose()) {
        this.formatter.info(
          `Context: ${JSON.stringify(error.context, null, 2)}`
        );
      }

      process.exit(1);
    }

    // Unexpected errors
    if (error instanceof Error) {
      this.formatter.error(`An unexpected error occurred: ${error.message}`);
      this.formatter.info(
        "Please report this issue with the following details:"
      );
      this.formatter.info(error.stack || "No stack trace available");
      process.exit(2);
    }

    // Unknown error type
    this.formatter.error(`Unknown error: ${String(error)}`);
    process.exit(2);
  }
}
```

### Python Error Handler

```python
import logging
from typing import Any

logger = logging.getLogger(__name__)

def handle_tool_error(
    error: Exception,
    tool_name: str,
    arguments: dict[str, Any]
) -> dict[str, Any]:
    """
    Handle errors in MCP tool execution.

    Returns structured error response for MCP protocol.
    """
    # Log full error with context
    logger.error(
        f"Tool '{tool_name}' failed",
        exc_info=True,
        extra={"tool_name": tool_name, "arguments": arguments}
    )

    # Return structured error
    if isinstance(error, JarvisError):
        return {
            "success": False,
            "error": error.to_dict()
        }

    # Wrap unexpected errors
    internal_error = InternalError(
        f"Unexpected error in tool '{tool_name}': {str(error)}",
        {"tool_name": tool_name, "arguments": arguments},
        error
    )

    return {
        "success": False,
        "error": internal_error.to_dict()
    }
```

## Error Code Registry

| Code                        | Error Class           | Description                  |
| --------------------------- | --------------------- | ---------------------------- |
| `VALIDATION_ERROR`          | ValidationError       | Input validation failed      |
| `MCP_CONNECTION_ERROR`      | MCPConnectionError    | Cannot connect to MCP server |
| `MCP_SERVER_ERROR`          | MCPServerError        | MCP server returned error    |
| `TIMEOUT_ERROR`             | TimeoutError          | Operation timed out          |
| `FILESYSTEM_ERROR`          | FileSystemError       | File operation failed        |
| `FILE_NOT_FOUND`            | FileNotFoundError     | File/directory not found     |
| `PERMISSION_DENIED`         | PermissionDeniedError | Insufficient permissions     |
| `CONFIGURATION_ERROR`       | ConfigurationError    | Invalid configuration        |
| `NOT_INITIALIZED`           | NotInitializedError   | Project not initialized      |
| `DATABASE_ERROR`            | DatabaseError         | Database operation failed    |
| `DATABASE_CONNECTION_ERROR` | ConnectionError       | Cannot connect to database   |
| `DATABASE_QUERY_ERROR`      | QueryError            | Database query failed        |
| `MCP_TOOL_ERROR`            | MCPToolError          | MCP tool execution failed    |
| `TOOL_NOT_FOUND`            | ToolNotFoundError     | Tool doesn't exist           |
| `TOOL_EXECUTION_ERROR`      | ToolExecutionError    | Tool execution failed        |
| `INTERNAL_ERROR`            | InternalError         | Unexpected internal error    |
