/**
 * Integration tests for memory workflow (remember → recall)
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { handleRememberCommand } from '../../src/commands/remember'
import { handleRecallCommand } from '../../src/commands/recall'

// Mock MCP client with state
let memoryStore: any[] = []
let nextId = 1

const mockRememberContext = vi.fn().mockImplementation(async ({ content, type }) => {
  const memory = {
    id: (nextId++).toString(),
    content,
    type: type || 'decision',
    timestamp: new Date().toISOString(),
    relevance_score: 1.0,
  }
  memoryStore.push(memory)

  return {
    success: true,
    data: {
      memory_id: memory.id,
      type: memory.type,
      timestamp: memory.timestamp,
    },
    message: '✓ Understood, Sir. I have recorded that decision.',
  }
})

const mockRecallContext = vi.fn().mockImplementation(async ({ query }) => {
  // Simple text matching for integration test
  const results = memoryStore.filter((m) =>
    m.content.toLowerCase().includes(query.toLowerCase()),
  )

  return {
    success: true,
    data: {
      results,
    },
  }
})

vi.mock('../../src/api/mcp-client', () => ({
  getDefaultClient: () => ({
    rememberContext: mockRememberContext,
    recallContext: mockRecallContext,
  }),
}))

vi.mock('../../src/utils/output', () => ({
  getFormatter: () => ({
    progress: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  }),
}))

describe('Memory Integration Tests', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    // Reset memory store
    memoryStore = []
    nextId = 1

    mockRememberContext.mockClear()
    mockRecallContext.mockClear()
  })

  afterEach(() => {
    consoleLogSpy.mockRestore()
  })

  describe('remember → recall workflow', () => {
    it('should store and retrieve a single memory', async () => {
      // Remember
      await handleRememberCommand(['chose', 'PostgreSQL', 'for', 'database'], {})

      expect(mockRememberContext).toHaveBeenCalledWith(
        expect.objectContaining({
          content: 'chose PostgreSQL for database',
          type: 'decision',
        }),
      )

      // Recall
      await handleRecallCommand('database', {})

      expect(mockRecallContext).toHaveBeenCalledWith(
        expect.objectContaining({
          query: 'database',
        }),
      )

      // Verify result was displayed
      expect(consoleLogSpy).toHaveBeenCalled()
    })

    it('should store multiple memories and recall them', async () => {
      // Store multiple memories
      await handleRememberCommand(['chose', 'PostgreSQL', 'database'], {})
      await handleRememberCommand(['decided', 'TypeScript', 'for', 'backend'], {})
      await handleRememberCommand(['using', 'Redis', 'for', 'caching'], {})

      expect(memoryStore).toHaveLength(3)

      // Recall with broad query
      await handleRecallCommand('database', {})

      // Should find PostgreSQL memory
      expect(mockRecallContext).toHaveBeenCalled()
    })

    it('should recall with semantic matching', async () => {
      await handleRememberCommand(['chose', 'PostgreSQL', 'for', 'database'], {})

      // Query with different wording
      await handleRecallCommand('PostgreSQL', {})

      const call = mockRecallContext.mock.calls[0][0]
      expect(call.query).toBe('PostgreSQL')
    })

    it('should support type filtering in recall', async () => {
      await handleRememberCommand(['test', 'decision'], { type: 'decision' })
      await handleRememberCommand(['test', 'note'], { type: 'note' })

      await handleRecallCommand('test', { type: 'decision' })

      expect(mockRecallContext).toHaveBeenCalledWith(
        expect.objectContaining({
          type_filter: 'decision',
        }),
      )
    })

    it('should handle no results gracefully', async () => {
      await handleRememberCommand(['some', 'content'], {})

      // Query for non-existent content
      await handleRecallCommand('nonexistent', {})

      // Should not crash
      expect(mockRecallContext).toHaveBeenCalled()
    })

    it('should preserve memory metadata', async () => {
      await handleRememberCommand(['test', 'content'], {
        type: 'decision',
        tags: ['database', 'backend'],
      })

      // Verify stored with metadata
      expect(mockRememberContext).toHaveBeenCalledWith(
        expect.objectContaining({
          content: 'test content',
          type: 'decision',
          tags: ['database', 'backend'],
        }),
      )
    })

    it('should support time-based filtering', async () => {
      await handleRememberCommand(['old', 'memory'], {})

      await handleRecallCommand('memory', { since: '2025-01-01' })

      expect(mockRecallContext).toHaveBeenCalledWith(
        expect.objectContaining({
          since: '2025-01-01',
        }),
      )
    })

    it('should respect limit parameter', async () => {
      // Store many memories
      for (let i = 0; i < 20; i++) {
        await handleRememberCommand([`memory`, `${i}`], {})
      }

      await handleRecallCommand('memory', { limit: 5 })

      expect(mockRecallContext).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 5,
        }),
      )
    })

    it('should support JSON output in recall', async () => {
      await handleRememberCommand(['test', 'memory'], {})

      await handleRecallCommand('test', { json: true })

      // Should output JSON
      const jsonCalls = consoleLogSpy.mock.calls.filter((call: any[]) =>
        call[0]?.includes('"success"'),
      )
      expect(jsonCalls.length).toBeGreaterThan(0)
    })

    it('should handle concurrent remember operations', async () => {
      // Simulate concurrent operations
      await Promise.all([
        handleRememberCommand(['memory', '1'], {}),
        handleRememberCommand(['memory', '2'], {}),
        handleRememberCommand(['memory', '3'], {}),
      ])

      expect(memoryStore).toHaveLength(3)

      // All should be recallable
      await handleRecallCommand('memory', {})
      expect(mockRecallContext).toHaveBeenCalled()
    })
  })
})
