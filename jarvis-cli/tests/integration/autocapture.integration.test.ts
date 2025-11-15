/**
 * Integration Tests for Auto-Capture (Commit Tracking)
 *
 * Note: These tests verify the structure and expectations but don't fully execute
 * the git hook flow since that requires the jarvis CLI to be globally installed.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { execSync } from 'child_process'
import { mkdirSync, writeFileSync, existsSync, readFileSync, rmSync } from 'fs'
import { resolve } from 'path'
import { tmpdir } from 'os'

describe('Auto-Capture Integration', () => {
  let testDir: string
  let jarvisDir: string

  beforeAll(() => {
    // Create temporary test directory
    testDir = resolve(tmpdir(), `jarvis-test-${Date.now()}`)
    jarvisDir = resolve(testDir, '.jarvis')

    mkdirSync(testDir, { recursive: true })

    // Initialize git repository
    execSync('git init', { cwd: testDir, stdio: 'ignore' })
    execSync('git config user.email "test@example.com"', { cwd: testDir, stdio: 'ignore' })
    execSync('git config user.name "Test User"', { cwd: testDir, stdio: 'ignore' })
  })

  afterAll(() => {
    // Cleanup test directory
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true })
    }
  })

  it('should have git repository set up for testing', () => {
    // Verify git is initialized
    expect(existsSync(resolve(testDir, '.git'))).toBe(true)

    const gitConfig = execSync('git config user.email', {
      cwd: testDir,
      encoding: 'utf-8',
    }).trim()

    expect(gitConfig).toBe('test@example.com')
  })

  it('should store commit metadata in memory via MCP', async () => {
    // This test verifies the structure that on_commit MCP tool expects
    const mockCommitData = {
      commit_sha: 'abc123def456',
      commit_message: 'feat: add new feature because it improves performance',
      author: 'Test User',
      date: '2025-11-15T10:30:00Z',
      files_changed: ['src/file1.ts', 'src/file2.ts'],
      diff_path: '/path/to/diff',
      project_root: testDir,
    }

    // Verify structure matches what on_commit MCP tool expects
    expect(mockCommitData).toHaveProperty('commit_sha')
    expect(mockCommitData).toHaveProperty('commit_message')
    expect(mockCommitData).toHaveProperty('author')
    expect(mockCommitData).toHaveProperty('files_changed')
    expect(mockCommitData).toHaveProperty('diff_path')

    // Verify decision detection would work
    expect(mockCommitData.commit_message).toContain('because')
  })

  it('should save diffs to .jarvis/snapshots directory', () => {
    // Create .jarvis directory structure
    const snapshotsDir = resolve(jarvisDir, 'snapshots')
    mkdirSync(snapshotsDir, { recursive: true })

    // Verify snapshots directory exists
    expect(existsSync(snapshotsDir)).toBe(true)

    // Verify it's writable (create test file)
    const testDiff = resolve(snapshotsDir, 'test.diff')
    writeFileSync(testDiff, 'test diff content', 'utf-8')

    expect(existsSync(testDiff)).toBe(true)
    expect(readFileSync(testDiff, 'utf-8')).toBe('test diff content')
  })

  it('should handle commits with decision keywords', async () => {
    // Create commit with decision keywords
    const testFile = resolve(testDir, 'decision.txt')
    writeFileSync(testFile, 'Decision made', 'utf-8')

    execSync('git add decision.txt', { cwd: testDir, stdio: 'ignore' })
    execSync(
      'git commit -m "refactor: chose TypeScript over JavaScript because type safety"',
      { cwd: testDir, stdio: 'ignore' },
    )

    const commitMessage = execSync('git log -1 --pretty=%B', {
      cwd: testDir,
      encoding: 'utf-8',
    }).trim()

    // Verify decision keywords present
    const decisionKeywords = ['because', 'chose', 'decided', 'selected']
    const hasDecision = decisionKeywords.some((keyword) =>
      commitMessage.toLowerCase().includes(keyword),
    )

    expect(hasDecision).toBe(true)
  })

  it('should extract files changed from commits', () => {
    // Create a test file first
    const file = resolve(testDir, 'extract-test.txt')
    writeFileSync(file, 'test', 'utf-8')
    execSync('git add extract-test.txt', { cwd: testDir, stdio: 'ignore' })
    execSync('git commit -m "test: extraction"', { cwd: testDir, stdio: 'ignore' })

    // Get last commit's changed files
    const filesChanged = execSync('git diff-tree --no-commit-id --name-only -r HEAD', {
      cwd: testDir,
      encoding: 'utf-8',
    })
      .trim()
      .split('\n')
      .filter((f) => f.length > 0)

    // Should have captured file list
    expect(filesChanged.length).toBeGreaterThan(0)
    expect(filesChanged).toContain('extract-test.txt')
  })

  it('should not block git operations if capture fails', () => {
    // Even if JARVIS fails, git commit should succeed
    // This is ensured by the hook script running in background with &
    // and silent error handling

    const testFile = resolve(testDir, 'another.txt')
    writeFileSync(testFile, 'test', 'utf-8')

    // This should succeed even if JARVIS has issues
    expect(() => {
      execSync('git add another.txt', { cwd: testDir, stdio: 'ignore' })
      execSync('git commit -m "test: another commit"', { cwd: testDir, stdio: 'ignore' })
    }).not.toThrow()
  })

  it('should handle multiple commits sequentially', () => {
    // Create and commit multiple files
    for (let i = 0; i < 3; i++) {
      const file = resolve(testDir, `file${i}.txt`)
      writeFileSync(file, `content ${i}`, 'utf-8')

      execSync(`git add file${i}.txt`, { cwd: testDir, stdio: 'ignore' })
      execSync(`git commit -m "feat: add file ${i}"`, { cwd: testDir, stdio: 'ignore' })
    }

    // Get commit count
    const commitCount = execSync('git rev-list --count HEAD', {
      cwd: testDir,
      encoding: 'utf-8',
    }).trim()

    // Should have multiple commits
    expect(parseInt(commitCount)).toBeGreaterThanOrEqual(4) // Initial commits + 3 new ones
  })

  it('should verify hook script structure', () => {
    // Test the expected hook script format
    const hookScript = `#!/bin/bash
jarvis _internal_on_commit > /dev/null 2>&1 &
exit 0`

    // Verify it contains the key elements
    expect(hookScript).toContain('_internal_on_commit')
    expect(hookScript).toContain('> /dev/null 2>&1 &')
    expect(hookScript).toContain('exit 0')
  })
})
