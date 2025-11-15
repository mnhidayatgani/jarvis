/**
 * Unit tests for recall command
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { handleRecallCommand, parseRecallArgs } from '../../src/commands/recall'

// Mock MCP client
const mockRecallContext = vi.fn()
const mockCallTool = vi.fn()

vi.mock('../../src/api/mcp-client', () => ({
  getDefaultClient: () => ({
    recallContext: mockRecallContext,
    callTool: mockCallTool,
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

describe('Recall Command', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>
  let processExitSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    processExitSpy = vi.spyOn(process, 'exit' as any).mockImplementation((() => {
      throw new Error('process.exit called')
    }) as any)

    // Reset mocks
    mockRecallContext.mockReset()
    mockCallTool.mockReset()
  })

  afterEach(() => {
    consoleLogSpy.mockRestore()
    processExitSpy.mockRestore()
  })

  describe('handleRecallCommand', () => {
    it('should search memory with query', async () => {
      mockRecallContext.mockResolvedValue({
        success: true,
        data: {
          results: [
            {
              id: '1',
              content: 'chose PostgreSQL for database',
              relevance_score: 0.95,
              timestamp: '2025-11-15T12:00:00Z',
              type: 'decision',
            },
          ],
        },
      })

      await handleRecallCommand('database', {})

      expect(mockRecallContext).toHaveBeenCalledWith({
        query: 'database',
        type_filter: undefined,
        file_filter: undefined,
        since: undefined,
        limit: 10,
      })
    })

    it('should display results in table format', async () => {
      mockRecallContext.mockResolvedValue({
        success: true,
        data: {
          results: [
            {
              id: '1',
              content: 'test memory',
              relevance_score: 0.8,
              timestamp: '2025-11-15T12:00:00Z',
            },
          ],
        },
      })

      await handleRecallCommand('test', {})

      // Should display table with results
      expect(consoleLogSpy).toHaveBeenCalled()
    })

    it('should handle no results found', async () => {
      mockRecallContext.mockResolvedValue({
        success: true,
        data: {
          results: [],
        },
      })

      await handleRecallCommand('nonexistent', {})

      // Should complete without crashing
      expect(mockRecallContext).toHaveBeenCalled()
    })

    it('should support JSON output mode', async () => {
      mockRecallContext.mockResolvedValue({
        success: true,
        data: {
          results: [{ id: '1', content: 'test' }],
        },
      })

      await handleRecallCommand('test', { json: true })

      const output = consoleLogSpy.mock.calls.find((call: any[]) =>
        call[0]?.includes('"success"'),
      )
      expect(output).toBeDefined()
    })

    it('should handle drill-down by ID', async () => {
      mockCallTool.mockResolvedValue({
        success: true,
        data: {
          id: '123',
          content: 'full memory content here',
          type: 'decision',
          timestamp: '2025-11-15T12:00:00Z',
          tags: ['database', 'backend'],
        },
      })

      await handleRecallCommand('', { id: '123' })

      expect(mockCallTool).toHaveBeenCalledWith('get_memory_by_id', {
        memory_id: '123',
        project_path: expect.any(String),
      })
    })

    it('should exit on empty query without ID', async () => {
      try {
        await handleRecallCommand('', {})
        expect(true).toBe(false) // Should not reach here
      } catch (error) {
        expect((error as Error).message).toBe('process.exit called')
      }
    })

    it('should apply type filter', async () => {
      mockRecallContext.mockResolvedValue({
        success: true,
        data: { results: [] },
      })

      await handleRecallCommand('test', { type: 'decision' })

      expect(mockRecallContext).toHaveBeenCalledWith(
        expect.objectContaining({
          type_filter: 'decision',
        }),
      )
    })

    it('should apply file filter', async () => {
      mockRecallContext.mockResolvedValue({
        success: true,
        data: { results: [] },
      })

      await handleRecallCommand('test', { file: 'src/config.ts' })

      expect(mockRecallContext).toHaveBeenCalledWith(
        expect.objectContaining({
          file_filter: 'src/config.ts',
        }),
      )
    })

    it('should apply limit option', async () => {
      mockRecallContext.mockResolvedValue({
        success: true,
        data: { results: [] },
      })

      await handleRecallCommand('test', { limit: 5 })

      expect(mockRecallContext).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 5,
        }),
      )
    })

    it('should display verbose details when requested', async () => {
      mockRecallContext.mockResolvedValue({
        success: true,
        data: {
          results: [
            {
              id: '1',
              content: 'test',
              type: 'decision',
              file_path: 'src/test.ts',
              relevance_score: 0.9,
              timestamp: '2025-11-15T12:00:00Z',
            },
          ],
        },
      })

      await handleRecallCommand('test', { verbose: true })

      // Should display with additional columns
      expect(consoleLogSpy).toHaveBeenCalled()
    })
  })

  describe('parseRecallArgs', () => {
    it('should parse query from arguments', () => {
      const args = ['database', 'decision']
      const { query, options } = parseRecallArgs(args)

      expect(query).toBe('database decision')
      expect(options).toEqual({})
    })

    it('should parse --type flag', () => {
      const args = ['--type', 'decision', 'test']
      const { options } = parseRecallArgs(args)

      expect(options.type).toBe('decision')
    })

    it('should parse --file flag', () => {
      const args = ['--file', 'src/config.ts', 'test']
      const { options } = parseRecallArgs(args)

      expect(options.file).toBe('src/config.ts')
    })

    it('should parse --since flag', () => {
      const args = ['--since', '2025-01-01', 'test']
      const { options } = parseRecallArgs(args)

      expect(options.since).toBe('2025-01-01')
    })

    it('should parse --limit flag', () => {
      const args = ['--limit', '5', 'test']
      const { options } = parseRecallArgs(args)

      expect(options.limit).toBe(5)
    })

    it('should parse --id flag', () => {
      const args = ['--id', '123']
      const { options } = parseRecallArgs(args)

      expect(options.id).toBe('123')
    })

    it('should parse --verbose flag', () => {
      const args = ['--verbose', 'test']
      const { options } = parseRecallArgs(args)

      expect(options.verbose).toBe(true)
    })

    it('should parse --quiet flag', () => {
      const args = ['-q', 'test']
      const { options } = parseRecallArgs(args)

      expect(options.quiet).toBe(true)
    })

    it('should parse --json flag', () => {
      const args = ['--json', 'test']
      const { query, options } = parseRecallArgs(args)

      expect(options.json).toBe(true)
    })

    it('should parse multiple flags', () => {
      const args = [
        '--type',
        'decision',
        '--verbose',
        '--limit',
        '10',
        'database',
        'choice',
      ]
      const { query, options } = parseRecallArgs(args)

      expect(options.type).toBe('decision')
      expect(options.verbose).toBe(true)
      expect(options.limit).toBe(10)
      expect(query).toBe('database choice')
    })

    it('should handle short flags', () => {
      const args = ['-t', 'note', '-f', 'test.ts', '-v', 'content']
      const { query, options } = parseRecallArgs(args)

      expect(options.type).toBe('note')
      expect(options.file).toBe('test.ts')
      expect(options.verbose).toBe(true)
      expect(query).toBe('content')
    })
  })
})
