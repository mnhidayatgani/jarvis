/**
 * Validate Command - Run code quality and test validation
 */

import { getDefaultClient } from '../api/mcp-client'
import { MCPConnectionError, InternalError, ValidationError } from '../core/errors'

export interface ValidateOptions {
  json?: boolean
  verbose?: boolean
}

/**
 * Handle validate command
 * Runs linters, type checkers, and tests
 */
export async function handleValidate(options: ValidateOptions): Promise<void> {
  try {
    const mcpClient = getDefaultClient()

    if (!options.json) {
      console.log('\n🔍 Running validation checks, Sir...\n')
    }

    const result = await mcpClient.callTool('validate_changes', {})

    if (options.json) {
      console.log(JSON.stringify(result.data, null, 2))
      if (!result.data.overall_passed) {
        process.exit(1)
      }
      return
    }

    // Display results
    if (result.data.overall_passed) {
      console.log(`✅ ${result.message}\n`)
    } else {
      console.log(`❌ ${result.message}\n`)
    }

    // Show individual check results
    console.log('Check Results:')
    for (const check of result.data.results) {
      const icon = check.passed ? '✅' : '❌'
      const duration = check.duration_seconds.toFixed(2)
      console.log(`  ${icon} ${check.tool} (${duration}s)`)

      if (!check.passed && options.verbose && check.error) {
        console.log(`     Error: ${check.error}`)
      }

      if (options.verbose && check.output) {
        const output = check.output.trim()
        if (output) {
          console.log(`     Output: ${output.substring(0, 200)}...`)
        }
      }
    }

    console.log(
      `\nTotal: ${result.data.passed_checks}/${result.data.total_checks} passed in ${result.data.duration_seconds.toFixed(1)}s\n`,
    )

    if (!result.data.overall_passed) {
      const failedChecks = result.data.results
        .filter((check: any) => !check.passed)
        .map((check: any) => check.tool)
        .join(', ')
      throw new ValidationError(
        `Validation checks failed: ${failedChecks}`,
        'validation',
        result.data.results.filter((check: any) => !check.passed)
      )
    }
  } catch (error: any) {
    if (options.json) {
      console.log(
        JSON.stringify({
          success: false,
          error: error.message,
        }),
      )
      process.exit(1)
    }
    // Re-throw validation errors as-is
    if (error instanceof ValidationError) {
      throw error
    }
    // Re-throw as MCPConnectionError or InternalError based on error type
    if (error.message?.includes('MCP') || error.message?.includes('connection')) {
      throw new MCPConnectionError(
        'Failed to run validation checks',
        'unknown',
        error
      )
    }
    throw new InternalError(
      `Validation failed: ${error.message}`,
      undefined,
      error
    )
  }
}
