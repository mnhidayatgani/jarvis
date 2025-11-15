/**
 * Unit tests for status command
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { handleStatusCommand, parseStatusArgs } from '../../src/commands/status'
import { existsSync } from 'fs'

// Mock filesystem
vi.mock('fs', () => ({
  existsSync: vi.fn(),
  statSync: vi.fn(() => ({ size: 2500000 })), // 2.5MB
}))

// Mock MCP client
const mockCallTool = vi.fn()

vi.mock('../../src/api/mcp-client', () => ({
  getDefaultClient: () => ({
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

describe('Status Command', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>
  let processExitSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    processExitSpy = vi.spyOn(process, 'exit' as any).mockImplementation(
      (() => {
        throw new Error('process.exit called')
      }) as any,
    )

    // Reset mocks
    mockCallTool.mockReset()
    vi.mocked(existsSync).mockReset()
  })

  afterEach(() => {
    consoleLogSpy.mockRestore()
    processExitSpy.mockRestore()
  })

  describe('handleStatusCommand', () => {
    it('should display status when JARVIS is initialized', async () => {
      vi.mocked(existsSync).mockReturnValue(true)

      mockCallTool.mockResolvedValue({
        success: true,
        data: {
          total_entries: 15,
          decisions: 12,
          notes: 3,
          disk_usage_mb: 3.2,
          collections: { decisions: 15 },
        },
      })

      await handleStatusCommand({})

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('JARVIS Status'),
      )
    })

    it('should exit if JARVIS not initialized', async () => {
      vi.mocked(existsSync).mockReturnValue(false)

      try {
        await handleStatusCommand({})
        expect(true).toBe(false) // Should not reach here
      } catch (error) {
        expect((error as Error).message).toBe('process.exit called')
      }
    })

    it('should support JSON output', async () => {
      vi.mocked(existsSync).mockReturnValue(true)

      mockCallTool.mockResolvedValue({
        success: true,
        data: { total_entries: 10 },
      })

      await handleStatusCommand({ json: true })

      const jsonCalls = consoleLogSpy.mock.calls.find((call: any[]) =>
        call[0]?.includes('"initialized"'),
      )
      expect(jsonCalls).toBeDefined()
    })

    it('should handle MCP server unavailable gracefully', async () => {
      vi.mocked(existsSync).mockReturnValue(true)

      mockCallTool.mockRejectedValue(new Error('MCP unavailable'))

      await handleStatusCommand({})

      // Should still display basic status
      expect(consoleLogSpy).toHaveBeenCalled()
    })

    it('should display verbose memory stats', async () => {
      vi.mocked(existsSync).mockReturnValue(true)

      mockCallTool.mockResolvedValue({
        success: true,
        data: {
          total_entries: 20,
          decisions: 15,
          notes: 5,
          last_activity: '2025-11-15T12:00:00Z',
          disk_usage_mb: 5.5,
          collections: { decisions: 20 },
        },
      })

      await handleStatusCommand({ verbose: true })

      // Should display detailed info
      const output = consoleLogSpy.mock.calls.map((call) => call[0]).join('\n')
      expect(output).toContain('Memory:')
    })

    it('should show database status', async () => {
      vi.mocked(existsSync).mockReturnValue(true)

      mockCallTool.mockResolvedValue({
        success: true,
        data: {},
      })

      await handleStatusCommand({})

      const output = consoleLogSpy.mock.calls.map((call) => call[0]).join('\n')
      expect(output).toContain('Databases:')
    })
  })

  describe('parseStatusArgs', () => {
    it('should parse --verbose flag', () => {
      const options = parseStatusArgs(['--verbose'])

      expect(options.verbose).toBe(true)
    })

    it('should parse -v flag', () => {
      const options = parseStatusArgs(['-v'])

      expect(options.verbose).toBe(true)
    })

    it('should parse --json flag', () => {
      const options = parseStatusArgs(['--json'])

      expect(options.json).toBe(true)
    })

    it('should parse multiple flags', () => {
      const options = parseStatusArgs(['--verbose', '--json'])

      expect(options.verbose).toBe(true)
      expect(options.json).toBe(true)
    })

    it('should return empty options for no args', () => {
      const options = parseStatusArgs([])

      expect(options).toEqual({})
    })
  })
})
