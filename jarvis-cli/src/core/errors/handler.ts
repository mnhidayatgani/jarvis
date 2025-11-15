/**
 * ErrorHandler - Centralized error handling for JARVIS CLI
 *
 * Provides consistent error handling with:
 * - User-friendly error messages with JARVIS persona
 * - Detailed logging for debugging
 * - Error context preservation
 * - Graceful degradation
 */

import { JarvisError, type ErrorResponse } from "./base.js";
import type { IOutputFormatter } from "../../utils/output.js";
import type { Logger } from "../../utils/logger";

/**
 * Error handling options
 */
export interface ErrorHandlerOptions {
  /**
   * Whether to exit process on critical errors
   */
  exitOnCritical?: boolean;

  /**
   * Whether to show stack traces in output
   */
  showStackTrace?: boolean;

  /**
   * Whether to log errors automatically
   */
  autoLog?: boolean;
}

/**
 * ErrorHandler class
 *
 * Centralized error handling with consistent user messaging and logging.
 */
export class ErrorHandler {
  constructor(
    private readonly formatter: IOutputFormatter,
    private readonly logger: Logger,
    private readonly options: ErrorHandlerOptions = {}
  ) {
    this.options = {
      exitOnCritical: true,
      showStackTrace: false,
      autoLog: true,
      ...options,
    };
  }

  /**
   * Handle an error with appropriate user messaging and logging
   *
   * @param error - Error to handle
   * @param context - Additional context information
   * @returns Error response object
   */
  handle(error: unknown, context?: Record<string, unknown>): ErrorResponse {
    // Convert to JarvisError if needed
    const jarvisError = this.normalizeError(error, context);

    // Log the error
    if (this.options.autoLog) {
      this.logError(jarvisError);
    }

    // Display user-friendly message
    this.displayError(jarvisError);

    // Exit on critical errors if configured
    if (this.isCritical(jarvisError) && this.options.exitOnCritical) {
      process.exit(1);
    }

    return jarvisError.toJSON();
  }

  /**
   * Handle error asynchronously with optional recovery
   *
   * @param error - Error to handle
   * @param recovery - Optional recovery function
   * @param context - Additional context
   * @returns Recovery result or throws
   */
  async handleAsync<T>(
    error: unknown,
    recovery?: () => Promise<T>,
    context?: Record<string, unknown>
  ): Promise<T | ErrorResponse> {
    const jarvisError = this.normalizeError(error, context);

    // Log the error
    if (this.options.autoLog) {
      this.logError(jarvisError);
    }

    // Try recovery if provided
    if (recovery) {
      try {
        this.logger.info("Attempting error recovery...", { error: jarvisError.code });
        return await recovery();
      } catch (recoveryError) {
        this.logger.error("Recovery failed", { recoveryError });
        this.displayError(jarvisError);
        throw jarvisError;
      }
    }

    // No recovery - display and throw
    this.displayError(jarvisError);
    throw jarvisError;
  }

  /**
   * Wrap a function with error handling
   *
   * @param fn - Function to wrap
   * @param context - Context for error handling
   * @returns Wrapped function
   */
  wrap<TArgs extends unknown[], TResult>(
    fn: (...args: TArgs) => Promise<TResult>,
    context?: Record<string, unknown>
  ): (...args: TArgs) => Promise<TResult> {
    return async (...args: TArgs): Promise<TResult> => {
      try {
        return await fn(...args);
      } catch (error) {
        this.handle(error, context);
        throw error;
      }
    };
  }

  /**
   * Normalize any error to JarvisError
   *
   * @param error - Error to normalize
   * @param context - Additional context
   * @returns JarvisError instance
   */
  private normalizeError(error: unknown, context?: Record<string, unknown>): JarvisError {
    // Already a JarvisError
    if (error instanceof JarvisError) {
      // Merge additional context
      if (context) {
        Object.assign(error.context, context);
      }
      return error;
    }

    // Standard Error
    if (error instanceof Error) {
      const { InternalError } = require("./cli-errors.js");
      return new InternalError(error.message, context, error);
    }

    // Unknown error type
    const { InternalError } = require("./cli-errors.js");
    return new InternalError(
      "An unexpected error occurred",
      {
        ...context,
        originalError: error,
      }
    );
  }

  /**
   * Log error with appropriate level
   *
   * @param error - Error to log
   */
  private logError(error: JarvisError): void {
    const logContext = {
      code: error.code,
      context: error.context,
      stack: error.stack,
    };

    if (this.isCritical(error)) {
      this.logger.error(error.message, logContext);
    } else if (this.isWarning(error)) {
      this.logger.warn(error.message, logContext);
    } else {
      this.logger.info(error.message, logContext);
    }
  }

  /**
   * Display error to user with JARVIS persona
   *
   * @param error - Error to display
   */
  private displayError(error: JarvisError): void {
    // Get user-friendly message
    const message = this.getUserMessage(error);

    // Display error
    if (this.options.showStackTrace && error.stack) {
      this.formatter.error(message, error);
    } else {
      this.formatter.error(message);
    }

    // Show context hints if available
    if (error.context && Object.keys(error.context).length > 0) {
      const hints = this.getContextHints(error);
      if (hints.length > 0) {
        this.formatter.info("Suggestions:", false);
        this.formatter.list(hints);
      }
    }
  }

  /**
   * Get user-friendly error message
   *
   * @param error - Error object
   * @returns User-friendly message
   */
  private getUserMessage(error: JarvisError): string {
    // Use custom CLI message if available
    if (error.toCLIMessage) {
      return error.toCLIMessage();
    }

    return error.message;
  }

  /**
   * Get contextual hints for error
   *
   * @param error - Error object
   * @returns Array of helpful hints
   */
  private getContextHints(error: JarvisError): string[] {
    const hints: string[] = [];

    // File-related hints
    if (error.context.path) {
      hints.push(`Check if file exists: ${error.context.path}`);
    }

    // Network-related hints
    if (error.code === "MCP_CONNECTION_ERROR") {
      hints.push("Ensure MCP server is running");
      hints.push("Run 'jarvis doctor' to check system health");
    }

    // Validation hints
    if (error.code === "VALIDATION_ERROR" && error.context.field) {
      hints.push(`Review the '${error.context.field}' value`);
    }

    // Config hints
    if (error.code === "CONFIGURATION_ERROR") {
      hints.push("Run 'jarvis config --list' to view current settings");
      hints.push("Run 'jarvis init' if project is not initialized");
    }

    return hints;
  }

  /**
   * Check if error is critical (should exit process)
   *
   * @param error - Error to check
   * @returns True if critical
   */
  private isCritical(error: JarvisError): boolean {
    const criticalCodes = [
      "INTERNAL_ERROR",
      "CONFIGURATION_ERROR",
      "FILESYSTEM_ERROR",
    ];
    return criticalCodes.includes(error.code);
  }

  /**
   * Check if error is a warning
   *
   * @param error - Error to check
   * @returns True if warning
   */
  private isWarning(error: JarvisError): boolean {
    const warningCodes = ["VALIDATION_ERROR"];
    return warningCodes.includes(error.code);
  }
}

/**
 * Create default error handler instance
 *
 * @param formatter - Output formatter
 * @param logger - Logger instance
 * @param options - Error handler options
 * @returns ErrorHandler instance
 */
export function createErrorHandler(
  formatter: IOutputFormatter,
  logger: Logger,
  options?: ErrorHandlerOptions
): ErrorHandler {
  return new ErrorHandler(formatter, logger, options);
}
