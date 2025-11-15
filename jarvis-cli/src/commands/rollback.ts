/**
 * Rollback Command - Restore previous checkpoints
 */

import { getDefaultClient } from '../api/mcp-client'
import { MCPConnectionError, InternalError } from '../core/errors'

export interface RollbackOptions {
  keep?: boolean
  json?: boolean
}

/**
 * Handle rollback command
 * Restores a previous checkpoint state
 */
export async function handleRollback(
  checkpointId: string | null,
  options: RollbackOptions,
): Promise<void> {
  try {
    const mcpClient = getDefaultClient()

    // Call MCP tool to perform rollback
    const result = await mcpClient.callTool('rollback_to_checkpoint', {
      checkpoint_id: checkpointId,
      keep_checkpoint: options.keep || false,
    })

    if (options.json) {
      console.log(JSON.stringify(result.data, null, 2))
      return
    }

    console.log(`\n✅ ${result.message}`)
    console.log(`   Checkpoint: ${result.data.checkpoint_id}`)

    if (result.data.files_restored && result.data.files_restored.length > 0) {
      console.log(`   Files restored: ${result.data.files_restored.length}`)
      console.log('\n   Restored files:')
      const filesToShow = result.data.files_restored.slice(0, 10)
      for (const file of filesToShow) {
        console.log(`     - ${file}`)
      }
      if (result.data.files_restored.length > 10) {
        console.log(
          `     ... and ${result.data.files_restored.length - 10} more`,
        )
      }
    } else {
      console.log('   No files changed.')
    }

    if (options.keep) {
      console.log('\n   Checkpoint preserved. You can rollback again if needed.')
    } else {
      console.log('\n   Checkpoint has been removed.')
    }

    console.log()
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
    // Re-throw as MCPConnectionError or InternalError based on error type
    if (error.message?.includes('MCP') || error.message?.includes('connection')) {
      throw new MCPConnectionError(
        'Failed to rollback checkpoint. Your working directory has been preserved.',
        'unknown',
        error
      )
    }
    throw new InternalError(
      `Rollback failed: ${error.message}. Your working directory has been preserved.`,
      undefined,
      error
    )
  }
}
