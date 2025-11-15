/**
 * Unit tests for rollback command
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { handleRollback } from '../../src/commands/rollback'
import * as mcpClient from '../../src/api/mcp-client'

vi.mock('../../src/api/mcp-client')

describe('Rollback Command', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(process, 'exit').mockImplementation((code) => {
      throw new Error(`Process.exit called with ${code}`)
    })
  })

  describe('Rollback to Checkpoint', () => {
    it('should rollback to latest checkpoint', async () => {
      const mockClient = {
        callTool: vi.fn().mockResolvedValue({
          success: true,
          message: 'Checkpoint restored, Sir.',
          data: {
            success: true,
            checkpoint_id: 'stash@{0}',
            files_restored: ['src/index.ts', 'src/utils.ts'],
            timestamp: '2025-11-15T10:00:00Z',
          },
        }),
      }

      vi.mocked(mcpClient.getDefaultClient).mockReturnValue(mockClient as any)

      await handleRollback(null, {})

      expect(mockClient.callTool).toHaveBeenCalledWith('rollback_to_checkpoint', {
        checkpoint_id: null,
        keep_checkpoint: false,
      })
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Checkpoint restored'),
      )
    })

    it('should rollback to specific checkpoint', async () => {
      const mockClient = {
        callTool: vi.fn().mockResolvedValue({
          success: true,
          message: 'Checkpoint restored',
          data: {
            checkpoint_id: 'stash@{1}',
            files_restored: ['test.ts'],
          },
        }),
      }

      vi.mocked(mcpClient.getDefaultClient).mockReturnValue(mockClient as any)

      await handleRollback('stash@{1}', {})

      expect(mockClient.callTool).toHaveBeenCalledWith('rollback_to_checkpoint', {
        checkpoint_id: 'stash@{1}',
        keep_checkpoint: false,
      })
    })

    it('should keep checkpoint when requested', async () => {
      const mockClient = {
        callTool: vi.fn().mockResolvedValue({
          success: true,
          message: 'Checkpoint restored',
          data: {
            checkpoint_id: 'stash@{0}',
            files_restored: [],
          },
        }),
      }

      vi.mocked(mcpClient.getDefaultClient).mockReturnValue(mockClient as any)

      await handleRollback(null, { keep: true })

      expect(mockClient.callTool).toHaveBeenCalledWith('rollback_to_checkpoint', {
        checkpoint_id: null,
        keep_checkpoint: true,
      })
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Checkpoint preserved'),
      )
    })

    it('should show file count when files restored', async () => {
      const mockClient = {
        callTool: vi.fn().mockResolvedValue({
          success: true,
          message: 'Restored',
          data: {
            checkpoint_id: 'stash@{0}',
            files_restored: ['file1.ts', 'file2.ts', 'file3.ts'],
          },
        }),
      }

      vi.mocked(mcpClient.getDefaultClient).mockReturnValue(mockClient as any)

      await handleRollback(null, {})

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Files restored: 3'),
      )
    })

    it('should handle no files changed scenario', async () => {
      const mockClient = {
        callTool: vi.fn().mockResolvedValue({
          success: true,
          message: 'Restored',
          data: {
            checkpoint_id: 'stash@{0}',
            files_restored: [],
          },
        }),
      }

      vi.mocked(mcpClient.getDefaultClient).mockReturnValue(mockClient as any)

      await handleRollback(null, {})

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('No files changed'),
      )
    })

    it('should output JSON when requested', async () => {
      const mockData = {
        checkpoint_id: 'stash@{0}',
        files_restored: ['test.ts'],
      }

      const mockClient = {
        callTool: vi.fn().mockResolvedValue({
          success: true,
          data: mockData,
        }),
      }

      vi.mocked(mcpClient.getDefaultClient).mockReturnValue(mockClient as any)

      await handleRollback(null, { json: true })

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('stash@{0}'),
      )
    })

    it('should handle rollback failure', async () => {
      const mockClient = {
        callTool: vi.fn().mockRejectedValue(new Error('No checkpoints available')),
      }

      vi.mocked(mcpClient.getDefaultClient).mockReturnValue(mockClient as any)

      await expect(handleRollback(null, {})).rejects.toThrow('Process.exit')

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Rollback failed'),
      )
    })

    it('should show error message on conflict', async () => {
      const mockClient = {
        callTool: vi.fn().mockRejectedValue(
          new Error('Conflicts detected. Please resolve manually.'),
        ),
      }

      vi.mocked(mcpClient.getDefaultClient).mockReturnValue(mockClient as any)

      await expect(handleRollback(null, {})).rejects.toThrow('Process.exit')

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Error: Conflicts detected'),
      )
    })

    it('should handle long file list with truncation', async () => {
      const files = Array.from({ length: 15 }, (_, i) => `file${i}.ts`)

      const mockClient = {
        callTool: vi.fn().mockResolvedValue({
          success: true,
          message: 'Restored',
          data: {
            checkpoint_id: 'stash@{0}',
            files_restored: files,
          },
        }),
      }

      vi.mocked(mcpClient.getDefaultClient).mockReturnValue(mockClient as any)

      await handleRollback(null, {})

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('... and 5 more'))
    })

    it('should output JSON error on failure', async () => {
      const mockClient = {
        callTool: vi.fn().mockRejectedValue(new Error('Test error')),
      }

      vi.mocked(mcpClient.getDefaultClient).mockReturnValue(mockClient as any)

      await expect(handleRollback(null, { json: true })).rejects.toThrow()

      const logCall = vi.mocked(console.log).mock.calls[0][0]
      expect(logCall).toContain('success')
      expect(logCall).toContain('false')
    })
  })
})
