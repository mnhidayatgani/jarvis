/**
 * Mock MCP server responses for testing
 */

import type { MCPResponse } from "../../src/api/types";

export const mockSuccessResponse: MCPResponse = {
  success: true,
  data: { id: "test-123" },
  message: "Operation completed successfully",
};

export const mockErrorResponse: MCPResponse = {
  success: false,
  error: {
    error: "ValidationError",
    code: "VALIDATION_ERROR",
    message: "Invalid input",
    context: { field: "content", value: "" },
  },
};

export const mockRememberResponse: MCPResponse = {
  success: true,
  data: {
    id: "mem-abc123",
    type: "decision",
    timestamp: "2025-11-15T00:00:00Z",
  },
};

export const mockRecallResponse: MCPResponse = {
  success: true,
  data: {
    results: [
      {
        id: "mem-1",
        content: "Using PostgreSQL for database",
        type: "decision",
        tags: ["database", "architecture"],
        created_at: "2025-11-15T00:00:00Z",
        relevance_score: 0.95,
      },
    ],
    total: 1,
    query: "database",
  },
};
