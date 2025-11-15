/**
 * Unit tests for doctor command
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { handleDoctorCommand, parseDoctorArgs } from '../../src/commands/doctor'
import { existsSync } from 'fs'

// Mock filesystem
vi.mock('fs', () => ({
  existsSync: vi.fn(),
  statSync: vi.fn(() => ({ size: 2500000 })),
}))

// Mock path
vi.mock('path', async () => {
  const actual = await vi.importActual<typeof import('path')>('path')
  return {
    ...actual,
    resolve: (...args: string[]) => args.join('/'),
  }
})

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

describe('Doctor Command', () => {
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

  describe('handleDoctorCommand', () => {
    it('should run health checks when JARVIS initialized', async () => {
      vi.mocked(existsSync).mockReturnValue(true)

      mockCallTool.mockResolvedValue({
        success: true,
        data: {
          overall: 'healthy',
          passed: 6,
          failed: 0,
          warnings: 0,
          checks: {
            python_version: { status: 'pass', message: 'Python 3.11.0' },
            dependencies: { status: 'pass', message: 'All dependencies installed' },
            databases: { status: 'pass', message: 'All databases accessible' },
          },
        },
      })

      try {
        await handleDoctorCommand({})
      } catch (error) {
        // Expected process.exit(0)
      }

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('System Diagnostics'),
      )
    })

    it('should exit if JARVIS not initialized', async () => {
      vi.mocked(existsSync).mockReturnValue(false)

      try {
        await handleDoctorCommand({})
        expect(true).toBe(false)
      } catch (error) {
        expect((error as Error).message).toBe('process.exit called')
      }
    })

    it('should detect failing health checks', async () => {
      vi.mocked(existsSync).mockReturnValue(true)

      mockCallTool.mockResolvedValue({
        success: true,
        data: {
          overall: 'issues_found',
          passed: 3,
          failed: 2,
          warnings: 1,
          checks: {
            python_version: { status: 'pass' },
            dependencies: { status: 'fail', message: '2 dependencies missing' },
            databases: { status: 'fail', message: 'Database error' },
          },
        },
      })

      try {
        await handleDoctorCommand({})
        expect(true).toBe(false)
      } catch (error) {
        expect((error as Error).message).toBe('process.exit called')
      }
    })

    it('should support JSON output', async () => {
      vi.mocked(existsSync).mockReturnValue(true)

      const healthData = {
        overall: 'healthy',
        passed: 6,
        failed: 0,
        warnings: 0,
        checks: {},
      }

      mockCallTool.mockResolvedValue({
        success: true,
        data: healthData,
      })

      await handleDoctorCommand({ json: true })

      const jsonCalls = consoleLogSpy.mock.calls.find((call: any[]) =>
        call[0]?.includes('"overall"'),
      )
      expect(jsonCalls).toBeDefined()
    })

    it('should handle warnings without failing', async () => {
      vi.mocked(existsSync).mockReturnValue(true)

      mockCallTool.mockResolvedValue({
        success: true,
        data: {
          overall: 'issues_found',
          passed: 4,
          failed: 0,
          warnings: 2,
          checks: {
            git: { status: 'warning', message: 'Not a git repository' },
          },
        },
      })

      try {
        await handleDoctorCommand({})
      } catch (error) {
        // Should exit with 0 for warnings only
      }

      const output = consoleLogSpy.mock.calls.map((call) => call[0]).join('\n')
      expect(output).toContain('warnings')
    })

    it('should fallback to basic checks if MCP unavailable', async () => {
      vi.mocked(existsSync).mockReturnValue(true)

      mockCallTool.mockRejectedValue(new Error('MCP unavailable'))

      try {
        await handleDoctorCommand({})
      } catch (error) {
        // May exit based on basic checks
      }

      // Should still run basic checks
      expect(consoleLogSpy).toHaveBeenCalled()
    })

    it('should display verbose details', async () => {
      vi.mocked(existsSync).mockReturnValue(true)

      mockCallTool.mockResolvedValue({
        success: true,
        data: {
          overall: 'healthy',
          passed: 6,
          failed: 0,
          warnings: 0,
          checks: {
            python_version: {
              status: 'pass',
              message: 'Python 3.11.0',
              details: { version: '3.11.0', requirement: '3.9+' },
            },
          },
        },
      })

      try {
        await handleDoctorCommand({ verbose: true })
      } catch (error) {
        // Expected exit
      }

      // Verbose mode should display more info
      expect(consoleLogSpy).toHaveBeenCalled()
    })

    it('should respect quiet mode', async () => {
      vi.mocked(existsSync).mockReturnValue(true)

      mockCallTool.mockResolvedValue({
        success: true,
        data: {
          overall: 'healthy',
          passed: 6,
          failed: 0,
          warnings: 0,
          checks: {},
        },
      })

      try {
        await handleDoctorCommand({ quiet: true })
      } catch (error) {
        // Expected exit
      }

      // In quiet mode, progress message should not be shown
      expect(consoleLogSpy).toHaveBeenCalled()
    })
  })

  describe('parseDoctorArgs', () => {
    it('should parse --verbose flag', () => {
      const options = parseDoctorArgs(['--verbose'])

      expect(options.verbose).toBe(true)
    })

    it('should parse -v flag', () => {
      const options = parseDoctorArgs(['-v'])

      expect(options.verbose).toBe(true)
    })

    it('should parse --json flag', () => {
      const options = parseDoctorArgs(['--json'])

      expect(options.json).toBe(true)
    })

    it('should parse --quiet flag', () => {
      const options = parseDoctorArgs(['--quiet'])

      expect(options.quiet).toBe(true)
    })

    it('should parse -q flag', () => {
      const options = parseDoctorArgs(['-q'])

      expect(options.quiet).toBe(true)
    })

    it('should parse multiple flags', () => {
      const options = parseDoctorArgs(['--verbose', '--json', '--quiet'])

      expect(options.verbose).toBe(true)
      expect(options.json).toBe(true)
      expect(options.quiet).toBe(true)
    })

    it('should return empty options for no args', () => {
      const options = parseDoctorArgs([])

      expect(options).toEqual({})
    })
  })
})
