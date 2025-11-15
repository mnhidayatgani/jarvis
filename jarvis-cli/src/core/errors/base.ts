/**
 * Base error class for all JARVIS errors.
 * Provides structured error information with codes and context.
 */
export abstract class JarvisError extends Error {
  /**
   * Machine-readable error code
   */
  code: string;

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

export interface ErrorResponse {
  error: string;
  code: string;
  message: string;
  context: Record<string, unknown>;
  stack?: string;
}
