/**
 * Command Factory - Creates command instances with proper dependency injection
 */

import type { ICommand } from "./base/command.js";
import { OutputFormatter, type IOutputFormatter } from "../utils/output.js";
import { createLogger, type Logger, LogLevel } from "../utils/logger.js";
import { createErrorHandler, type ErrorHandler } from "../core/errors/handler.js";
import { InitCommand } from "./init.js";
import { StatusCommand } from "./status.js";
import { ConfigCommand } from "./config.js";
import { ScanCommand } from "./scan.js";
import { RememberCommand } from "./remember.js";
import { RecallCommand } from "./recall.js";
import { DoctorCommand } from "./doctor.js";

/**
 * Command factory options
 */
export interface CommandFactoryOptions {
  /**
   * Output options (quiet, json, verbose, etc.)
   */
  output?: {
    quiet?: boolean;
    json?: boolean;
    verbose?: boolean;
    color?: boolean;
  };

  /**
   * Logger options
   */
  logger?: {
    level?: LogLevel;
    file?: string;
  };

  /**
   * Error handler options
   */
  errorHandler?: {
    exitOnCritical?: boolean;
    showStackTrace?: boolean;
  };
}

/**
 * CommandFactory class
 *
 * Creates command instances with all required dependencies injected.
 */
export class CommandFactory {
  private formatter: IOutputFormatter;
  private logger: Logger;
  private errorHandler: ErrorHandler;

  constructor(options: CommandFactoryOptions = {}) {
    // Create formatter
    this.formatter = new OutputFormatter(options.output);

    // Create logger
    this.logger = createLogger({
      level: options.logger?.level || LogLevel.INFO,
      file: options.logger?.file,
      format: options.output?.json ? "json" : "text",
      colorize: options.output?.color !== false,
    });

    // Create error handler
    this.errorHandler = createErrorHandler(
      this.formatter,
      this.logger,
      {
        exitOnCritical: options.errorHandler?.exitOnCritical !== false,
        showStackTrace: options.errorHandler?.showStackTrace || options.output?.verbose,
        autoLog: true,
      }
    );
  }

  /**
   * Create command instance by name
   *
   * @param name - Command name
   * @returns Command instance
   * @throws Error if command not found
   */
  create(name: string): ICommand<unknown, unknown> {
    switch (name) {
      case "init":
        return new InitCommand(this.formatter, this.logger, this.errorHandler);

      case "status":
        return new StatusCommand(this.formatter, this.logger, this.errorHandler);

      case "config":
        return new ConfigCommand(this.formatter, this.logger, this.errorHandler);

      case "scan":
        return new ScanCommand(this.formatter, this.logger, this.errorHandler);

      case "remember":
        return new RememberCommand(this.formatter, this.logger, this.errorHandler);

      case "recall":
        return new RecallCommand(this.formatter, this.logger, this.errorHandler);

      case "doctor":
        return new DoctorCommand(this.formatter, this.logger, this.errorHandler);

      default:
        throw new Error(`Unknown command: ${name}`);
    }
  }

  /**
   * Get formatter instance
   */
  getFormatter(): IOutputFormatter {
    return this.formatter;
  }

  /**
   * Get logger instance
   */
  getLogger(): Logger {
    return this.logger;
  }

  /**
   * Get error handler instance
   */
  getErrorHandler(): ErrorHandler {
    return this.errorHandler;
  }
}

/**
 * Create command factory with options
 *
 * @param options - Factory options
 * @returns CommandFactory instance
 */
export function createCommandFactory(options?: CommandFactoryOptions): CommandFactory {
  return new CommandFactory(options);
}
