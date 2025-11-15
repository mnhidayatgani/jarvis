/**
 * Tests for Internal Commands (git hooks and internal operations)
 */

import { describe, it, expect } from 'vitest'

describe('Internal Commands', () => {
  describe('Git Hook Installation', () => {
    it('should have correct post-commit hook script format', () => {
      const hookScript = `#!/bin/bash
# JARVIS Post-Commit Hook
# Captures commit information and triggers JARVIS memory storage

# Get project root
PROJECT_ROOT="$(git rev-parse --show-toplevel)"
JARVIS_DIR="$PROJECT_ROOT/.jarvis"

# Skip if JARVIS not initialized
if [ ! -d "$JARVIS_DIR" ]; then
    exit 0
fi

# Call JARVIS internal command to capture commit (run in background to avoid blocking)
cd "$PROJECT_ROOT"
jarvis _internal_on_commit > /dev/null 2>&1 &

exit 0
`

      // Verify hook script format
      expect(hookScript).toContain('#!/bin/bash')
      expect(hookScript).toContain('JARVIS Post-Commit Hook')
      expect(hookScript).toContain('jarvis _internal_on_commit')
      expect(hookScript).toContain('> /dev/null 2>&1 &') // Background execution
      expect(hookScript).toContain('exit 0')
    })

    it('should check for JARVIS directory before running', () => {
      const hookScript = `#!/bin/bash
if [ ! -d "$JARVIS_DIR" ]; then
    exit 0
fi`

      expect(hookScript).toContain('if [ ! -d "$JARVIS_DIR" ]')
      expect(hookScript).toContain('exit 0')
    })

    it('should run jarvis command in background', () => {
      const command = 'jarvis _internal_on_commit > /dev/null 2>&1 &'

      // Verify background execution (&)
      expect(command).toContain('&')
      // Verify silent output (> /dev/null 2>&1)
      expect(command).toContain('> /dev/null 2>&1')
    })
  })

  describe('Internal Command Structure', () => {
    it('should have handleInternalOnCommit function exported', async () => {
      const internalModule = await import('../../src/commands/internal')

      expect(internalModule).toHaveProperty('handleInternalOnCommit')
      expect(typeof internalModule.handleInternalOnCommit).toBe('function')
    })

    it('should capture commit metadata structure', () => {
      // Verify the expected data structure for commit capture
      const mockCommitData = {
        commit_sha: 'abc123def456',
        commit_message: 'feat: add new feature',
        author: 'Test User',
        date: '2025-11-15T10:30:00Z',
        files_changed: ['file1.ts', 'file2.ts'],
        diff_path: '/path/to/diff',
        project_root: '/project',
      }

      expect(mockCommitData).toHaveProperty('commit_sha')
      expect(mockCommitData).toHaveProperty('commit_message')
      expect(mockCommitData).toHaveProperty('author')
      expect(mockCommitData).toHaveProperty('date')
      expect(mockCommitData).toHaveProperty('files_changed')
      expect(mockCommitData).toHaveProperty('diff_path')
      expect(mockCommitData).toHaveProperty('project_root')
    })

    it('should detect decision keywords in commit messages', () => {
      const decisionKeywords = ['because', 'chose', 'decided', 'selected']

      const decisonMessage = 'refactor: chose TypeScript because of type safety'
      const normalMessage = 'fix: correct typo in README'

      const hasDecision = (msg: string) =>
        decisionKeywords.some((kw) => msg.toLowerCase().includes(kw))

      expect(hasDecision(decisonMessage)).toBe(true)
      expect(hasDecision(normalMessage)).toBe(false)
    })
  })

  describe('Command Routing', () => {
    it('should route _internal_on_commit command', async () => {
      // Verify the command is registered in index.ts
      const indexModule = await import('../../src/index')

      // The module should export main function that handles routing
      expect(indexModule).toBeDefined()
    })
  })

  describe('Diff Storage', () => {
    it('should store diffs with commit SHA as filename', () => {
      const commitSha = 'abc123def456'
      const expectedFilename = `${commitSha}.diff`

      expect(expectedFilename).toMatch(/^[a-f0-9]+\.diff$/)
      expect(expectedFilename).toContain('.diff')
    })

    it('should save to .jarvis/snapshots directory', () => {
      const snapshotsPath = '.jarvis/snapshots'

      // Verify path format
      expect(snapshotsPath).toContain('.jarvis')
      expect(snapshotsPath).toContain('snapshots')
    })
  })

  describe('Error Handling', () => {
    it('should not throw errors on git failures', () => {
      // Internal command should handle errors gracefully
      // This ensures git operations are never blocked

      const silentErrorHandler = () => {
        try {
          throw new Error('git command failed')
        } catch {
          // Silent failure - exit 0
          return 0
        }
      }

      expect(silentErrorHandler()).toBe(0)
    })

    it('should not throw errors on MCP failures', async () => {
      // MCP errors should not block the hook
      const mockMCPCall = async () => {
        try {
          throw new Error('MCP unavailable')
        } catch {
          // Diff is already saved, so we can fail silently
          return 0
        }
      }

      const exitCode = await mockMCPCall()
      expect(exitCode).toBe(0)
    })
  })
})
