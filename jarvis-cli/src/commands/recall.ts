/**
 * Recall Command - Search JARVIS memory
 * Refactored to use Command Pattern
 */

import { BaseCommand } from "./base/command";
import type { RecallOptions, RecallResult, MemoryItem } from "./base/types";
import { getDefaultClient } from "../api/mcp-client";
import {
  ValidationError,
  MCPConnectionError,
  InternalError,
} from "../core/errors";

export class RecallCommand extends BaseCommand<RecallOptions, RecallResult> {
  parse(args: string[]): RecallOptions {
    const options: RecallOptions = {};
    const queryParts: string[] = [];

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];

      if (arg === "--type" || arg === "-t") {
        const typeValue = args[++i];
        if (typeValue === "decision" || typeValue === "note" || typeValue === "context") {
          options.type = typeValue;
        }
      } else if (arg === "--file" || arg === "-f") {
        options.file = args[++i];
      } else if (arg === "--since" || arg === "-s") {
        options.since = args[++i];
      } else if (arg === "--limit" || arg === "-l") {
        options.limit = parseInt(args[++i], 10);
      } else if (arg === "--id") {
        options.id = args[++i];
      } else if (arg === "--verbose" || arg === "-v") {
        options.verbose = true;
      } else if (arg === "--quiet" || arg === "-q") {
        options.quiet = true;
      } else if (arg === "--json") {
        options.json = true;
      } else if (!arg.startsWith("-")) {
        queryParts.push(arg);
      }
    }

    options.query = queryParts.join(" ");
    return options;
  }

  validate(options: RecallOptions): void {
    // If not drill-down by ID, query is required
    if (!options.id && (!options.query || options.query.trim().length === 0)) {
      throw new ValidationError(
        'Query cannot be empty. Use: jarvis recall "search query" or --id <memory_id>',
        "query",
        options.query
      );
    }

    // Validate limit if provided
    if (options.limit !== undefined) {
      if (isNaN(options.limit) || options.limit < 1 || options.limit > 100) {
        throw new ValidationError(
          `Invalid limit "${options.limit}". Must be between 1 and 100`,
          "limit",
          options.limit
        );
      }
    }

    // Validate memory type if provided
    if (options.type) {
      const validTypes = ["decision", "note", "context"];
      if (!validTypes.includes(options.type)) {
        throw new ValidationError(
          `Invalid memory type "${options.type}". Valid types: ${validTypes.join(", ")}`,
          "type",
          options.type
        );
      }
    }
  }

  async execute(options: RecallOptions): Promise<RecallResult> {
    // Handle drill-down by ID
    if (options.id) {
      return await this.recallById(options.id);
    }

    // Handle search
    return await this.recallByQuery(options);
  }

  private async recallByQuery(options: RecallOptions): Promise<RecallResult> {
    try {
      const client = getDefaultClient();
      const response = await client.callTool("recall_context", {
        query: options.query,
        type_filter: options.type,
        file_filter: options.file,
        since: options.since,
        limit: options.limit || 10,
      });

      if (!response.success) {
        const errorMsg = typeof response.error === 'string' 
          ? response.error 
          : (typeof response.error === 'object' && response.error !== null && 'message' in response.error)
            ? String((response.error as { message: unknown }).message)
            : "Failed to search memory";
        throw new MCPConnectionError(
          errorMsg,
          "mcp://recall_context"
        );
      }

      const data = response.data as { results?: MemoryItem[]; total?: number } | undefined;
      return {
        success: true,
        results: data?.results || [],
        total: data?.total || data?.results?.length || 0,
        query: options.query,
      };
    } catch (error) {
      if (error instanceof MCPConnectionError) {
        throw error;
      }
      throw new InternalError(
        "Failed to search memory",
        { query: options.query, type: options.type },
        error instanceof Error ? error : undefined
      );
    }
  }

  private async recallById(id: string): Promise<RecallResult> {
    try {
      const client = getDefaultClient();
      const response = await client.callTool("get_memory_by_id", {
        memory_id: id,
        project_path: process.cwd(),
      });

      if (!response.success) {
        const errorMsg = typeof response.error === 'string'
          ? response.error
          : (typeof response.error === 'object' && response.error !== null && 'message' in response.error)
            ? String((response.error as { message: unknown }).message)
            : `Memory ${id} not found`;
        throw new MCPConnectionError(
          errorMsg,
          "mcp://get_memory_by_id"
        );
      }

      return {
        success: true,
        memory: response.data as MemoryItem,
      };
    } catch (error) {
      if (error instanceof MCPConnectionError) {
        throw error;
      }
      throw new InternalError(
        `Failed to retrieve memory ${id}`,
        { memoryId: id },
        error instanceof Error ? error : undefined
      );
    }
  }
}

