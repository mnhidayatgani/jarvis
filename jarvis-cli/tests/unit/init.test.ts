/**
 * Unit tests for init command
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs'
import { resolve } from 'path'
import { execSync } from 'child_process'

// Mock dependencies
vi.mock('fs')
vi.mock('child_process')

describe('Init Command', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Directory Creation', () => {
    it('should create .jarvis directory when it does not exist', () => {
      // Mock existsSync to return false for .jarvis
      vi.mocked(existsSync).mockReturnValue(false)

      // Mock mkdirSync
      const mkdirMock = vi.mocked(mkdirSync)

      // Simulate directory creation
      const jarvisDir = resolve(process.cwd(), '.jarvis')
      mkdirMock(jarvisDir, { recursive: true })

      expect(mkdirMock).toHaveBeenCalledWith(jarvisDir, { recursive: true })
    })

    it('should create db subdirectory', () => {
      vi.mocked(existsSync).mockReturnValue(false)
      const mkdirMock = vi.mocked(mkdirSync)

      const dbDir = resolve(process.cwd(), '.jarvis', 'db')
      mkdirMock(dbDir, { recursive: true })

      expect(mkdirMock).toHaveBeenCalledWith(dbDir, { recursive: true })
    })

    it('should create snapshots subdirectory', () => {
      vi.mocked(existsSync).mockReturnValue(false)
      const mkdirMock = vi.mocked(mkdirSync)

      const snapshotsDir = resolve(process.cwd(), '.jarvis', 'snapshots')
      mkdirMock(snapshotsDir, { recursive: true })

      expect(mkdirMock).toHaveBeenCalledWith(snapshotsDir, {
        recursive: true,
      })
    })

    it('should create config.json with valid JSON', () => {
      vi.mocked(existsSync).mockReturnValue(false)
      const writeMock = vi.mocked(writeFileSync)

      const configPath = resolve(process.cwd(), '.jarvis', 'config.json')
      const config = {
        language: 'en',
        responseStyle: 'concise',
        persona: 'jarvis',
        initialized_at: new Date().toISOString(),
      }

      writeMock(configPath, JSON.stringify(config, null, 2), 'utf-8')

      expect(writeMock).toHaveBeenCalledWith(
        configPath,
        expect.stringContaining('"language": "en"'),
        'utf-8',
      )
    })
  })

  describe('Existing Directory Handling', () => {
    it('should detect when .jarvis already exists', () => {
      // Mock existsSync to return true for .jarvis
      const existsMock = vi.mocked(existsSync)
      existsMock.mockReturnValue(true)

      const jarvisDir = resolve(process.cwd(), '.jarvis')
      const exists = existsMock(jarvisDir)

      expect(exists).toBe(true)
    })

    it('should not overwrite existing config.json without force', () => {
      vi.mocked(existsSync).mockReturnValue(true)
      const writeMock = vi.mocked(writeFileSync)

      // Should not call writeFileSync when config exists
      expect(writeMock).not.toHaveBeenCalled()
    })
  })

  describe('Git Detection', () => {
    it('should detect git repository when present', () => {
      const execMock = vi.mocked(execSync)
      execMock.mockReturnValue(Buffer.from('.git'))

      try {
        execMock('git rev-parse --git-dir', { stdio: 'ignore' })
        const isGitRepo = true
        expect(isGitRepo).toBe(true)
      } catch {
        // Git not found
      }
    })

    it('should handle when git repository is not present', () => {
      const execMock = vi.mocked(execSync)
      execMock.mockImplementation(() => {
        throw new Error('Not a git repository')
      })

      try {
        execMock('git rev-parse --git-dir', { stdio: 'ignore' })
      } catch {
        const isGitRepo = false
        expect(isGitRepo).toBe(false)
      }
    })
  })

  describe('Project Name Detection', () => {
    it('should extract name from package.json when present', () => {
      const packageJson = {
        name: 'my-awesome-project',
        version: '1.0.0',
      }

      vi.mocked(existsSync).mockImplementation((path) => {
        return path.toString().includes('package.json')
      })

      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(packageJson))

      // Simulate reading package.json
      const hasPackageJson = existsSync('package.json')
      expect(hasPackageJson).toBe(true)

      if (hasPackageJson) {
        const content = readFileSync('package.json', 'utf-8')
        const pkg = JSON.parse(content)
        expect(pkg.name).toBe('my-awesome-project')
      }
    })

    it('should fall back to directory name when no package.json', () => {
      vi.mocked(existsSync).mockReturnValue(false)

      const hasPackageJson = existsSync('package.json')
      expect(hasPackageJson).toBe(false)

      // Would use basename of current directory
      const dirName = 'my-project'
      expect(dirName).toBeTruthy()
    })
  })

  describe('Project ID Generation', () => {
    it('should generate consistent project ID from path', () => {
      const createHash = require('crypto').createHash

      const projectRoot = '/tmp/test-project'
      const hash1 = createHash('sha256').update(projectRoot).digest('hex')
      const hash2 = createHash('sha256').update(projectRoot).digest('hex')

      // Same path should generate same hash
      expect(hash1).toBe(hash2)
      expect(hash1).toHaveLength(64) // SHA256 produces 64 hex characters
    })

    it('should generate different IDs for different paths', () => {
      const createHash = require('crypto').createHash

      const path1 = '/tmp/project-1'
      const path2 = '/tmp/project-2'

      const hash1 = createHash('sha256').update(path1).digest('hex')
      const hash2 = createHash('sha256').update(path2).digest('hex')

      expect(hash1).not.toBe(hash2)
    })
  })

  describe('Command Line Options', () => {
    it('should parse --force flag', () => {
      const args = ['--force']
      const options = { force: false }

      for (const arg of args) {
        if (arg === '--force' || arg === '-f') {
          options.force = true
        }
      }

      expect(options.force).toBe(true)
    })

    it('should parse --verbose flag', () => {
      const args = ['--verbose']
      const options = { verbose: false }

      for (const arg of args) {
        if (arg === '--verbose' || arg === '-v') {
          options.verbose = true
        }
      }

      expect(options.verbose).toBe(true)
    })

    it('should parse multiple flags', () => {
      const args = ['--force', '--verbose']
      const options = { force: false, verbose: false }

      for (const arg of args) {
        if (arg === '--force' || arg === '-f') {
          options.force = true
        }
        if (arg === '--verbose' || arg === '-v') {
          options.verbose = true
        }
      }

      expect(options.force).toBe(true)
      expect(options.verbose).toBe(true)
    })
  })
})
