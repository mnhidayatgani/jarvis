/**
 * Unit tests for checkpoint command
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { handleCheckpoint } from '../../src/commands/checkpoint'
import * as mcpClient from '../../src/api/mcp-client'

vi.mock('../../src/api/mcp-client')

describe('Checkpoint Command', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(process, 'exit').mockImplementation((code) => {
      throw new Error(`Process.exit called with ${code}`)
    })
  })

  describe('Create Checkpoint', () => {
    it('should create checkpoint with reason', async () => {
      const mockClient = {
        callTool: vi.fn().mockResolvedValue({
          success: true,
          message: 'Checkpoint created, Sir.',
          data: {
            checkpoint_id: 'stash@{0}',
            reason: 'before refactor',
            timestamp: '2025-11-15T10:00:00Z',
            files_affected: ['src/index.ts', 'src/utils.ts'],
            has_changes: true,
          },
        }),
      }

      vi.mocked(mcpClient.getDefaultClient).mockReturnValue(mockClient as any)

      await handleCheckpoint('before refactor', {})

      expect(mockClient.callTool).toHaveBeenCalledWith('create_checkpoint', {
        reason: 'before refactor',
      })
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Checkpoint ID: stash@{0}'),
      )
    })

    it('should handle no changes scenario', async () => {
      const mockClient = {
        callTool: vi.fn().mockResolvedValue({
          success: true,
          message: 'No changes to checkpoint',
          data: {
            checkpoint_id: null,
            has_changes: false,
            files_affected: [],
          },
        }),
      }

      vi.mocked(mcpClient.getDefaultClient).mockReturnValue(mockClient as any)

      await handleCheckpoint('test', {})

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('No changes to checkpoint'),
      )
    })

    it('should require reason when creating checkpoint', async () => {
      await expect(handleCheckpoint(null, {})).rejects.toThrow('Process.exit')

      expect(console.error).toHaveBeenCalledWith(
        'Error: Checkpoint reason is required',
      )
    })

    it('should output JSON when requested', async () => {
      const mockData = {
        checkpoint_id: 'stash@{0}',
        has_changes: true,
      }

      const mockClient = {
        callTool: vi.fn().mockResolvedValue({
          success: true,
          data: mockData,
        }),
      }

      vi.mocked(mcpClient.getDefaultClient).mockReturnValue(mockClient as any)

      await handleCheckpoint('test', { json: true })

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('stash@{0}'),
      )
    })

    it('should handle checkpoint creation failure', async () => {
      const mockClient = {
        callTool: vi.fn().mockRejectedValue(new Error('Not a git repository')),
      }

      vi.mocked(mcpClient.getDefaultClient).mockReturnValue(mockClient as any)

      await expect(handleCheckpoint('test', {})).rejects.toThrow('Process.exit')

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Checkpoint creation failed'),
      )
    })
  })

  describe('List Checkpoints', () => {
    it('should list available checkpoints', async () => {
      const mockClient = {
        callTool: vi.fn().mockResolvedValue({
          success: true,
          data: {
            checkpoints: [
              {
                checkpoint_id: 'stash@{0}',
                message: 'JARVIS checkpoint: before refactor',
                timestamp: '2025-11-15T10:00:00Z',
                index: 0,
              },
              {
                checkpoint_id: 'stash@{1}',
                message: 'JARVIS checkpoint: before deploy',
                timestamp: '2025-11-15T09:00:00Z',
                index: 1,
              },
            ],
          },
        }),
      }

      vi.mocked(mcpClient.getDefaultClient).mockReturnValue(mockClient as any)

      await handleCheckpoint(null, { list: true })

      expect(mockClient.callTool).toHaveBeenCalledWith('list_checkpoints', {})
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Available Checkpoints'),
      )
    })

    it('should handle empty checkpoint list', async () => {
      const mockClient = {
        callTool: vi.fn().mockResolvedValue({
          success: true,
          data: {
            checkpoints: [],
          },
        }),
      }

      vi.mocked(mcpClient.getDefaultClient).mockReturnValue(mockClient as any)

      await handleCheckpoint(null, { list: true })

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('No checkpoints found'),
      )
    })

    it('should output JSON list when requested', async () => {
      const mockClient = {
        callTool: vi.fn().mockResolvedValue({
          success: true,
          data: {
            checkpoints: [{ checkpoint_id: 'stash@{0}' }],
          },
        }),
      }

      vi.mocked(mcpClient.getDefaultClient).mockReturnValue(mockClient as any)

      await handleCheckpoint(null, { list: true, json: true })

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('stash@{0}'),
      )
    })
  })

  describe('Preview Checkpoint', () => {
    it('should preview checkpoint changes', async () => {
      const mockClient = {
        callTool: vi.fn().mockResolvedValue({
          success: true,
          data: {
            checkpoint_id: 'stash@{0}',
            files_changed: ['src/index.ts', 'src/utils.ts'],
            diff: 'diff content...',
            stats: '2 files changed, 10 insertions(+), 5 deletions(-)',
          },
        }),
      }

      vi.mocked(mcpClient.getDefaultClient).mockReturnValue(mockClient as any)

      await handleCheckpoint(null, { preview: 'stash@{0}' })

      expect(mockClient.callTool).toHaveBeenCalledWith('preview_checkpoint', {
        checkpoint_id: 'stash@{0}',
      })
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Checkpoint Preview'),
      )
    })

    it('should output JSON preview when requested', async () => {
      const mockClient = {
        callTool: vi.fn().mockResolvedValue({
          success: true,
          data: {
            checkpoint_id: 'stash@{0}',
            files_changed: ['test.ts'],
          },
        }),
      }

      vi.mocked(mcpClient.getDefaultClient).mockReturnValue(mockClient as any)

      await handleCheckpoint(null, { preview: 'stash@{0}', json: true })

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('stash@{0}'),
      )
    })
  })
})
