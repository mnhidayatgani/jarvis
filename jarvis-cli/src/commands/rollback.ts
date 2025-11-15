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
    const data = result.data as { checkpoint_id: string; files_restored?: string[] } | undefined

    if (options.json) {
      console.log(JSON.stringify(result.data, null, 2))
      return
    }

    if (!data) {
      console.log('\n❌ Invalid rollback response\n')
      return
    }

    console.log(`\n✅ ${result.message}`)
    console.log(`   Checkpoint: ${data.checkpoint_id}`)

    if (data.files_restored && data.files_restored.length > 0) {
      console.log(`   Files restored: ${data.files_restored.length}`)
      console.log('\n   Restored files:')
      const filesToShow = data.files_restored.slice(0, 10)
      for (const file of filesToShow) {
        console.log(`     - ${file}`)
      }
      if (data.files_restored.length > 10) {
        console.log(
          `     ... and ${data.files_restored.length - 10} more`,
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
    // Re-throw as MCPConnectionError or InternalError based on error type
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('MCP') || errorMessage.includes('connection')) {
      throw new MCPConnectionError(
        'Failed to rollback checkpoint. Your working directory has been preserved.',
        'unknown',
        error instanceof Error ? error : undefined
      )
    }
    throw new InternalError(
      `Rollback failed: ${errorMessage}. Your working directory has been preserved.`,
      undefined,
      error instanceof Error ? error : undefined
    )
  }
}
