/**
 * Init Command - Initialize JARVIS memory system in a project
 * Refactored to use Command Pattern
 */

import { existsSync, mkdirSync, writeFileSync, readFileSync } from "fs";
import { resolve, basename } from "path";
import { execSync } from "child_process";
import { createHash } from "crypto";
import { BaseCommand } from "./base/command";
import type { InitOptions, InitResult } from "./base/types";
import { DEFAULT_CONFIG } from "../config/config";
import {
  FileSystemError,
  ConfigurationError,
  InternalError,
} from "../core/errors";
import type { IOutputFormatter } from "../utils/output.js";
import type { Logger } from "../utils/logger.js";
import type { ErrorHandler } from "../core/errors/handler.js";

export class InitCommand extends BaseCommand<InitOptions, InitResult> {
  constructor(
    formatter: IOutputFormatter,
    logger: Logger,
    errorHandler: ErrorHandler
  ) {
    super(formatter, logger, errorHandler);
  }

  parse(args: string[]): InitOptions {
    const options: InitOptions = {};

    for (const arg of args) {
      if (arg === "--force" || arg === "-f") {
        options.force = true;
      } else if (arg === "--verbose" || arg === "-v") {
        options.verbose = true;
      } else if (arg === "--quiet" || arg === "-q") {
        options.quiet = true;
      }
    }

    return options;
  }

  validate(options: InitOptions): void {
    const projectRoot = this.detectProjectRoot();
    const jarvisDir = resolve(projectRoot, ".jarvis");

    // Check if already initialized without --force
    if (existsSync(jarvisDir) && !options.force) {
      throw new ConfigurationError(
        ".jarvis directory already exists. Use --force to reinitialize",
        "initialized",
        true
      );
    }
  }

  async execute(options: InitOptions): Promise<InitResult> {
    try {
      const projectRoot = this.detectProjectRoot();
      const jarvisDir = resolve(projectRoot, ".jarvis");
      const projectName = basename(projectRoot);
      const projectId = this.generateProjectId(projectRoot);
      const isGitRepo = this.checkGitRepository(projectRoot);

      // Create directory structure
      this.createDirectoryStructure(jarvisDir);

      // Create config file
      this.createConfigFile(jarvisDir);

      // Initialize databases
      this.initializeDatabases(jarvisDir, projectId);

      // Create project context
      this.createProjectContext(jarvisDir, projectId, projectName, projectRoot);

      // Install git hooks if in git repo
      let hooksInstalled = false;
      if (isGitRepo) {
        hooksInstalled = this.installGitHooks(projectRoot, options);
      }

      return {
        success: true,
        projectRoot,
        projectName,
        projectId,
        isGitRepo,
        hooksInstalled,
      };
    } catch (error) {
      if (
        error instanceof FileSystemError ||
        error instanceof ConfigurationError
      ) {
        throw error;
      }
      throw new InternalError(
        "Failed to initialize JARVIS",
        {},
        error instanceof Error ? error : undefined
      );
    }
  }

  private detectProjectRoot(): string {
    const currentDir = process.cwd();
    const indicators = [
      "package.json",
      "pyproject.toml",
      "Cargo.toml",
      "go.mod",
      "pom.xml",
      "build.gradle",
      ".git",
    ];

    for (const indicator of indicators) {
      if (existsSync(resolve(currentDir, indicator))) {
        return currentDir;
      }
    }

    return currentDir;
  }

  private checkGitRepository(projectRoot: string): boolean {
    try {
      execSync("git rev-parse --git-dir", {
        cwd: projectRoot,
        stdio: "ignore",
      });
      return true;
    } catch {
      return false;
    }
  }

  private createDirectoryStructure(jarvisDir: string): void {
    try {
      if (!existsSync(jarvisDir)) {
        mkdirSync(jarvisDir, { recursive: true });
      }

      const subdirs = ["db", "snapshots"];
      for (const subdir of subdirs) {
        const path = resolve(jarvisDir, subdir);
        if (!existsSync(path)) {
          mkdirSync(path, { recursive: true });
        }
      }
    } catch (error) {
      throw new FileSystemError(
        "Failed to create directory structure",
        jarvisDir,
        "create",
        error instanceof Error ? error : undefined
      );
    }
  }

  private createConfigFile(jarvisDir: string): void {
    const configPath = resolve(jarvisDir, "config.json");

    try {
      if (!existsSync(configPath)) {
        const config = {
          ...DEFAULT_CONFIG,
          initialized_at: new Date().toISOString(),
        };
        writeFileSync(configPath, JSON.stringify(config, null, 2), "utf-8");
      }
    } catch (error) {
      throw new FileSystemError(
        "Failed to create config file",
        configPath,
        "write",
        error instanceof Error ? error : undefined
      );
    }
  }

  private generateProjectId(projectRoot: string): string {
    const absolutePath = resolve(projectRoot);
    return createHash("sha256").update(absolutePath).digest("hex");
  }

