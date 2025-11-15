/**
 * Status Command - Show JARVIS system status
 * Refactored to use Command Pattern
 */

import { existsSync, statSync } from "fs";
import { resolve } from "path";
import { BaseCommand } from "./base/command";
import type {
  StatusOptions,
  StatusResult,
  DatabaseStatus,
  ConfigStatus,
  ProjectInfo,
  MemoryStats,
} from "./base/types";
import { getDefaultClient } from "../api/mcp-client";
import { NotInitializedError } from "../core/errors";
import type { IOutputFormatter } from "../utils/output.js";
import type { Logger } from "../utils/logger.js";
import type { ErrorHandler } from "../core/errors/handler.js";

export class StatusCommand extends BaseCommand<StatusOptions, StatusResult> {
  constructor(
    formatter: IOutputFormatter,
    logger: Logger,
    errorHandler: ErrorHandler
  ) {
    super(formatter, logger, errorHandler);
  }

  parse(args: string[]): StatusOptions {
    const options: StatusOptions = {};

    for (const arg of args) {
      if (arg === "--verbose" || arg === "-v") {
        options.verbose = true;
      } else if (arg === "--json") {
        options.json = true;
      }
    }

    return options;
  }

  validate(_options: StatusOptions): void {
    const jarvisDir = resolve(process.cwd(), ".jarvis");

    if (!existsSync(jarvisDir)) {
      throw new NotInitializedError(process.cwd());
    }
  }

  async execute(options: StatusOptions): Promise<StatusResult> {
    const jarvisDir = resolve(process.cwd(), ".jarvis");

    const result: StatusResult = {
      initialized: true,
      directory: jarvisDir,
      databases: this.checkDatabases(jarvisDir),
      config: this.checkConfig(jarvisDir),
      project: this.checkProject(jarvisDir),
      memory: null,
    };

    // Get memory stats from MCP server
    try {
      const client = getDefaultClient();
      const memoryStats = await client.callTool("get_memory_status", {
        project_path: process.cwd(),
      });

      if (memoryStats.success && memoryStats.data) {
        result.memory = memoryStats.data as MemoryStats;
      }
    } catch (error) {
      // MCP server might not be running, continue with basic stats
      if (options.verbose) {
        console.warn("Could not fetch memory stats from MCP server");
      }
    }

    return result;
  }

  private checkDatabases(jarvisDir: string): DatabaseStatus {
    const sqlitePath = resolve(jarvisDir, "db", "memory.db");
    const chromaPath = resolve(jarvisDir, "db", "chroma");

    const result: DatabaseStatus = {
      sqlite: existsSync(sqlitePath),
      sqliteSize: "",
      chroma: existsSync(chromaPath),
    };

    if (result.sqlite) {
      const size = statSync(sqlitePath).size;
      result.sqliteSize = this.formatBytes(size);
    }

    return result;
  }

  private checkConfig(jarvisDir: string): ConfigStatus {
    const configPath = resolve(jarvisDir, "config.json");
    const exists = existsSync(configPath);

    let settings = null;
    if (exists) {
      try {
        settings = require(configPath);
      } catch {
        // Ignore parse errors
      }
    }

    return { exists, settings };
  }

  private checkProject(jarvisDir: string): ProjectInfo {
    const contextPath = resolve(jarvisDir, "project_context.json");

    if (existsSync(contextPath)) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const context = require(contextPath);
        return {
          name: context.name || context.project_name || null,
          techStack: context.tech_stack || [],
        };
      } catch {
        return { name: null, techStack: [] };
      }
    }

    return { name: null, techStack: [] };
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }
}

// Legacy export for backward compatibility
export async function handleStatusCommand(
  options: StatusOptions
): Promise<void> {
  try {
    const { OutputFormatter } = require("../utils/output");
    const { createLogger, LogLevel } = require("../utils/logger");
    const { createErrorHandler } = require("../core/errors/handler");
    
    const formatter = new OutputFormatter();
    const logger = createLogger({ level: LogLevel.ERROR });
    const errorHandler = createErrorHandler(formatter, logger);
    
    const command = new StatusCommand(formatter, logger, errorHandler);
    
    const result = await command.run([
      ...(options.verbose ? ["--verbose"] : []),
      ...(options.json ? ["--json"] : []),
    ]);

    // Display output (keeping original format)
    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    displayStatus(result, options);
  } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : "Unknown error"}`);
    process.exit(1);
  }
}

function displayStatus(stats: StatusResult, options: StatusOptions): void {
  console.log("\n📊 JARVIS Status\n");

  // Project info
  if (stats.project.name) {
    console.log(`Project: ${stats.project.name}`);
  }
  console.log(`Location: ${process.cwd()}`);
  console.log();

  // Databases
  console.log("💾 Databases:");
  console.log(
    `  SQLite: ${stats.databases.sqlite ? "✓" : "✗"} ${stats.databases.sqliteSize || ""}`
  );
  console.log(`  ChromaDB: ${stats.databases.chroma ? "✓" : "✗"}`);
  console.log();

  // Memory stats
  if (stats.memory) {
    console.log("📝 Memory:");
    console.log(`  Total entries: ${stats.memory.total_entries || 0}`);
    if (options.verbose) {
      console.log(`  Decisions: ${stats.memory.decisions || 0}`);
      console.log(`  Notes: ${stats.memory.notes || 0}`);
      if (stats.memory.last_activity) {
        const lastDate = new Date(stats.memory.last_activity).toLocaleString();
        console.log(`  Last activity: ${lastDate}`);
      }
      console.log(`  Disk usage: ${stats.memory.disk_usage_mb || 0} MB`);

      if (stats.memory.collections) {
        const collections = Object.entries(stats.memory.collections);
        if (collections.length > 0) {
          console.log(`  Collections:`);
          collections.forEach(([name, count]) => {
            console.log(`    - ${name}: ${count}`);
          });
        }
      }
    }
    console.log();
  }

  // Config
  console.log("⚙️  Configuration:");
  console.log(`  Config file: ${stats.config.exists ? "✓" : "✗"}`);
  if (stats.config.settings && options.verbose) {
    console.log(`  Persona: ${stats.config.settings.persona || "default"}`);
    console.log(`  Language: ${stats.config.settings.language || "en"}`);
  }
  console.log();

  console.log("✓ System operational");
}

// Keep legacy parseStatusArgs for tests
export function parseStatusArgs(args: string[]): StatusOptions {
  const { OutputFormatter } = require("../utils/output");
  const { createLogger, LogLevel } = require("../utils/logger");
  const { createErrorHandler } = require("../core/errors/handler");
  
  const formatter = new OutputFormatter();
  const logger = createLogger({ level: LogLevel.ERROR });
  const errorHandler = createErrorHandler(formatter, logger);
  
  const command = new StatusCommand(formatter, logger, errorHandler);
  return command.parse(args);
}
