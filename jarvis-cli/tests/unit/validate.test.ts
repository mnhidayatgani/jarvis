/**
 * Unit tests for validate command
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { handleValidate } from '../../src/commands/validate'
import * as mcpClient from '../../src/api/mcp-client'

vi.mock('../../src/api/mcp-client')

describe('Validate Command', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(process, 'exit').mockImplementation((code) => {
      throw new Error(`Process.exit called with ${code}`)
    })
  })

  describe('Successful Validation', () => {
    it('should run validation and pass', async () => {
      const mockClient = {
        callTool: vi.fn().mockResolvedValue({
          success: true,
          message: 'All validation checks passed',
          data: {
            overall_passed: true,
            total_checks: 3,
            passed_checks: 3,
            failed_checks: 0,
            duration_seconds: 2.5,
            results: [
              {
                tool: 'ruff',
                passed: true,
                output: 'All checks passed',
                error: null,
                duration_seconds: 0.5,
              },
              {
                tool: 'pytest',
                passed: true,
                output: '10 passed',
                error: null,
                duration_seconds: 1.5,
              },
              {
                tool: 'mypy',
                passed: true,
                output: 'Success',
                error: null,
                duration_seconds: 0.5,
              },
            ],
          },
        }),
      }

      vi.mocked(mcpClient.getDefaultClient).mockReturnValue(mockClient as any)

      await handleValidate({})

      expect(mockClient.callTool).toHaveBeenCalledWith('validate_changes', {})
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('3/3 passed'))
    })

    it('should display verbose output when requested', async () => {
      const mockClient = {
        callTool: vi.fn().mockResolvedValue({
          success: true,
          message: 'Validation passed',
          data: {
            overall_passed: true,
            total_checks: 1,
            passed_checks: 1,
            failed_checks: 0,
            duration_seconds: 1.0,
            results: [
              {
                tool: 'ruff',
                passed: true,
                output: 'Detailed output here',
                error: null,
                duration_seconds: 1.0,
              },
            ],
          },
        }),
      }

      vi.mocked(mcpClient.getDefaultClient).mockReturnValue(mockClient as any)

      await handleValidate({ verbose: true })

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Output:'))
    })

    it('should output JSON when requested', async () => {
      const mockData = {
        overall_passed: true,
        total_checks: 2,
        passed_checks: 2,
        failed_checks: 0,
        results: [],
      }

      const mockClient = {
        callTool: vi.fn().mockResolvedValue({
          success: true,
          data: mockData,
        }),
      }

      vi.mocked(mcpClient.getDefaultClient).mockReturnValue(mockClient as any)

      await handleValidate({ json: true })

      const logCall = vi.mocked(console.log).mock.calls[0][0]
      expect(logCall).toContain('overall_passed')
      expect(logCall).toContain('true')
    })
  })

  describe('Failed Validation', () => {
    it('should handle validation failures', async () => {
      const mockClient = {
        callTool: vi.fn().mockResolvedValue({
          success: true,
          message: 'Validation failed',
          data: {
            overall_passed: false,
            total_checks: 3,
            passed_checks: 2,
            failed_checks: 1,
            duration_seconds: 2.0,
            results: [
              {
                tool: 'ruff',
                passed: true,
                output: 'OK',
                error: null,
                duration_seconds: 0.5,
              },
              {
                tool: 'pytest',
                passed: false,
                output: '',
                error: '2 tests failed',
                duration_seconds: 1.0,
              },
              {
                tool: 'mypy',
                passed: true,
                output: 'OK',
                error: null,
                duration_seconds: 0.5,
              },
            ],
          },
        }),
      }

      vi.mocked(mcpClient.getDefaultClient).mockReturnValue(mockClient as any)

      await expect(handleValidate({})).rejects.toThrow('Process.exit called with 1')

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('2/3 passed'))
    })

    it('should show error details in verbose mode', async () => {
      const mockClient = {
        callTool: vi.fn().mockResolvedValue({
          success: true,
          message: 'Failed',
          data: {
            overall_passed: false,
            total_checks: 1,
            passed_checks: 0,
            failed_checks: 1,
            duration_seconds: 1.0,
            results: [
              {
                tool: 'eslint',
                passed: false,
                output: '',
                error: 'Unexpected token',
                duration_seconds: 1.0,
              },
            ],
          },
        }),
      }

      vi.mocked(mcpClient.getDefaultClient).mockReturnValue(mockClient as any)

      await expect(handleValidate({ verbose: true })).rejects.toThrow()

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Error:'))
    })

    it('should exit with code 1 on validation failure', async () => {
      const mockClient = {
        callTool: vi.fn().mockResolvedValue({
          success: true,
          data: {
            overall_passed: false,
            total_checks: 1,
            passed_checks: 0,
            failed_checks: 1,
            results: [],
          },
        }),
      }

      vi.mocked(mcpClient.getDefaultClient).mockReturnValue(mockClient as any)

      await expect(handleValidate({})).rejects.toThrow('Process.exit called with 1')
    })
  })

  describe('Error Handling', () => {
    it('should handle validation errors', async () => {
      const mockClient = {
        callTool: vi.fn().mockRejectedValue(new Error('No validation tools found')),
      }

      vi.mocked(mcpClient.getDefaultClient).mockReturnValue(mockClient as any)

      await expect(handleValidate({})).rejects.toThrow()

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Validation failed'),
      )
    })

    it('should output JSON error on failure', async () => {
      const mockClient = {
        callTool: vi.fn().mockRejectedValue(new Error('Test error')),
      }

      vi.mocked(mcpClient.getDefaultClient).mockReturnValue(mockClient as any)

      await expect(handleValidate({ json: true })).rejects.toThrow()

      const logCall = vi.mocked(console.log).mock.calls[0][0]
      expect(logCall).toContain('success')
      expect(logCall).toContain('false')
    })
  })

  describe('Check Results Display', () => {
    it('should show all check results', async () => {
      const mockClient = {
        callTool: vi.fn().mockResolvedValue({
          success: true,
          message: 'Mixed results',
          data: {
            overall_passed: false,
            total_checks: 4,
            passed_checks: 3,
            failed_checks: 1,
            duration_seconds: 5.0,
            results: [
              { tool: 'ruff', passed: true, duration_seconds: 1.0 },
              { tool: 'pytest', passed: true, duration_seconds: 2.0 },
              { tool: 'mypy', passed: false, duration_seconds: 1.0, error: 'Type error' },
              { tool: 'eslint', passed: true, duration_seconds: 1.0 },
            ],
          },
        }),
      }

      vi.mocked(mcpClient.getDefaultClient).mockReturnValue(mockClient as any)

      await expect(handleValidate({})).rejects.toThrow()

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('ruff'))
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('pytest'))
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('mypy'))
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('eslint'))
    })
  })
})
