/**
 * Logger - Structured logging for JARVIS CLI
 *
 * Provides:
 * - Multiple log levels (debug, info, warn, error)
 * - Structured context logging
 * - JSON and text output formats
 * - File and console transports
 */

import { appendFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

/**
 * Log levels in order of severity
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

/**
 * Log entry structure
 */
export interface LogEntry {
  /**
   * Timestamp of log entry
   */
  timestamp: string;

  /**
   * Log level
   */
  level: string;

  /**
   * Log message
   */
  message: string;

  /**
   * Additional context
   */
  context?: Record<string, unknown>;

  /**
   * Stack trace if error
   */
  stack?: string;
}

/**
 * Logger configuration
 */
export interface LoggerConfig {
  /**
   * Minimum log level to record
   */
  level?: LogLevel;

  /**
   * Output format (json or text)
   */
  format?: "json" | "text";

  /**
   * Whether to log to console
   */
  console?: boolean;

  /**
   * Log file path
   */
  file?: string;

  /**
   * Whether to include timestamps
   */
  timestamps?: boolean;

  /**
   * Whether to colorize console output
   */
  colorize?: boolean;
}

/**
 * Logger class
 *
 * Provides structured logging with multiple output formats and destinations.
 */
export class Logger {
  private config: Required<LoggerConfig>;

  constructor(config: LoggerConfig = {}) {
    this.config = {
      level: LogLevel.INFO,
      format: "text",
      console: true,
      file: "",
      timestamps: true,
      colorize: process.stdout.isTTY,
      ...config,
    };

    // Create log directory if file logging enabled
    if (this.config.file) {
      const logDir = join(this.config.file, "..");
      if (!existsSync(logDir)) {
        mkdirSync(logDir, { recursive: true });
      }
    }
  }

  /**
   * Log debug message
   *
   * @param message - Debug message
   * @param context - Additional context
   */
  debug(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  /**
   * Log info message
   *
   * @param message - Info message
   * @param context - Additional context
   */
  info(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.INFO, message, context);
  }

  /**
   * Log warning message
   *
   * @param message - Warning message
   * @param context - Additional context
   */
  warn(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.WARN, message, context);
  }

  /**
   * Log error message
   *
   * @param message - Error message
   * @param context - Additional context (may include error and stack)
   */
  error(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.ERROR, message, context);
  }

  /**
   * Internal log method
   *
   * @param level - Log level
   * @param message - Log message
   * @param context - Additional context
   */
  private log(level: LogLevel, message: string, context?: Record<string, unknown>): void {
    // Check if we should log at this level
    if (level < this.config.level) {
      return;
    }

    // Create log entry
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: LogLevel[level],
      message,
      context,
    };

    // Extract stack trace if present
    if (context?.stack && typeof context.stack === "string") {
      entry.stack = context.stack;
    }

    // Output to console
    if (this.config.console) {
      this.writeToConsole(entry, level);
    }

    // Output to file
    if (this.config.file) {
      this.writeToFile(entry);
    }
  }

  /**
   * Write log entry to console
   *
   * @param entry - Log entry
   * @param level - Log level
   */
  private writeToConsole(entry: LogEntry, level: LogLevel): void {
    if (this.config.format === "json") {
      console.log(JSON.stringify(entry));
      return;
    }

    // Text format
    const parts: string[] = [];

    // Timestamp
    if (this.config.timestamps) {
      parts.push(`[${entry.timestamp}]`);
    }

    // Level
    const levelStr = this.colorize(entry.level, level);
    parts.push(levelStr);

    // Message
    parts.push(entry.message);

    // Output
    const output = parts.join(" ");

    if (level >= LogLevel.ERROR) {
      console.error(output);
      if (entry.stack) {
        console.error(this.dim(entry.stack));
      }
    } else {
      console.log(output);
    }

    // Context (if verbose)
    if (entry.context && Object.keys(entry.context).length > 0) {
      console.log(this.dim(JSON.stringify(entry.context, null, 2)));
    }
  }

  /**
   * Write log entry to file
   *
   * @param entry - Log entry
   */
  private writeToFile(entry: LogEntry): void {
    const line = JSON.stringify(entry) + "\n";

    try {
      appendFileSync(this.config.file, line, "utf8");
    } catch (error) {
      // Fallback to console if file write fails
      console.error("Failed to write to log file:", error);
    }
  }

  /**
   * Colorize text based on log level
   *
   * @param text - Text to colorize
   * @param level - Log level
   * @returns Colorized text
   */
  private colorize(text: string, level: LogLevel): string {
    if (!this.config.colorize) {
      return text;
    }

    const colors: Record<LogLevel, string> = {
      [LogLevel.DEBUG]: "\x1b[36m", // Cyan
      [LogLevel.INFO]: "\x1b[32m", // Green
      [LogLevel.WARN]: "\x1b[33m", // Yellow
      [LogLevel.ERROR]: "\x1b[31m", // Red
    };

    const color = colors[level] || "";
    return `${color}${text}\x1b[0m`;
  }

  /**
   * Dim text
   *
   * @param text - Text to dim
   * @returns Dimmed text
   */
  private dim(text: string): string {
    if (!this.config.colorize) {
      return text;
    }
    return `\x1b[2m${text}\x1b[0m`;
  }

  /**
   * Set log level
   *
   * @param level - New log level
   */
  setLevel(level: LogLevel): void {
    this.config.level = level;
  }

  /**
   * Enable/disable console output
   *
   * @param enabled - Whether to enable console output
   */
  setConsole(enabled: boolean): void {
    this.config.console = enabled;
  }

  /**
   * Set log file path
   *
   * @param path - Log file path
   */
  setFile(path: string): void {
    this.config.file = path;

    // Create log directory
    const logDir = join(path, "..");
    if (!existsSync(logDir)) {
      mkdirSync(logDir, { recursive: true });
    }
  }
}

/**
 * Create logger instance
 *
 * @param config - Logger configuration
 * @returns Logger instance
 */
export function createLogger(config?: LoggerConfig): Logger {
  return new Logger(config);
}

/**
 * Default logger instance
 */
export const logger = new Logger();

