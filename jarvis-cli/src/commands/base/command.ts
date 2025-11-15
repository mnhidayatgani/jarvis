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
  abstract parse(args: string[]): TOptions;
  abstract validate(options: TOptions): void;
  abstract execute(options: TOptions): Promise<TResult>;

  async run(args: string[]): Promise<TResult> {
    const options = this.parse(args);
    this.validate(options);
    return await this.execute(options);
  }
}
