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
    const data = result.data as { overall_passed: boolean; results: Array<{ tool: string; passed: boolean; duration_seconds: number; error?: string; output?: string }>; passed_checks: number; total_checks: number; duration_seconds: number } | undefined

    if (options.json) {
      console.log(JSON.stringify(result.data, null, 2))
      if (!data?.overall_passed) {
        process.exit(1)
      }
      return
    }

    if (!data) {
      console.log('\n❌ Invalid validation response\n')
      return
    }

    // Display results
    if (data.overall_passed) {
      console.log(`✅ ${result.message}\n`)
    } else {
      console.log(`❌ ${result.message}\n`)
    }

    // Show individual check results
    console.log('Check Results:')
    for (const check of data.results) {
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
      `\nTotal: ${data.passed_checks}/${data.total_checks} passed in ${data.duration_seconds.toFixed(1)}s\n`,
    )

    if (!data.overall_passed) {
      const failedChecks = data.results
        .filter((check) => !check.passed)
        .map((check) => check.tool)
        .join(', ')
      throw new ValidationError(
        `Validation checks failed: ${failedChecks}`,
        'validation',
        data.results.filter((check) => !check.passed)
      )
    }
  } catch (error: unknown) {
    if (options.json) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.log(
        JSON.stringify({
          success: false,
          error: errorMessage,
        }),
      )
      process.exit(1)
    }
    // Re-throw validation errors as-is
    if (error instanceof ValidationError) {
      throw error
    }
    // Re-throw as MCPConnectionError or InternalError based on error type
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('MCP') || errorMessage.includes('connection')) {
      throw new MCPConnectionError(
        'Failed to run validation checks',
        'unknown',
        error instanceof Error ? error : undefined
      )
    }
    throw new InternalError(
      `Validation failed: ${errorMessage}`,
      undefined,
      error instanceof Error ? error : undefined
    )
  }
}
