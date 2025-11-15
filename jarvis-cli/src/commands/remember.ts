/**
 * Remember Command - Store information to JARVIS memory
 * Refactored to use Command Pattern
 */

import { readFileSync } from "fs";
import { BaseCommand } from "./base/command";
import type { RememberOptions, RememberResult } from "./base/types";
import { getDefaultClient } from "../api/mcp-client";
import {
  ValidationError,
  MCPConnectionError,
  InternalError,
} from "../core/errors";

export class RememberCommand extends BaseCommand<
  RememberOptions,
  RememberResult
> {
  parse(args: string[]): RememberOptions {
    const options: RememberOptions = {};
    const contentArgs: string[] = [];

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];

      if (arg === "--type" || arg === "-t") {
        options.type = args[++i];
      } else if (arg === "--tags") {
        const tagsStr = args[++i];
        options.tags = tagsStr.split(",").map((t) => t.trim());
      } else if (arg === "--file" || arg === "-f") {
        options.file = args[++i];
      } else if (arg === "--verbose" || arg === "-v") {
        options.verbose = true;
      } else if (arg === "--quiet" || arg === "-q") {
        options.quiet = true;
      } else if (arg === "--json") {
        options.json = true;
      } else if (!arg.startsWith("-")) {
        contentArgs.push(arg);
      }
    }

    // Get content from args or stdin
    if (contentArgs.length > 0) {
      options.content = contentArgs.join(" ");
    } else {
      // Try to read from stdin
      try {
        const stdin = readFileSync(0, "utf-8").trim();
        if (stdin) {
          options.content = stdin;
        }
      } catch {
        // No stdin available
      }
    }

    return options;
  }

  validate(options: RememberOptions): void {
    // Content is required
    if (!options.content || options.content.trim().length === 0) {
      throw new ValidationError(
        'Content cannot be empty. Use: jarvis remember "content" or pipe via stdin',
        "content",
        options.content
      );
    }

    // Validate content length (1-10,000 chars as per spec)
    if (options.content.length > 10000) {
      throw new ValidationError(
        `Content too long (${options.content.length} chars). Maximum 10,000 characters allowed`,
        "content",
        options.content.length
      );
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

    // Validate tags if provided
    if (options.tags && options.tags.length > 10) {
      throw new ValidationError(
        `Too many tags (${options.tags.length}). Maximum 10 tags allowed`,
        "tags",
        options.tags.length
      );
    }
  }

  async execute(options: RememberOptions): Promise<RememberResult> {
    try {
      const client = getDefaultClient();
      const response = await client.callTool("remember_context", {
        content: options.content,
        type: options.type || "decision",
        tags: options.tags || [],
        file_path: options.file,
      });

      if (!response.success) {
        const errorMsg = typeof response.error === 'string'
          ? response.error
          : (response.error as any)?.message || "Failed to store memory";
        throw new MCPConnectionError(
          errorMsg,
          "mcp://remember_context"
        );
      }

      const data = response.data as any;
      return {
        success: true,
        memory_id: data.memory_id || data.id,
        type: data.type || options.type || "decision",
        timestamp: data.timestamp,
      };
    } catch (error) {
      if (error instanceof MCPConnectionError) {
        throw error;
      }
      throw new InternalError(
        "Failed to store memory",
        { type: options.type, contentLength: options.content?.length },
        error instanceof Error ? error : undefined
      );
    }
  }
}

// Legacy export for backward compatibility
export async function handleRememberCommand(
  args: string[],
  options: RememberOptions = {}
): Promise<void> {
  const command = new RememberCommand();

  try {
    if (!options.quiet) {
      console.log("⏳ Storing to JARVIS memory...");
    }

    // Merge args and options
    const allArgs = [
      ...args,
      ...(options.type ? ["--type", options.type] : []),
      ...(options.tags ? ["--tags", options.tags.join(",")] : []),
      ...(options.file ? ["--file", options.file] : []),
      ...(options.verbose ? ["--verbose"] : []),
      ...(options.quiet ? ["--quiet"] : []),
      ...(options.json ? ["--json"] : []),
    ];

    const result = await command.run(allArgs);

    displayRememberResult(result, options);
  } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : "Unknown error"}`);
    process.exit(1);
  }
}

function displayRememberResult(
  result: RememberResult,
  options: RememberOptions
): void {
  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log("✓ Memory stored, Sir.");
  
  if (options.verbose) {
    console.log(`  ID: ${result.memory_id.substring(0, 16)}...`);
    console.log(`  Type: ${result.type}`);
    if (result.timestamp) {
      console.log(`  Time: ${new Date(result.timestamp).toLocaleString()}`);
    }
  }
}

// Keep legacy parseRememberArgs for tests
export function parseRememberArgs(args: string[]): {
  contentArgs: string[];
  options: RememberOptions;
} {
  const command = new RememberCommand();
  const parsed = command.parse(args);
  
  // Extract content args (non-flag arguments)
  const contentArgs: string[] = [];
  for (const arg of args) {
    if (!arg.startsWith("-") && !["--type", "--tags", "--file"].some(flag => args[args.indexOf(arg) - 1]?.includes(flag.replace("--", "")))) {
      contentArgs.push(arg);
    }
  }

  return { contentArgs, options: parsed };
}