  private initializeDatabases(jarvisDir: string, _projectId: string): void {
    const chromaPath = resolve(jarvisDir, "db", "chroma");

    try {
      if (!existsSync(chromaPath)) {
        mkdirSync(chromaPath, { recursive: true });
      }
    } catch (error) {
      throw new FileSystemError(
        "Failed to initialize databases",
        chromaPath,
        "create",
        error instanceof Error ? error : undefined
      );
    }
  }

  private createProjectContext(
    jarvisDir: string,
    projectId: string,
    projectName: string,
    projectRoot: string
  ): void {
    const contextPath = resolve(jarvisDir, "project_context.json");

    try {
      const context = {
        id: projectId,
        name: projectName,
        root_path: projectRoot,
        tech_stack: [],
        dependencies: {},
        file_structure_map: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      writeFileSync(contextPath, JSON.stringify(context, null, 2), "utf-8");
    } catch (error) {
      throw new FileSystemError(
        "Failed to create project context",
        contextPath,
        "write",
        error instanceof Error ? error : undefined
      );
    }
  }

  private installGitHooks(
    projectRoot: string,
    options: InitOptions
  ): boolean {
    const gitHooksDir = resolve(projectRoot, ".git", "hooks");
    const postCommitHook = resolve(gitHooksDir, "post-commit");

    const hookScript = `#!/bin/bash
# JARVIS Post-Commit Hook
# Captures commit information and triggers JARVIS memory storage

# Get project root
PROJECT_ROOT="$(git rev-parse --show-toplevel)"
JARVIS_DIR="$PROJECT_ROOT/.jarvis"

# Skip if JARVIS not initialized
if [ ! -d "$JARVIS_DIR" ]; then
    exit 0
fi

# Call JARVIS internal command to capture commit (run in background to avoid blocking)
cd "$PROJECT_ROOT"
jarvis _internal_on_commit > /dev/null 2>&1 &

exit 0
`;

    try {
      // Check if hook already exists
      if (existsSync(postCommitHook) && !options.force) {
        const existingContent = readFileSync(postCommitHook, "utf-8");
        if (existingContent.includes("JARVIS")) {
          return true; // Already installed
        }
        return false; // Existing non-JARVIS hook
      }

      writeFileSync(postCommitHook, hookScript, { mode: 0o755 });
      return true;
    } catch (error) {
      // Non-fatal - return false but don't throw
      if (options.verbose) {
        console.warn("Could not install git hooks:", error);
      }
      return false;
    }
  }
}

// Legacy export for backward compatibility
export async function handleInitCommand(
  options: InitOptions
): Promise<void> {
  try {
    const { OutputFormatter } = require("../utils/output");
    const { createLogger, LogLevel } = require("../utils/logger");
    const { createErrorHandler } = require("../core/errors/handler");
    
    const formatter = new OutputFormatter();
    const logger = createLogger({ level: LogLevel.ERROR });
    const errorHandler = createErrorHandler(formatter, logger);
    
    const command = new InitCommand(formatter, logger, errorHandler);

    if (!options.quiet) {
      console.log("⏳ Initializing JARVIS memory system...");
    }

    const result = await command.run([
      ...(options.force ? ["--force"] : []),
      ...(options.verbose ? ["--verbose"] : []),
      ...(options.quiet ? ["--quiet"] : []),
    ]);

    displayInitResult(result, options);
  } catch (error) {
    console.error(
      `Error: ${error instanceof Error ? error.message : "Unknown error"}`
    );
    process.exit(1);
  }
}

function displayInitResult(result: InitResult, options: InitOptions): void {
  console.log("✓ JARVIS memory system initialized, Sir.");

  if (!result.isGitRepo) {
    console.log("⚠️  Not a git repository - auto-capture features will be limited");
    console.log('   Run "git init" to enable full auto-capture capabilities');
  }

  if (options.verbose) {
    console.log("\nProject details:");
    console.log(`  • Name: ${result.projectName}`);
    console.log(`  • Root: ${result.projectRoot}`);
    console.log(`  • ID: ${result.projectId.substring(0, 16)}...`);
    console.log(`  • Git: ${result.isGitRepo ? "Yes" : "No"}`);
    console.log(`  • Hooks: ${result.hooksInstalled ? "Installed" : "Not installed"}`);
  }

  if (!options.quiet) {
    console.log('\nℹ️  Run "jarvis status" to view memory system status');
  }
}

// Keep legacy parseInitArgs for tests
export function parseInitArgs(args: string[]): InitOptions {
  const { OutputFormatter } = require("../utils/output");
  const { createLogger, LogLevel } = require("../utils/logger");
  const { createErrorHandler } = require("../core/errors/handler");
  
  const formatter = new OutputFormatter();
  const logger = createLogger({ level: LogLevel.ERROR });
  const errorHandler = createErrorHandler(formatter, logger);
  
  const command = new InitCommand(formatter, logger, errorHandler);
  return command.parse(args);
}