// Legacy export for backward compatibility
export async function handleRecallCommand(
  query: string,
  options: RecallOptions = {}
): Promise<void> {
  const command = new RecallCommand();

  try {
    if (!options.quiet) {
      console.log(options.id ? `⏳ Retrieving memory ${options.id}...` : "⏳ Searching JARVIS memory...");
    }

    // Merge query and options
    const allArgs = [
      ...(query ? query.split(" ") : []),
      ...(options.type ? ["--type", options.type] : []),
      ...(options.file ? ["--file", options.file] : []),
      ...(options.since ? ["--since", options.since] : []),
      ...(options.limit ? ["--limit", options.limit.toString()] : []),
      ...(options.id ? ["--id", options.id] : []),
      ...(options.verbose ? ["--verbose"] : []),
      ...(options.quiet ? ["--quiet"] : []),
      ...(options.json ? ["--json"] : []),
    ];

    const result = await command.run(allArgs);

    displayRecallResult(result, options);
  } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : "Unknown error"}`);
    process.exit(1);
  }
}

function displayRecallResult(result: RecallResult, options: RecallOptions): void {
  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  // Display single memory (drill-down)
  if (result.memory) {
    displaySingleMemory(result.memory);
    return;
  }

  // Display search results
  if (!result.results || result.results.length === 0) {
    console.log("ℹ️  No memories found matching your query");
    console.log("   Try broader search terms or check available memories with 'jarvis status'");
    return;
  }

  console.log(`✓ Found ${result.results.length} ${result.results.length === 1 ? "memory" : "memories"}`);
  console.log();
  displayResultsTable(result.results, options);
  console.log();

  if (!options.quiet) {
    console.log("💡 Use --verbose for details or --id <memory_id> to view full content");
  }
}

function displayResultsTable(results: MemoryItem[], options: RecallOptions): void {
  const maxContentLength = options.verbose ? 60 : 80;

  console.log("─".repeat(120));
  console.log("  ID      | Content                                                  | Relevance | Date");
  console.log("─".repeat(120));

  results.forEach((item) => {
    const id = item.id.substring(0, 6);
    const content = truncateText(item.content || "", maxContentLength);
    const relevance = item.relevance_score
      ? `${(item.relevance_score * 100).toFixed(0)}%`
      : "N/A";
    const date = item.timestamp
      ? new Date(item.timestamp).toLocaleDateString()
      : "Unknown";

    console.log(`  ${id.padEnd(6)} | ${content.padEnd(maxContentLength)} | ${relevance.padEnd(9)} | ${date}`);

    if (options.verbose) {
      if (item.type) console.log(`         Type: ${item.type}`);
      if (item.file_path) console.log(`         File: ${item.file_path}`);
      if (item.tags && item.tags.length > 0) console.log(`         Tags: ${item.tags.join(", ")}`);
      console.log();
    }
  });

  console.log("─".repeat(120));
}

function displaySingleMemory(memory: MemoryItem): void {
  console.log();
  console.log("═".repeat(80));
  console.log(`  Memory ID: ${memory.id}`);
  console.log("═".repeat(80));
  console.log();
  console.log(`📝 ${memory.content}`);
  console.log();

  if (memory.type) console.log(`   Type: ${memory.type}`);
  if (memory.timestamp) console.log(`   Date: ${new Date(memory.timestamp).toLocaleString()}`);
  if (memory.file_path) console.log(`   File: ${memory.file_path}`);
  if (memory.tags && memory.tags.length > 0) console.log(`   Tags: ${memory.tags.join(", ")}`);
  if (memory.metadata) console.log(`   Metadata: ${JSON.stringify(memory.metadata, null, 2)}`);

  console.log();
  console.log("═".repeat(80));
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.substring(0, maxLength - 3) + "...";
}

// Keep legacy parseRecallArgs for tests
export function parseRecallArgs(args: string[]): {
  query: string;
  options: RecallOptions;
} {
  const command = new RecallCommand();
  const parsed = command.parse(args);
  return { query: parsed.query || "", options: parsed };
}
