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

      if (options.json) {
        console.log(JSON.stringify(result.data, null, 2))
        return
      }

      if (!result.data.checkpoints || result.data.checkpoints.length === 0) {
        console.log('\n📦 No checkpoints found, Sir.\n')
        return
      }

      console.log('\n📦 Available Checkpoints:\n')
      for (const checkpoint of result.data.checkpoints) {
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

      if (options.json) {
        console.log(JSON.stringify(result.data, null, 2))
        return
      }

      console.log(`\n🔍 Checkpoint Preview: ${result.data.checkpoint_id}\n`)
      console.log('Files that would be restored:')
      for (const file of result.data.files_changed) {
        console.log(`  - ${file}`)
      }
      console.log('\nStatistics:')
      console.log(result.data.stats)

      return
    }

    // Create checkpoint
    if (!reason) {
      throw new MissingArgumentError('reason')
    }

    const result = await mcpClient.callTool('create_checkpoint', {
      reason,
    })

    if (options.json) {
      console.log(JSON.stringify(result.data, null, 2))
      return
    }

    if (!result.data.has_changes) {
      console.log('\n💾 No changes to checkpoint, Sir.')
      console.log('   Working directory is clean.\n')
      return
    }

    console.log(`\n✅ ${result.message}`)
    console.log(`   Checkpoint ID: ${result.data.checkpoint_id}`)
    console.log(`   Files saved: ${result.data.files_affected.length}`)

    if (result.data.files_affected.length > 0) {
      console.log('\n   Protected files:')
      const filesToShow = result.data.files_affected.slice(0, 5)
      for (const file of filesToShow) {
        console.log(`     - ${file}`)
      }
      if (result.data.files_affected.length > 5) {
        console.log(
          `     ... and ${result.data.files_affected.length - 5} more`,
        )
      }
    }

    // Run validation if requested
    if (options.validate) {
      console.log('\n🔍 Running validation checks...\n')

      try {
        const validationResult = await mcpClient.callTool('validate_changes', {})

        if (validationResult.data.overall_passed) {
          console.log(`✅ ${validationResult.message}`)
          console.log('\n   Use `jarvis rollback` to restore this checkpoint.\n')
        } else {
          console.log(`❌ ${validationResult.message}`)
          console.log('\n   Failed checks:')
          for (const check of validationResult.data.results) {
            if (!check.passed) {
              console.log(`     - ${check.tool}: ${check.error || 'Failed'}`)
            }
          }
          console.log('\n   Checkpoint preserved. Use `jarvis rollback` to restore.\n')
        }
      } catch (validationError: any) {
        console.log(`⚠️  Validation skipped: ${validationError.message}`)
        console.log('\n   Use `jarvis rollback` to restore this checkpoint.\n')
      }
    } else {
      console.log('\n   Use `jarvis rollback` to restore this checkpoint.\n')
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
    // Re-throw as MCPConnectionError or InternalError based on error type
    if (error.message?.includes('MCP') || error.message?.includes('connection')) {
      throw new MCPConnectionError(
        'Failed to create checkpoint',
        'unknown',
        error
      )
    }
    throw new InternalError(
      `Checkpoint creation failed: ${error.message}`,
      undefined,
      error
    )
  }
}
