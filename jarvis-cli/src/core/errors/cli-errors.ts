import { JarvisError } from "./base";

/**
 * Raised when input validation fails
 */
export class ValidationError extends JarvisError {
  constructor(
    message: string,
    field: string,
    value: unknown,
    cause?: Error
  ) {
    super(message, "VALIDATION_ERROR", { field, value }, cause);
  }

  override toCLIMessage(): string {
    return `Validation error in ${this.context.field}: ${this.message}`;
  }
}

/**
 * Raised when required argument is missing
 */
export class MissingArgumentError extends ValidationError {
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
export class InvalidArgumentError extends ValidationError {
  constructor(argumentName: string, value: unknown, expectedFormat: string) {
    super(
      `Invalid value for '${argumentName}': expected ${expectedFormat}`,
      argumentName,
      value
    );
    this.context.expectedFormat = expectedFormat;
  }
}

/**
 * Raised when MCP server connection fails
 */
export class MCPConnectionError extends JarvisError {
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
export class MCPServerError extends JarvisError {
  constructor(message: string, toolName: string, serverResponse: unknown) {
    super(message, "MCP_SERVER_ERROR", { toolName, serverResponse });
  }
}

/**
 * Raised when network request times out
 */
export class TimeoutError extends JarvisError {
  constructor(operation: string, timeoutMs: number) {
    super(
      `Operation '${operation}' timed out after ${timeoutMs}ms`,
      "TIMEOUT_ERROR",
      { operation, timeoutMs }
    );
  }
}

/**
 * Raised when file system operation fails
 */
export class FileSystemError extends JarvisError {
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
export class FileNotFoundError extends FileSystemError {
  constructor(path: string) {
    super(`File or directory not found: ${path}`, path, "read");
    this.code = "FILE_NOT_FOUND";
  }
}

/**
 * Raised when lacking permissions
 */
export class PermissionDeniedError extends FileSystemError {
  constructor(path: string, operation: "read" | "write" | "delete" | "create") {
    super(`Permission denied`, path, operation);
    this.code = "PERMISSION_DENIED";
  }
}

/**
 * Raised when configuration is invalid
 */
export class ConfigurationError extends JarvisError {
  constructor(message: string, configKey: string, configValue: unknown) {
    super(message, "CONFIGURATION_ERROR", { configKey, configValue });
  }
}

/**
 * Raised when project not initialized
 */
export class NotInitializedError extends ConfigurationError {
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

/**
 * Raised for unexpected internal errors
 */
export class InternalError extends JarvisError {
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
