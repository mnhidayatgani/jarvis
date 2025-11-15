/**
 * MCP Client interface for server communication
 */
export interface IMCPClient {
  /**
   * Call an MCP tool with arguments
   */
  callTool(name: string, args: unknown): Promise<MCPResponse>;

  /**
   * Check if MCP server is healthy
   */
  healthCheck(): Promise<boolean>;

  /**
   * Get server statistics
   */
  getStats(): Promise<ServerStats>;
}

/**
 * MCP response structure
 */
export interface MCPResponse {
  success: boolean;
  data?: unknown;
  error?: ErrorResponse;
  message?: string;
}

/**
 * Error response from MCP server
 */
export interface ErrorResponse {
  error: string;
  code: string;
  message: string;
  context?: Record<string, unknown>;
}

/**
 * Server statistics
 */
export interface ServerStats {
  uptime: number;
  totalRequests: number;
  failedRequests: number;
  averageResponseTime: number;
}

/**
 * MCP tool call structure
 */
export interface MCPToolCall {
  name: string;
  arguments: Record<string, unknown>;
}
