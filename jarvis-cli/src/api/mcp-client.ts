/**
 * MCP Client Wrapper for JARVIS CLI
 *
 * Provides interface to communicate with JARVIS MCP server.
 */

export interface MCPToolCall {
  tool: string
  arguments: Record<string, any>
}

export interface MCPResponse {
  success: boolean
  data?: any
  report?: string
  error?: string
  message?: string
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
   */
  async callTool(tool: string, args: Record<string, any> = {}): Promise<MCPResponse> {
    try {
      const response = await this.makeRequest('/tools/call', {
        tool,
        arguments: args,
      })

      return response
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      }
    }
  }

  /**
   * Remember context (store memory)
   */
  async rememberContext(params: {
    content: string
    type?: string
    tags?: string[]
    file_path?: string
    metadata?: Record<string, any>
  }): Promise<MCPResponse> {
    return this.callTool('remember_context', {
      content: params.content,
      type: params.type || 'decision',
      tags: params.tags || [],
      file_path: params.file_path,
      metadata: params.metadata || {},
    })
  }

  /**
   * Recall context (search memory)
   */
  async recallContext(params: {
    query: string
    type_filter?: string
    file_filter?: string
    since?: string
    limit?: number
  }): Promise<MCPResponse> {
    return this.callTool('recall_context', {
      query: params.query,
      type_filter: params.type_filter,
      file_filter: params.file_filter,
      since: params.since,
      limit: params.limit || 10,
    })
  }

  /**
   * Analyze codebase
   */
  async analyzeCodebase(
    projectPath: string,
    options: Record<string, any> = {},
  ): Promise<MCPResponse> {
    return this.callTool('analyze_codebase', {
      project_path: projectPath,
      ...options,
    })
  }

  /**
   * Get architecture/project structure
   */
  async getArchitecture(): Promise<MCPResponse> {
    return this.callTool('get_architecture', {})
  }

  /**
   * Create safety checkpoint
   */
  async createCheckpoint(reason: string, filesAffected: string[] = []): Promise<MCPResponse> {
    return this.callTool('create_checkpoint', {
      reason,
      files_affected: filesAffected,
    })
  }

  /**
   * Rollback to previous state
   */
  async rollback(checkpointId?: string): Promise<MCPResponse> {
    return this.callTool('rollback', {
      checkpoint_id: checkpointId,
    })
  }

  /**
   * Validate pending changes
   */
  async validateChanges(changes: any[]): Promise<MCPResponse> {
    return this.callTool('validate_changes', {
      changes,
    })
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
   */
  async getStats(): Promise<MCPResponse> {
    try {
      return await this.makeRequest('/stats', {})
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get stats',
      }
    }
  }

  /**
   * Make HTTP request to MCP server
   */
  private async makeRequest(endpoint: string, data: any): Promise<MCPResponse> {
    // For now, this is a placeholder that simulates server communication
    // In production, this would use fetch or axios to call the actual MCP server

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 100))

    // Return mock response for development
    return {
      success: true,
      data: {
        message: 'MCP server not yet implemented',
        endpoint,
        request: data,
      },
      message: 'Note: This is a mock response. MCP server implementation pending.',
    }
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
