/**
 * CLI Output Formatter
 *
 * Provides colorized output and JARVIS persona formatting for CLI.
 */

export interface OutputOptions {
  quiet?: boolean
  json?: boolean
  verbose?: boolean
  color?: boolean
}

export class OutputFormatter {
  private options: OutputOptions

  constructor(options: OutputOptions = {}) {
    this.options = {
      quiet: false,
      json: false,
      verbose: false,
      color: true,
      ...options,
    }
  }

  /**
   * Print success message
   */
  success(message: string, detail?: string): void {
    if (this.options.quiet) return

    if (this.options.json) {
      this.printJson({ success: true, message, detail })
      return
    }

    const formatted = detail
      ? `${this.green('✓')} ${detail}, Sir.`
      : `${this.green('✓')} ${message}, Sir.`

    console.log(formatted)
  }

  /**
   * Print error message
   */
  error(message: string, error?: Error): void {
    if (this.options.json) {
      this.printJson({
        success: false,
        error: message,
        details: error?.message,
        stack: this.options.verbose ? error?.stack : undefined,
      })
      return
    }

    const formatted = `${this.red('✗')} I apologize, Sir. ${message}`
    console.error(formatted)

    if (error && this.options.verbose) {
      console.error(this.dim(error.stack || error.message))
    }
  }

  /**
   * Print warning message
   */
  warning(message: string): void {
    if (this.options.quiet) return

    if (this.options.json) {
      this.printJson({ warning: message })
      return
    }

    console.log(`${this.yellow('⚠')} Sir, ${message}`)
  }

  /**
   * Print info message
   */
  info(message: string, addressSir: boolean = true): void {
    if (this.options.quiet) return

    if (this.options.json) {
      this.printJson({ info: message })
      return
    }

    const formatted = addressSir ? `${message}, Sir.` : message
    console.log(formatted)
  }

  /**
   * Print progress message
   */
  progress(message: string): void {
    if (this.options.quiet) return
    console.log(`${this.dim('...')} ${message}`)
  }

  /**
   * Print list of items
   */
  list(items: string[], prefix?: string): void {
    if (this.options.quiet) return

    if (this.options.json) {
      this.printJson({ items, prefix })
      return
    }

    if (prefix) {
      console.log(prefix)
    }

    items.forEach((item) => {
      console.log(`  ${this.cyan('•')} ${item}`)
    })
  }

  /**
   * Print table
   */
  table(headers: string[], rows: string[][]): void {
    if (this.options.quiet) return

    if (this.options.json) {
      this.printJson({
        headers,
        rows,
      })
      return
    }

    // Calculate column widths
    const colWidths = headers.map((h) => h.length)
    rows.forEach((row) => {
      row.forEach((cell, i) => {
        colWidths[i] = Math.max(colWidths[i], cell.length)
      })
    })

    // Print header
    const headerLine = headers.map((h, i) => h.padEnd(colWidths[i])).join(' | ')
    console.log(this.bold(headerLine))

    // Print separator
    const separator = colWidths.map((w) => '-'.repeat(w)).join('-+-')
    console.log(separator)

    // Print rows
    rows.forEach((row) => {
      const rowLine = row.map((cell, i) => cell.padEnd(colWidths[i])).join(' | ')
      console.log(rowLine)
    })
  }

  /**
   * Print JSON output
   */
  printJson(data: any): void {
    console.log(JSON.stringify(data, null, this.options.verbose ? 2 : 0))
  }

  /**
   * Print raw data
   */
  raw(data: string): void {
    console.log(data)
  }

  /**
   * Color helpers
   */
  private green(text: string): string {
    return this.colorize(text, '\x1b[32m')
  }

  private red(text: string): string {
    return this.colorize(text, '\x1b[31m')
  }

  private yellow(text: string): string {
    return this.colorize(text, '\x1b[33m')
  }

  private cyan(text: string): string {
    return this.colorize(text, '\x1b[36m')
  }

  private dim(text: string): string {
    return this.colorize(text, '\x1b[2m')
  }

  private bold(text: string): string {
    return this.colorize(text, '\x1b[1m')
  }

  private colorize(text: string, colorCode: string): string {
    if (!this.options.color) {
      return text
    }
    return `${colorCode}${text}\x1b[0m`
  }
}

/**
 * Get output formatter from CLI flags
 */
export function getFormatter(flags: Record<string, any> = {}): OutputFormatter {
  return new OutputFormatter({
    quiet: flags.quiet || false,
    json: flags.json || false,
    verbose: flags.verbose || false,
    color: !flags.noColor && process.stdout.isTTY,
  })
}

/**
 * Convenience functions
 */
const defaultFormatter = new OutputFormatter()

export function success(message: string, detail?: string): void {
  defaultFormatter.success(message, detail)
}

export function error(message: string, err?: Error): void {
  defaultFormatter.error(message, err)
}

export function warning(message: string): void {
  defaultFormatter.warning(message)
}

export function info(message: string, addressSir: boolean = true): void {
  defaultFormatter.info(message, addressSir)
}

export function progress(message: string): void {
  defaultFormatter.progress(message)
}
