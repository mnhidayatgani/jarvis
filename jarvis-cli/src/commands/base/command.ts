import type { IOutputFormatter } from "../../utils/output.js";
import type { Logger } from "../../utils/logger.js";
import type { ErrorHandler } from "../../core/errors/handler.js";

/**
 * Base command interface using Template Method pattern
 */
export interface ICommand<TOptions, TResult> {
  /**
   * Parse command-line arguments into typed options
   */
  parse(args: string[]): TOptions;

  /**
   * Validate parsed options before execution
   */
  validate(options: TOptions): void;

  /**
   * Execute the command with validated options
   */
  execute(options: TOptions): Promise<TResult>;

  /**
   * Run the complete command flow: parse → validate → execute
   */
  run(args: string[]): Promise<TResult>;
}

/**
 * Abstract base class implementing Template Method pattern for commands
 */
export abstract class BaseCommand<TOptions, TResult>
  implements ICommand<TOptions, TResult>
{
  /**
   * Create base command with dependencies
   * 
   * @param formatter - Output formatter for user messages
   * @param logger - Logger for debugging
   * @param errorHandler - Error handler for consistent error handling
   */
  constructor(
    protected readonly formatter: IOutputFormatter,
    protected readonly logger: Logger,
    protected readonly errorHandler: ErrorHandler
  ) {}

  abstract parse(args: string[]): TOptions;
  abstract validate(options: TOptions): void;
  abstract execute(options: TOptions): Promise<TResult>;

  /**
   * Run command with integrated error handling
   */
  async run(args: string[]): Promise<TResult> {
    try {
      this.logger.debug("Parsing command arguments", { args });
      const options = this.parse(args);

      this.logger.debug("Validating command options", { options });
      this.validate(options);

      this.logger.info("Executing command", { command: this.constructor.name });
      const result = await this.execute(options);

      this.logger.info("Command completed successfully");
      return result;
    } catch (error) {
      // Use error handler for consistent error handling
      this.errorHandler.handle(error, {
        command: this.constructor.name,
        args,
      });
      throw error;
    }
  }
}
