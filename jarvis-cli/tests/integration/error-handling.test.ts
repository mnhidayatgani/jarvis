/**
 * Integration Tests for Error Handling and Recovery
 *
 * Tests error handling, retry logic, and graceful degradation.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MCPClient } from "../../src/api/mcp-client";
import { ErrorHandler, createErrorHandler } from "../../src/core/errors/handler";
import { OutputFormatter } from "../../src/utils/output";
import { createLogger, LogLevel } from "../../src/utils/logger";
import {
  JarvisError,
  MCPConnectionError,
  ValidationError,
  InternalError,
} from "../../src/core/errors";

describe("Error Handling Integration", () => {
  let formatter: OutputFormatter;
  let logger: ReturnType<typeof createLogger>;
  let errorHandler: ErrorHandler;

  beforeEach(() => {
    formatter = new OutputFormatter({ quiet: true, json: true });
    logger = createLogger({ level: LogLevel.ERROR, console: false });
    errorHandler = createErrorHandler(formatter, logger, {
      exitOnCritical: false,
      showStackTrace: false,
    });
  });

  describe("ErrorHandler", () => {
    it("should handle JarvisError instances", () => {
      const error = new ValidationError("Invalid input", "test_field", "bad_value");

      const result = errorHandler.handle(error);

      expect(result.error).toBe("ValidationError");
      expect(result.code).toBe("VALIDATION_ERROR");
      expect(result.context).toHaveProperty("field", "test_field");
    });

    it("should normalize standard Error to InternalError", () => {
      const error = new Error("Something went wrong");

      const result = errorHandler.handle(error);

      expect(result.code).toBe("INTERNAL_ERROR");
      expect(result.message).toContain("Something went wrong");
    });

    it("should handle unknown error types", () => {
      const error = "string error";

      const result = errorHandler.handle(error);

      expect(result.code).toBe("INTERNAL_ERROR");
      expect(result.context).toHaveProperty("originalError");
    });

    it("should merge additional context", () => {
      const error = new ValidationError("Invalid", "field", "value");
      const additionalContext = { command: "test", extra: "info" };

      const result = errorHandler.handle(error, additionalContext);

      expect(result.context).toHaveProperty("field", "field");
      expect(result.context).toHaveProperty("command", "test");
      expect(result.context).toHaveProperty("extra", "info");
    });

    it("should wrap functions with error handling", async () => {
      const mockFn = vi.fn().mockRejectedValue(new Error("Failed"));

      const wrapped = errorHandler.wrap(mockFn);

      await expect(wrapped()).rejects.toThrow("Failed");
      expect(mockFn).toHaveBeenCalled();
    });

    it("should handle async errors with recovery", async () => {
      const error = new Error("Original error");
      const recovery = vi.fn().mockResolvedValue("recovered");

      const result = await errorHandler.handleAsync(error, recovery);

      expect(result).toBe("recovered");
      expect(recovery).toHaveBeenCalled();
    });

    it("should throw when recovery fails", async () => {
      const error = new MCPConnectionError("Connection failed", "http://localhost");
      const failedRecovery = vi.fn().mockRejectedValue(new Error("Recovery failed"));

      await expect(
        errorHandler.handleAsync(error, failedRecovery)
      ).rejects.toThrow();
    });
  });

  describe("MCP Client Retry Logic", () => {
    it("should retry on network errors with exponential backoff", async () => {
      let attempts = 0;
      const mockRequest = vi.fn().mockImplementation(async () => {
        attempts++;
        if (attempts < 3) {
          throw new Error("NETWORK_ERROR: Connection refused");
        }
        return { success: true, data: "ok" };
      });

      const client = new MCPClient("http://localhost:3000", 5000, {
        maxRetries: 3,
        initialDelay: 10,
        backoffMultiplier: 2,
      });

      // Replace internal method for testing
      (client as any).makeRequestInternal = mockRequest;

      const result = await client.callTool("test_tool", {});

      expect(result.success).toBe(true);
      expect(attempts).toBe(3);
      expect(mockRequest).toHaveBeenCalledTimes(3);
    });

    it("should not retry on non-retryable errors", async () => {
      let attempts = 0;
      const mockRequest = vi.fn().mockImplementation(async () => {
        attempts++;
        throw new Error("VALIDATION_ERROR: Invalid input");
      });

      const client = new MCPClient("http://localhost:3000", 5000, {
        maxRetries: 3,
        initialDelay: 10,
      });

      (client as any).makeRequestInternal = mockRequest;

      const result = await client.callTool("test_tool", {});

      expect(result.success).toBe(false);
      expect(attempts).toBe(1); // No retries for validation errors
    });

    it("should give up after max retries", async () => {
      const mockRequest = vi.fn().mockRejectedValue(
        new Error("TIMEOUT_ERROR: Request timeout")
      );

      const client = new MCPClient("http://localhost:3000", 5000, {
        maxRetries: 2,
        initialDelay: 10,
      });

      (client as any).makeRequestInternal = mockRequest;

      const result = await client.callTool("test_tool", {});

      expect(result.success).toBe(false);
      expect(mockRequest).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it("should respect custom retry configuration", async () => {
      let attempts = 0;
      const delays: number[] = [];
      const originalSetTimeout = global.setTimeout;

      // Mock setTimeout to track delays
      const setTimeoutSpy = vi.spyOn(global, "setTimeout");
      setTimeoutSpy.mockImplementation(((fn: any, delay?: number) => {
        delays.push(delay ?? 0);
        return originalSetTimeout(() => fn(), 0) as any;
      }) as any);

      const mockRequest = vi.fn().mockImplementation(async () => {
        attempts++;
        if (attempts < 4) {
          throw new Error("MCP_CONNECTION_ERROR");
        }
        return { success: true };
      });

      const client = new MCPClient("http://localhost:3000", 5000, {
        maxRetries: 5,
        initialDelay: 100,
        backoffMultiplier: 3,
        maxDelay: 1000,
      });

      (client as any).makeRequestInternal = mockRequest;

      await client.callTool("test_tool", {});

      // Should use exponential backoff: 100, 300, 900 (capped at 1000)
      expect(delays[0]).toBe(100);
      expect(delays[1]).toBe(300);
      expect(delays[2]).toBe(900);

      vi.restoreAllMocks();
    });
  });

  describe("Error Context Hints", () => {
    it("should provide helpful hints for MCP connection errors", () => {
      const formatSpy = vi.spyOn(formatter, "error");
      const listSpy = vi.spyOn(formatter, "list");

      const error = new MCPConnectionError(
        "Cannot connect to MCP server",
        "http://localhost:3000"
      );

      errorHandler.handle(error);

      expect(formatSpy).toHaveBeenCalled();
      expect(listSpy).toHaveBeenCalled();
      
      // Check that hints were provided
      const hints = listSpy.mock.calls[0][0];
      expect(hints).toContain("Ensure MCP server is running");
      expect(hints).toContain("Run 'jarvis doctor' to check system health");
    });

    it("should provide hints for validation errors", () => {
      const listSpy = vi.spyOn(formatter, "list");

      const error = new ValidationError("Invalid content", "content", "");

      errorHandler.handle(error);

      const hints = listSpy.mock.calls[0][0];
      expect(hints.some((h: string) => h.includes("content"))).toBe(true);
    });
  });

  describe("Graceful Degradation", () => {
    it("should handle partial failures gracefully", async () => {
      // Mock a scenario where semantic search fails but factual succeeds
      const mockClient = new MCPClient();
      
      // Simulate partial failure response
      const mockResponse = {
        success: true,
        data: {
          results: ["result1"],
        },
        message: "Partial success: Semantic layer unavailable",
      };

      vi.spyOn(mockClient as any, "makeRequestInternal")
        .mockResolvedValue(mockResponse);

      const result = await mockClient.callTool("recall_context", {
        query: "test",
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain("Partial success");
    });
  });
});
