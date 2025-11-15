/**
 * Unit tests for remember command
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { handleRememberCommand, parseRememberArgs } from '../../src/commands/remember'

// Mock MCP client
vi.mock('../../src/api/mcp-client', () => ({
  getDefaultClient: () => ({
    rememberContext: vi.fn().mockResolvedValue({
      success: true,
      data: {
        memory_id: 'mem_123456',
        type: 'decision',
        timestamp: '2025-11-15T12:00:00Z',
      },
      message: '✓ Understood, Sir. I have recorded that decision.',
    }),
  }),
}))

// Mock output formatter
vi.mock('../../src/utils/output', () => ({
  getFormatter: () => ({
    progress: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  }),
}))

describe('Remember Command', () => {
  let consoleLogSpy: any
  let processExitSpy: any

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    processExitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('process.exit called')
    }) as any)
  })

  afterEach(() => {
    consoleLogSpy.mockRestore()
    processExitSpy.mockRestore()
  })

  describe('handleRememberCommand', () => {
    it('should store content successfully', async () => {
      const args = ['chose', 'PostgreSQL', 'for', 'database']

      // Should not throw error
      await expect(handleRememberCommand(args, {})).resolves.not.toThrow()
    })

    it('should handle JSON output mode', async () => {
      const args = ['test', 'decision']

      await handleRememberCommand(args, { json: true })

      // Should output JSON
      const output = consoleLogSpy.mock.calls[0]?.[0]
      expect(typeof output === 'string' && output.includes('success')).toBe(true)
    })

    it('should exit on empty content', async () => {
      const args: string[] = []

      try {
        await handleRememberCommand(args, {})
        expect(true).toBe(false) // Should not reach here
      } catch (error) {
        expect((error as Error).message).toBe('process.exit called')
      }
    })
  })

  describe('parseRememberArgs', () => {
    it('should parse content arguments', () => {
      const args = ['chose', 'PostgreSQL']
      const { contentArgs, options } = parseRememberArgs(args)

      expect(contentArgs).toEqual(['chose', 'PostgreSQL'])
      expect(options).toEqual({})
    })

    it('should parse --type flag', () => {
      const args = ['--type', 'note', 'test', 'content']
      const { contentArgs, options } = parseRememberArgs(args)

      expect(options.type).toBe('note')
      expect(contentArgs).toEqual(['test', 'content'])
    })

    it('should parse --tags flag', () => {
      const args = ['--tags', 'database,backend', 'test']
      const { contentArgs, options } = parseRememberArgs(args)

      expect(options.tags).toEqual(['database', 'backend'])
      expect(contentArgs).toEqual(['test'])
    })

    it('should parse --verbose flag', () => {
      const args = ['--verbose', 'test']
      const { contentArgs, options } = parseRememberArgs(args)

      expect(options.verbose).toBe(true)
      expect(contentArgs).toEqual(['test'])
    })

    it('should parse --quiet flag', () => {
      const args = ['-q', 'test']
      const { contentArgs, options } = parseRememberArgs(args)

      expect(options.quiet).toBe(true)
    })

    it('should parse --json flag', () => {
      const args = ['--json', 'test']
      const { contentArgs, options } = parseRememberArgs(args)

      expect(options.json).toBe(true)
    })

    it('should parse multiple flags', () => {
      const args = ['--type', 'decision', '--verbose', '--json', 'content']
      const { contentArgs, options } = parseRememberArgs(args)

      expect(options.type).toBe('decision')
      expect(options.verbose).toBe(true)
      expect(options.json).toBe(true)
      expect(contentArgs).toEqual(['content'])
    })

    it('should parse --file flag', () => {
      const args = ['--file', '/path/to/file.ts', 'content']
      const { contentArgs, options } = parseRememberArgs(args)

      expect(options.file).toBe('/path/to/file.ts')
      expect(contentArgs).toEqual(['content'])
    })
  })
})
