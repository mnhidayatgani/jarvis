/**
 * MCP Client Wrapper for JARVIS CLI
 *
 * Provides interface to communicate with JARVIS MCP server.
 */

import type { MCPResponse, ErrorResponse } from "./types";

/**
 * Parameters for remember_context tool call
 */
export interface RememberContextParams {
  content: string;
  type?: "decision" | "note" | "context";
  tags?: string[];
  file_path?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Parameters for recall_context tool call
 */
export interface RecallContextParams {
  query: string;
  type_filter?: "decision" | "note" | "context";
  file_filter?: string;
  since?: string;
  limit?: number;
}

/**
 * Parameters for analyze_codebase tool call
 */
export interface AnalyzeCodebaseParams {
  project_path: string;
  verbose?: boolean;
  interactive?: boolean;
}

/**
 * Parameters for create_checkpoint tool call
 */
export interface CreateCheckpointParams {
  reason: string;
  files_affected?: string[];
}

/**
 * Parameters for rollback tool call
 */
export interface RollbackParams {
  checkpoint_id?: string;
  keep_checkpoint?: boolean;
}

/**
 * Parameters for validate_changes tool call
 */
export interface ValidateChangesParams {
  changes?: unknown[];
}

export class MCPClient {
  private readonly serverUrl: string;
  private readonly timeout: number;

  constructor(
    serverUrl: string = 'http://localhost:3000',
    timeout: number = 30000
  ) {
    this.serverUrl = serverUrl;
    this.timeout = timeout;
  }

  /**
   * Get the configured server URL
   * @internal Reserved for future HTTP client implementation
   */
  getServerUrl(): string {
    return this.serverUrl;
  }

  /**
   * Get the configured timeout
   * @internal Reserved for future HTTP client implementation
   */
  getTimeout(): number {
    return this.timeout;
  }

  /**
   * Call an MCP tool on the server
   * 
   * @param tool - Tool name to call
   * @param args - Tool arguments (must be JSON-serializable)
   * @returns Promise resolving to MCP response
   */
  async callTool(
    tool: string,
    args: Record<string, unknown> = {}
  ): Promise<MCPResponse> {
    try {
      const response = await this.makeRequest("/tools/call", {
        tool,
        arguments: args,
      });

      return response;
    } catch (error) {
      const errorResponse: ErrorResponse = {
        error: "MCP_TOOL_ERROR",
        code: "MCP_TOOL_ERROR",
        message: error instanceof Error ? error.message : "Unknown error occurred",
        context: { tool, args },
      };
      return {
        success: false,
        error: errorResponse,
      };
    }
  }

  /**
   * Remember context (store memory)
   * 
   * @param params - Remember context parameters
   * @returns Promise resolving to MCP response with memory ID
   */
  async rememberContext(params: RememberContextParams): Promise<MCPResponse> {
    return this.callTool("remember_context", {
      content: params.content,
      type: params.type || "decision",
      tags: params.tags || [],
      file_path: params.file_path,
      metadata: params.metadata || {},
    });
  }

  /**
   * Recall context (search memory)
   * 
   * @param params - Recall context parameters
   * @returns Promise resolving to MCP response with search results
   */
  async recallContext(params: RecallContextParams): Promise<MCPResponse> {
    return this.callTool("recall_context", {
      query: params.query,
      type_filter: params.type_filter,
      file_filter: params.file_filter,
      since: params.since,
      limit: params.limit || 10,
    });
  }

  /**
   * Analyze codebase
   * 
   * @param projectPath - Path to project root
   * @param options - Analysis options
   * @returns Promise resolving to MCP response with analysis results
   */
  async analyzeCodebase(
    projectPath: string,
    options: Partial<AnalyzeCodebaseParams> = {}
  ): Promise<MCPResponse> {
    return this.callTool("analyze_codebase", {
      project_path: projectPath,
      verbose: options.verbose,
      interactive: options.interactive,
    });
  }

  /**
   * Get architecture/project structure
   * 
   * @returns Promise resolving to MCP response with architecture information
   */
  async getArchitecture(): Promise<MCPResponse> {
    return this.callTool("get_architecture", {});
  }

  /**
   * Create safety checkpoint
   * 
   * @param reason - Reason for creating checkpoint
   * @param filesAffected - List of files affected (optional)
   * @returns Promise resolving to MCP response with checkpoint ID
   */
  async createCheckpoint(
    reason: string,
    filesAffected: string[] = []
  ): Promise<MCPResponse> {
    return this.callTool("create_checkpoint", {
      reason,
      files_affected: filesAffected,
    });
  }

  /**
   * Rollback to previous state
   * 
   * @param checkpointId - Optional checkpoint ID (defaults to latest)
   * @param keepCheckpoint - Whether to keep checkpoint after rollback
   * @returns Promise resolving to MCP response with rollback status
   */
  async rollback(
    checkpointId?: string,
    keepCheckpoint: boolean = false
  ): Promise<MCPResponse> {
    return this.callTool("rollback_to_checkpoint", {
      checkpoint_id: checkpointId,
      keep_checkpoint: keepCheckpoint,
    });
  }

  /**
   * Validate pending changes
   * 
   * @param changes - Optional array of changes to validate
   * @returns Promise resolving to MCP response with validation results
   */
  async validateChanges(changes: unknown[] = []): Promise<MCPResponse> {
    return this.callTool("validate_changes", {
      changes,
    });
  }

  /**
   * Check server health
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.makeRequest('/health', {})
      return response.success === true
    } catch {
      return false
    }
  }

  /**
   * Get server stats
   * 
   * @returns Promise resolving to MCP response with server statistics
   */
  async getStats(): Promise<MCPResponse> {
    try {
      return await this.makeRequest("/stats", {});
    } catch (error) {
      const errorResponse: ErrorResponse = {
        error: "MCP_STATS_ERROR",
        code: "MCP_STATS_ERROR",
        message: error instanceof Error ? error.message : "Failed to get stats",
      };
      return {
        success: false,
        error: errorResponse,
      };
    }
  }

  /**
   * Make HTTP request to MCP server
   * 
   * @param endpoint - API endpoint path
   * @param data - Request data (must be JSON-serializable)
   * @returns Promise resolving to MCP response
   * @internal Reserved for future HTTP client implementation
   */
  private async makeRequest(
    endpoint: string,
    data: Record<string, unknown>
  ): Promise<MCPResponse> {
    // For now, this is a placeholder that simulates server communication
    // In production, this would use fetch or axios to call the actual MCP server

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Return mock response for development
    return {
      success: true,
      data: {
        message: "MCP server not yet implemented",
        endpoint,
        request: data,
      },
      message: "Note: This is a mock response. MCP server implementation pending.",
    };
  }
}

/**
 * Get default MCP client instance
 */
let defaultClient: MCPClient | null = null

export function getDefaultClient(): MCPClient {
  if (!defaultClient) {
    const serverUrl = process.env.JARVIS_MCP_URL || 'http://localhost:3000'
    defaultClient = new MCPClient(serverUrl)
  }
  return defaultClient
}

/**
 * Reset default client (useful for testing)
 */
export function resetDefaultClient(): void {
  defaultClient = null
}
