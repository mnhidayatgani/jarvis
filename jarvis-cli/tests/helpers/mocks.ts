/**
 * Mock implementations for testing
 */

import type { IMCPClient, MCPResponse, ServerStats } from "../../src/api/types";

export class MockMCPClient implements IMCPClient {
  private responses: Map<string, MCPResponse> = new Map();
  public callCount: Map<string, number> = new Map();

  setResponse(toolName: string, response: MCPResponse): void {
    this.responses.set(toolName, response);
  }

  async callTool(name: string, args: unknown): Promise<MCPResponse> {
    this.callCount.set(name, (this.callCount.get(name) || 0) + 1);
    
    const response = this.responses.get(name);
    if (response) {
      return response;
    }
    
    return {
      success: true,
      data: { toolName: name, args },
    };
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }

  async getStats(): Promise<ServerStats> {
    return {
      uptime: 1000,
      totalRequests: 100,
      failedRequests: 0,
      averageResponseTime: 50,
    };
  }

  reset(): void {
    this.responses.clear();
    this.callCount.clear();
  }
}
