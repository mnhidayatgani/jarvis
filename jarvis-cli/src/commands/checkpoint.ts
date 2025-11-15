/**
 * Checkpoint Command - Create safety checkpoints before risky changes
 */

import { getDefaultClient } from '../api/mcp-client'
import { MissingArgumentError, MCPConnectionError, InternalError } from '../core/errors'

export interface CheckpointOptions {
  list?: boolean
  preview?: string
  validate?: boolean
  json?: boolean
}

/**
 * Handle checkpoint command
 * Creates a git stash checkpoint with metadata
 */
export async function handleCheckpoint(
  reason: string | null,
  options: CheckpointOptions,
): Promise<void> {
  try {
    const mcpClient = getDefaultClient()

    // List checkpoints
    if (options.list) {
      const result = await mcpClient.callTool('list_checkpoints', {})
      const data = result.data as { checkpoints?: Array<{ checkpoint_id: string; message: string; timestamp: string }> } | undefined

      if (options.json) {
        console.log(JSON.stringify(result.data, null, 2))
        return
      }

      if (!data?.checkpoints || data.checkpoints.length === 0) {
        console.log('\n📦 No checkpoints found, Sir.\n')
        return
      }

      console.log('\n📦 Available Checkpoints:\n')
      for (const checkpoint of data.checkpoints) {
        console.log(`  ${checkpoint.checkpoint_id}`)
        console.log(`    Reason: ${checkpoint.message}`)
        console.log(`    Created: ${new Date(checkpoint.timestamp).toLocaleString()}`)
        console.log()
      }

      return
    }

    // Preview checkpoint
    if (options.preview) {
      const result = await mcpClient.callTool('preview_checkpoint', {
        checkpoint_id: options.preview,
      })
      const data = result.data as { checkpoint_id: string; files_changed: string[]; stats: unknown } | undefined

      if (options.json) {
        console.log(JSON.stringify(result.data, null, 2))
        return
      }

      if (!data) {
        console.log('\n❌ Invalid checkpoint preview response\n')
        return
      }

      console.log(`\n🔍 Checkpoint Preview: ${data.checkpoint_id}\n`)
      console.log('Files that would be restored:')
      for (const file of data.files_changed) {
        console.log(`  - ${file}`)
      }
      console.log('\nStatistics:')
      console.log(data.stats)

      return
    }

    // Create checkpoint
    if (!reason) {
      throw new MissingArgumentError('reason')
    }

    const result = await mcpClient.callTool('create_checkpoint', {
      reason,
    })
    const data = result.data as { has_changes: boolean; checkpoint_id: string; files_affected: string[] } | undefined

    if (options.json) {
      console.log(JSON.stringify(result.data, null, 2))
      return
    }

    if (!data) {
      console.log('\n❌ Invalid checkpoint response\n')
      return
    }

    if (!data.has_changes) {
      console.log('\n💾 No changes to checkpoint, Sir.')
      console.log('   Working directory is clean.\n')
      return
    }

    console.log(`\n✅ ${result.message}`)
    console.log(`   Checkpoint ID: ${data.checkpoint_id}`)
    console.log(`   Files saved: ${data.files_affected.length}`)

    if (data.files_affected.length > 0) {
      console.log('\n   Protected files:')
      const filesToShow = data.files_affected.slice(0, 5)
      for (const file of filesToShow) {
        console.log(`     - ${file}`)
      }
      if (data.files_affected.length > 5) {
        console.log(
          `     ... and ${data.files_affected.length - 5} more`,
        )
      }
    }

    // Run validation if requested
    if (options.validate) {
      console.log('\n🔍 Running validation checks...\n')

      try {
        const validationResult = await mcpClient.callTool('validate_changes', {})
        const validationData = validationResult.data as { overall_passed: boolean; results: Array<{ tool: string; status: string; output?: string }> } | undefined

        if (validationData?.overall_passed) {
          console.log("")
          console.log("✓ All validation checks passed")
        } else {
          console.log("")
          console.log("⚠ Some validation checks failed:")
          for (const check of validationData?.results || []) {
            if (check.status !== 'pass') {
              console.log(`   ${check.tool}: ${check.status}`)
              if (check.output) {
                console.log(`     ${check.output}`)
              }
            }
          }
        }
      } catch (validationError: unknown) {
        const message = validationError instanceof Error ? validationError.message : 'Unknown error';
        console.log(`⚠️  Validation skipped: ${message}`)
        console.log('\n   Use `jarvis rollback` to restore this checkpoint.\n')
      }
    } else {
      console.log('\n   Use `jarvis rollback` to restore this checkpoint.\n')
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
    // Re-throw as MCPConnectionError or InternalError based on error type
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('MCP') || errorMessage.includes('connection')) {
      throw new MCPConnectionError(
        'Failed to create checkpoint',
        'unknown',
        error instanceof Error ? error : undefined
      )
    }
    throw new InternalError(
      `Checkpoint creation failed: ${errorMessage}`,
      undefined,
      error instanceof Error ? error : undefined
    )
  }
}
