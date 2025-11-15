/**
 * Internal Commands - Hidden commands for JARVIS system operations
 * These commands are not meant to be called directly by users
 */

import { execSync } from 'child_process'
import { resolve } from 'path'
import { writeFileSync, existsSync, mkdirSync } from 'fs'
import { getDefaultClient } from '../api/mcp-client'

/**
 * Handle internal on_commit command
 * Called by git post-commit hook to capture commit information
 */
export async function handleInternalOnCommit(): Promise<void> {
  try {
    // Get project root
    const projectRoot = execSync('git rev-parse --show-toplevel', {
      encoding: 'utf-8',
    }).trim()

    // Get commit information
    const commitSha = execSync('git rev-parse HEAD', {
      cwd: projectRoot,
      encoding: 'utf-8',
    }).trim()

    const commitMessage = execSync('git log -1 --pretty=%B', {
      cwd: projectRoot,
      encoding: 'utf-8',
    }).trim()

    const commitAuthor = execSync('git log -1 --pretty=%an', {
      cwd: projectRoot,
      encoding: 'utf-8',
    }).trim()

    const commitDate = execSync('git log -1 --pretty=%aI', {
      cwd: projectRoot,
      encoding: 'utf-8',
    }).trim()

    // Get files changed
    const filesChanged = execSync('git diff-tree --no-commit-id --name-only -r HEAD', {
      cwd: projectRoot,
      encoding: 'utf-8',
    })
      .trim()
      .split('\n')
      .filter((f) => f.length > 0)

    // Get diff
    const diff = execSync('git show HEAD', {
      cwd: projectRoot,
      encoding: 'utf-8',
    })

    // Save diff to snapshots directory
    const jarvisDir = resolve(projectRoot, '.jarvis')
    const snapshotsDir = resolve(jarvisDir, 'snapshots')

    // Ensure snapshots directory exists
    if (!existsSync(snapshotsDir)) {
      mkdirSync(snapshotsDir, { recursive: true })
    }

    // Save diff with commit sha as filename
    const diffPath = resolve(snapshotsDir, `${commitSha}.diff`)
    writeFileSync(diffPath, diff, 'utf-8')

    // Call MCP tool to store commit event
    try {
      const mcpClient = getDefaultClient()
      await mcpClient.callTool('on_commit', {
        commit_sha: commitSha,
        commit_message: commitMessage,
        author: commitAuthor,
        date: commitDate,
        files_changed: filesChanged,
        diff_path: diffPath,
        project_root: projectRoot,
      })
    } catch (mcpError) {
      // MCP call failed - this is non-fatal, commit still succeeded
      // We've already saved the diff, so data is preserved
      // Silent failure to avoid blocking git operations
    }

    // Exit successfully (no output to avoid cluttering git)
    process.exit(0)
  } catch (error) {
    // Silent failure - don't block git operations
    // Any error here is logged but doesn't affect the commit
    process.exit(0)
  }
}
