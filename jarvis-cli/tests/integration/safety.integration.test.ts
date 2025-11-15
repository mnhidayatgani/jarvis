/**
 * Integration tests for safety system (checkpoint + rollback)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { execSync } from 'child_process'
import { mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

describe('Safety System Integration', () => {
  let testDir: string

  beforeEach(() => {
    // Create temporary test directory
    testDir = mkdtempSync(join(tmpdir(), 'jarvis-safety-test-'))

    // Initialize git repository
    execSync('git init', { cwd: testDir })
    execSync('git config user.email "test@example.com"', { cwd: testDir })
    execSync('git config user.name "Test User"', { cwd: testDir })

    // Create initial commit
    writeFileSync(join(testDir, 'test.txt'), 'initial content')
    execSync('git add .', { cwd: testDir })
    execSync('git commit -m "Initial commit"', { cwd: testDir })
  })

  afterEach(() => {
    // Clean up test directory
    try {
      rmSync(testDir, { recursive: true, force: true })
    } catch (error) {
      // Ignore cleanup errors
    }
  })

  describe('Checkpoint Creation', () => {
    it('should create checkpoint with git stash', () => {
      // Make changes
      writeFileSync(join(testDir, 'test.txt'), 'modified content')
      writeFileSync(join(testDir, 'new.txt'), 'new file')

      // Verify files changed
      const statusBefore = execSync('git status --porcelain', {
        cwd: testDir,
        encoding: 'utf-8',
      })
      expect(statusBefore).toContain('M test.txt')

      // Create stash (simulating checkpoint)
      execSync('git stash push -u -m "JARVIS checkpoint: test"', { cwd: testDir })

      // Verify working directory is clean
      const statusAfter = execSync('git status --porcelain', {
        cwd: testDir,
        encoding: 'utf-8',
      })
      expect(statusAfter.trim()).toBe('')

      // Verify stash exists
      const stashList = execSync('git stash list', {
        cwd: testDir,
        encoding: 'utf-8',
      })
      expect(stashList).toContain('JARVIS checkpoint: test')
    })

    it('should handle no changes gracefully', () => {
      // Try to stash with no changes
      try {
        execSync('git stash push -m "test"', {
          cwd: testDir,
          encoding: 'utf-8',
        })
      } catch (error: any) {
        // Git exits with code 1 when there's nothing to stash
        expect(error.message).toContain('No local changes to save')
      }
    })

    it('should capture untracked files with -u flag', () => {
      // Create untracked file
      writeFileSync(join(testDir, 'untracked.txt'), 'untracked content')

      // Stash with -u flag
      execSync('git stash push -u -m "with untracked"', { cwd: testDir })

      // Verify untracked file is gone
      expect(existsSync(join(testDir, 'untracked.txt'))).toBe(false)

      // Restore and verify
      execSync('git stash pop', { cwd: testDir })
      expect(existsSync(join(testDir, 'untracked.txt'))).toBe(true)
    })
  })

  describe('Checkpoint Rollback', () => {
    it('should restore files with git stash pop', () => {
      const originalContent = 'original content'
      const modifiedContent = 'modified content'

      // Modify file
      writeFileSync(join(testDir, 'test.txt'), modifiedContent)

      // Create stash
      execSync('git stash push -m "checkpoint"', { cwd: testDir })

      // Verify file reverted
      const afterStash = readFileSync(join(testDir, 'test.txt'), 'utf-8')
      expect(afterStash).toBe('initial content')

      // Restore with pop
      execSync('git stash pop', { cwd: testDir })

      // Verify file restored
      const afterPop = readFileSync(join(testDir, 'test.txt'), 'utf-8')
      expect(afterPop).toBe(modifiedContent)

      // Verify stash is removed
      const stashList = execSync('git stash list', {
        cwd: testDir,
        encoding: 'utf-8',
      })
      expect(stashList.trim()).toBe('')
    })

    it('should keep stash with git stash apply', () => {
      // Modify file
      writeFileSync(join(testDir, 'test.txt'), 'modified')

      // Create stash
      execSync('git stash push -m "checkpoint"', { cwd: testDir })

      // Restore with apply (keeps stash)
      execSync('git stash apply', { cwd: testDir })

      // Verify stash still exists
      const stashList = execSync('git stash list', {
        cwd: testDir,
        encoding: 'utf-8',
      })
      expect(stashList).toContain('checkpoint')
    })

    it('should restore specific stash by reference', () => {
      // Create first checkpoint
      writeFileSync(join(testDir, 'test.txt'), 'change 1')
      execSync('git stash push -m "checkpoint 1"', { cwd: testDir })

      // Create second checkpoint
      writeFileSync(join(testDir, 'test.txt'), 'change 2')
      execSync('git stash push -m "checkpoint 2"', { cwd: testDir })

      // Restore first checkpoint (stash@{1})
      execSync('git stash apply stash@{1}', { cwd: testDir })

      const content = readFileSync(join(testDir, 'test.txt'), 'utf-8')
      expect(content).toBe('change 1')
    })
  })

  describe('Checkpoint Workflow', () => {
    it('should complete full checkpoint→modify→rollback cycle', () => {
      const step1 = 'step 1 content'
      const step2 = 'step 2 content'

      // Step 1: Make changes and checkpoint
      writeFileSync(join(testDir, 'test.txt'), step1)
      execSync('git stash push -m "before step 2"', { cwd: testDir })

      // Verify checkpoint created
      const stashList = execSync('git stash list', {
        cwd: testDir,
        encoding: 'utf-8',
      })
      expect(stashList).toContain('before step 2')

      // File should be back to original
      expect(readFileSync(join(testDir, 'test.txt'), 'utf-8')).toBe('initial content')

      // Rollback to checkpoint
      execSync('git stash pop', { cwd: testDir })

      // Verify rollback
      expect(readFileSync(join(testDir, 'test.txt'), 'utf-8')).toBe(step1)
    })

    it('should handle multiple files in checkpoint', () => {
      // Modify multiple files
      writeFileSync(join(testDir, 'file1.txt'), 'content 1')
      writeFileSync(join(testDir, 'file2.txt'), 'content 2')
      writeFileSync(join(testDir, 'file3.txt'), 'content 3')

      // Create checkpoint
      execSync('git stash push -u -m "multi-file"', { cwd: testDir })

      // Verify all files removed
      expect(existsSync(join(testDir, 'file1.txt'))).toBe(false)
      expect(existsSync(join(testDir, 'file2.txt'))).toBe(false)
      expect(existsSync(join(testDir, 'file3.txt'))).toBe(false)

      // Restore
      execSync('git stash pop', { cwd: testDir })

      // Verify all files restored
      expect(readFileSync(join(testDir, 'file1.txt'), 'utf-8')).toBe('content 1')
      expect(readFileSync(join(testDir, 'file2.txt'), 'utf-8')).toBe('content 2')
      expect(readFileSync(join(testDir, 'file3.txt'), 'utf-8')).toBe('content 3')
    })

    it('should preserve checkpoint with auto-save before rollback', () => {
      // Create checkpoint
      writeFileSync(join(testDir, 'test.txt'), 'checkpoint 1')
      execSync('git stash push -m "checkpoint 1"', { cwd: testDir })

      // Make new changes (simulate work after checkpoint)
      writeFileSync(join(testDir, 'test.txt'), 'new work')

      // Auto-save before rollback
      execSync('git stash push -m "auto-save before rollback"', { cwd: testDir })

      // Now we have 2 stashes
      const stashList = execSync('git stash list', {
        cwd: testDir,
        encoding: 'utf-8',
      })
      const stashCount = stashList.trim().split('\n').length
      expect(stashCount).toBe(2)

      // Restore original checkpoint
      execSync('git stash apply stash@{1}', { cwd: testDir })

      expect(readFileSync(join(testDir, 'test.txt'), 'utf-8')).toBe('checkpoint 1')
    })
  })

  describe('Error Handling', () => {
    it('should detect when not in a git repository', () => {
      const nonGitDir = mkdtempSync(join(tmpdir(), 'non-git-'))

      try {
        execSync('git stash list', { cwd: nonGitDir, encoding: 'utf-8' })
        expect.fail('Should have thrown error')
      } catch (error: any) {
        expect(error.message).toContain('fatal')
      } finally {
        rmSync(nonGitDir, { recursive: true, force: true })
      }
    })

    it('should handle empty stash list', () => {
      const stashList = execSync('git stash list', {
        cwd: testDir,
        encoding: 'utf-8',
      })
      expect(stashList.trim()).toBe('')
    })

    it('should fail gracefully when popping empty stash', () => {
      try {
        execSync('git stash pop', { cwd: testDir, encoding: 'utf-8' })
        expect.fail('Should have thrown error')
      } catch (error: any) {
        expect(error.message).toContain('No stash entries found')
      }
    })
  })
})
